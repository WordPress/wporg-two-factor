<?php

/**
 * Account Recovery for WordPress.org Two-Factor Authentication.
 *
 * Provides designated-contact-based recovery for users locked out of their 2FA devices.
 * Users designate one or more "Backup Buddies" who can verify their identity out-of-band
 * and confirm a recovery request.
 */

namespace WordPressdotorg\Two_Factor\Recovery;
use Two_Factor_Core;
use WP_User, WP_Error;

defined( 'WPINC' ) || die();

require_once __DIR__ . '/notifications.php';
require_once __DIR__ . '/rest-api.php';

const RECOVERY_CONTACTS_META          = '_wporg_2fa_recovery_contacts';
const RECOVERY_CONTACTS_PENDING_META  = '_wporg_2fa_recovery_contacts_pending';
const RECOVERY_REQUEST_META           = '_wporg_2fa_recovery_request';
const DESIGNATED_FOR_META             = '_wporg_2fa_designated_for';

// A recovery request is valid for 7 days after creation. After that the token
// stops working and the user must initiate a new request.
const RECOVERY_REQUEST_TTL = 7 * DAY_IN_SECONDS;

// A pending designation invite is valid for 30 days. After that the contact's
// accept/decline link stops working and the requesting user must re-designate.
const DESIGNATION_TTL = 30 * DAY_IN_SECONDS;

// Auto-invalidate pending recovery when user authenticates with 2FA.
add_action( 'two_factor_user_authenticated', __NAMESPACE__ . '\invalidate_recovery_on_login' );

// Route the email-link actions used by the recovery notification emails.
add_action( 'init', __NAMESPACE__ . '\handle_email_link_action' );

/**
 * Dispatch the `?action=wporg-2fa-*` URLs that the notification emails point at.
 *
 * Contact-side actions (accept/decline/confirm) require a logged-in contact and are
 * forwarded to the settings UI with the relevant params. Owner-side actions
 * (cancel/compromised/complete) are processed inline -- the locked-out user cannot
 * log in -- and a result page is rendered via wp_die().
 */
function handle_email_link_action() : void {
	if ( empty( $_GET['action'] ) || 0 !== strpos( sanitize_key( $_GET['action'] ), 'wporg-2fa-' ) ) {
		return;
	}

	$action     = sanitize_key( $_GET['action'] );
	$user_id    = isset( $_GET['user_id'] ) ? absint( $_GET['user_id'] ) : 0;
	$token      = isset( $_GET['token'] ) ? wp_unslash( $_GET['token'] ) : '';
	$contact_id = isset( $_GET['contact_id'] ) ? absint( $_GET['contact_id'] ) : 0;

	if ( ! $user_id || ! $token ) {
		return;
	}

	switch ( $action ) {
		case 'wporg-2fa-accept-designation':
		case 'wporg-2fa-decline-designation':
		case 'wporg-2fa-confirm-contact-recovery':
			$current = wp_get_current_user();
			if ( ! $current->ID ) {
				auth_redirect();
				exit;
			}
			$screen = 'wporg-2fa-confirm-contact-recovery' === $action ? 'recovery' : 'contact-approval';
			$url    = add_query_arg(
				[
					'screen'     => $screen,
					'user_id'    => $user_id,
					'token'      => rawurlencode( $token ),
					'contact_id' => $contact_id,
					'action'     => $action,
				],
				\WordPressdotorg\Two_Factor\get_edit_account_url( $current )
			);
			wp_safe_redirect( $url );
			exit;

		case 'wporg-2fa-recovery-cancel':
			$result = cancel_recovery_request( $user_id, $token );
			_render_recovery_action_result( $result, 'Your pending recovery request has been cancelled. No changes were made to your account.' );
			exit;

		case 'wporg-2fa-recovery-compromised':
			$result = cancel_recovery_compromised( $user_id, $token );
			_render_recovery_action_result( $result, 'Your pending recovery has been cancelled, your password has been reset, and all sessions have been terminated. Please use the "Lost your password?" link to log back in.' );
			exit;

		case 'wporg-2fa-recovery-complete':
			$result = complete_recovery( $user_id, $token );
			_render_recovery_action_result( $result, 'Recovery complete. Two-factor authentication has been disabled on your account; you can now log in with just your password.' );
			exit;
	}
}

/**
 * Render a server-side result page for the owner-side email actions.
 *
 * @param true|WP_Error $result  The action's return value.
 * @param string        $success Success message to display.
 */
function _render_recovery_action_result( $result, string $success ) : void {
	if ( is_wp_error( $result ) ) {
		wp_die(
			esc_html( $result->get_error_message() ),
			'WordPress.org Account Recovery',
			[ 'response' => 400, 'back_link' => true ]
		);
	}

	wp_die(
		esc_html( $success ),
		'WordPress.org Account Recovery',
		[ 'response' => 200, 'back_link' => false ]
	);
}

/**
 * Check if recovery is available for a given user.
 *
 * Super admins and special users (core committers etc) have no automated recovery --
 * those accounts are managed out-of-band. Everyone else can use designated contacts.
 *
 * @param WP_User $user The user to check.
 * @return bool Whether the user can use recovery contacts.
 */
function is_recovery_available( WP_User $user ) : bool {
	$is_special = function_exists( 'is_special_user' ) && is_special_user( $user->ID );

	// Super admins and special users: no automated recovery (out-of-band management only).
	if ( $is_special || is_super_admin( $user->ID ) ) {
		return false;
	}

	return true;
}

/**
 * Get all designated recovery contacts for a user.
 *
 * @param int $user_id The user ID.
 * @return WP_User[] Array of contact users.
 */
function get_designated_contacts( int $user_id ) : array {
	$contact_ids = get_user_meta( $user_id, RECOVERY_CONTACTS_META, true );

	if ( ! is_array( $contact_ids ) || empty( $contact_ids ) ) {
		return [];
	}

	$contacts = [];
	foreach ( $contact_ids as $contact_id ) {
		$contact = get_userdata( (int) $contact_id );
		if ( $contact instanceof WP_User ) {
			$contacts[] = $contact;
		}
	}

	return $contacts;
}

/**
 * Get all pending contact designation requests for a user.
 *
 * @param int $user_id The user ID requesting the contacts.
 * @return array Array of pending request data.
 */
function get_pending_contact_designations( int $user_id ) : array {
	$pending = get_user_meta( $user_id, RECOVERY_CONTACTS_PENDING_META, true );

	return is_array( $pending ) ? $pending : [];
}

/**
 * Designate a recovery contact for a user. Sends an approval request to the contact.
 * Adds to the existing list of contacts/pending rather than replacing.
 *
 * @param int    $user_id       The user requesting the contact.
 * @param string $contact_login The login/slug of the desired contact.
 * @return true|WP_Error
 */
function designate_contact( int $user_id, string $contact_login ) {
	$contact = get_user_by( 'login', $contact_login );

	if ( ! $contact ) {
		return new WP_Error( 'invalid_contact', 'The specified user does not exist.' );
	}

	if ( $contact->ID === $user_id ) {
		return new WP_Error( 'self_designation', 'You cannot designate yourself as a recovery contact.' );
	}

	$user = get_userdata( $user_id );

	if ( ! is_recovery_available( $user ) ) {
		return new WP_Error( 'method_not_allowed', 'Recovery contacts are not available for your account.' );
	}

	// Check if this contact is already confirmed.
	$existing_ids = get_user_meta( $user_id, RECOVERY_CONTACTS_META, true );
	if ( is_array( $existing_ids ) && in_array( $contact->ID, $existing_ids, true ) ) {
		return new WP_Error( 'already_designated', 'This user is already a designated recovery contact.' );
	}

	// Check if there is already a non-expired pending request for this contact.
	// TODO: After ~7 days, surface a "resend invite" path here instead of blocking;
	// the contact may have lost the original email but the designation is still valid.
	$pending_list = get_pending_contact_designations( $user_id );
	foreach ( $pending_list as $pending ) {
		if ( (int) $pending['contact_id'] === $contact->ID && ! is_designation_expired( $pending ) ) {
			return new WP_Error( 'already_pending', 'A designation request is already pending for this user.' );
		}
	}

	$token = wp_generate_password( 32, false );

	$pending_list[] = [
		'contact_id'   => $contact->ID,
		'token'        => wp_hash_password( $token ),
		'requested_at' => time(),
	];

	update_user_meta( $user_id, RECOVERY_CONTACTS_PENDING_META, $pending_list );

	send_contact_designation_request( $contact->ID, $user_id, $token );

	return true;
}

/**
 * Accept a contact designation request.
 *
 * @param int    $contact_id The contact user ID accepting.
 * @param int    $user_id    The user who requested the contact.
 * @param string $token      The designation token.
 * @return true|WP_Error
 */
function accept_designation( int $contact_id, int $user_id, string $token ) {
	$pending_list = get_pending_contact_designations( $user_id );

	if ( empty( $pending_list ) ) {
		return new WP_Error( 'no_pending', 'There is no pending contact designation request.' );
	}

	// Find the matching pending entry for this contact.
	$matched_index = null;
	foreach ( $pending_list as $index => $pending ) {
		if ( (int) $pending['contact_id'] === $contact_id && wp_check_password( $token, $pending['token'] ) ) {
			$matched_index = $index;
			break;
		}
	}

	if ( null === $matched_index ) {
		return new WP_Error( 'invalid_token', 'Invalid designation token or contact mismatch.' );
	}

	if ( is_designation_expired( $pending_list[ $matched_index ] ) ) {
		return new WP_Error( 'expired', 'This designation invitation has expired. Please ask the requesting user to send a new invite.' );
	}

	// Contact must have 2FA enabled on their own account to accept.
	if ( ! Two_Factor_Core::is_user_using_two_factor( $contact_id ) ) {
		return new WP_Error( 'contact_no_2fa', 'You must enable two-factor authentication on your account before you can be a recovery contact.' );
	}

	// Remove this entry from pending.
	array_splice( $pending_list, $matched_index, 1 );
	if ( empty( $pending_list ) ) {
		delete_user_meta( $user_id, RECOVERY_CONTACTS_PENDING_META );
	} else {
		update_user_meta( $user_id, RECOVERY_CONTACTS_PENDING_META, $pending_list );
	}

	// Add to confirmed contacts list.
	$contact_ids = get_user_meta( $user_id, RECOVERY_CONTACTS_META, true );
	if ( ! is_array( $contact_ids ) ) {
		$contact_ids = [];
	}
	if ( ! in_array( $contact_id, $contact_ids, true ) ) {
		$contact_ids[] = $contact_id;
	}
	update_user_meta( $user_id, RECOVERY_CONTACTS_META, $contact_ids );

	// Track reverse relationship on the contact's account.
	$designated_for = get_user_meta( $contact_id, DESIGNATED_FOR_META, true );
	if ( ! is_array( $designated_for ) ) {
		$designated_for = [];
	}
	if ( ! in_array( $user_id, $designated_for, true ) ) {
		$designated_for[] = $user_id;
	}
	update_user_meta( $contact_id, DESIGNATED_FOR_META, $designated_for );

	send_contact_designation_accepted( $user_id, $contact_id );

	return true;
}

/**
 * Decline a contact designation request.
 *
 * @param int    $contact_id The contact user ID declining.
 * @param int    $user_id    The user who requested the contact.
 * @param string $token      The designation token.
 * @return true|WP_Error
 */
function decline_designation( int $contact_id, int $user_id, string $token ) {
	$pending_list = get_pending_contact_designations( $user_id );

	if ( empty( $pending_list ) ) {
		return new WP_Error( 'no_pending', 'There is no pending contact designation request.' );
	}

	// Find the matching pending entry.
	$matched_index = null;
	foreach ( $pending_list as $index => $pending ) {
		if ( (int) $pending['contact_id'] === $contact_id && wp_check_password( $token, $pending['token'] ) ) {
			$matched_index = $index;
			break;
		}
	}

	if ( null === $matched_index ) {
		return new WP_Error( 'invalid_token', 'Invalid designation token or contact mismatch.' );
	}

	if ( is_designation_expired( $pending_list[ $matched_index ] ) ) {
		return new WP_Error( 'expired', 'This designation invitation has expired.' );
	}

	// Remove this entry from pending.
	array_splice( $pending_list, $matched_index, 1 );
	if ( empty( $pending_list ) ) {
		delete_user_meta( $user_id, RECOVERY_CONTACTS_PENDING_META );
	} else {
		update_user_meta( $user_id, RECOVERY_CONTACTS_PENDING_META, $pending_list );
	}

	return true;
}

/**
 * Check whether a pending designation invite has passed its TTL.
 *
 * @param array $pending The pending designation entry.
 * @return bool
 */
function is_designation_expired( array $pending ) : bool {
	$requested_at = (int) ( $pending['requested_at'] ?? 0 );

	return $requested_at > 0 && ( time() - $requested_at ) > DESIGNATION_TTL;
}

/**
 * Remove a designated contact.
 *
 * @param int      $user_id    The user whose contact to remove.
 * @param int|null $contact_id The specific contact to remove, or null to remove all.
 * @return bool
 */
function remove_contact( int $user_id, ?int $contact_id = null ) : bool {
	if ( null === $contact_id ) {
		// Remove all contacts.
		$contact_ids = get_user_meta( $user_id, RECOVERY_CONTACTS_META, true );
		if ( is_array( $contact_ids ) ) {
			foreach ( $contact_ids as $cid ) {
				_remove_designated_for_entry( (int) $cid, $user_id );
			}
		}
		delete_user_meta( $user_id, RECOVERY_CONTACTS_META );
		delete_user_meta( $user_id, RECOVERY_CONTACTS_PENDING_META );
	} else {
		// Remove specific contact from confirmed list.
		$contact_ids = get_user_meta( $user_id, RECOVERY_CONTACTS_META, true );
		if ( is_array( $contact_ids ) ) {
			$contact_ids = array_values( array_filter( $contact_ids, function( $cid ) use ( $contact_id ) {
				return (int) $cid !== $contact_id;
			} ) );
			if ( empty( $contact_ids ) ) {
				delete_user_meta( $user_id, RECOVERY_CONTACTS_META );
			} else {
				update_user_meta( $user_id, RECOVERY_CONTACTS_META, $contact_ids );
			}
		}

		// Also remove from pending list if present.
		$pending_list = get_pending_contact_designations( $user_id );
		$pending_list = array_values( array_filter( $pending_list, function( $p ) use ( $contact_id ) {
			return (int) $p['contact_id'] !== $contact_id;
		} ) );
		if ( empty( $pending_list ) ) {
			delete_user_meta( $user_id, RECOVERY_CONTACTS_PENDING_META );
		} else {
			update_user_meta( $user_id, RECOVERY_CONTACTS_PENDING_META, $pending_list );
		}

		_remove_designated_for_entry( $contact_id, $user_id );
	}

	return true;
}

/**
 * Remove a user from a contact's designated_for list.
 *
 * @param int $contact_id The contact user ID.
 * @param int $user_id    The user to remove from the list.
 */
function _remove_designated_for_entry( int $contact_id, int $user_id ) : void {
	$designated_for = get_user_meta( $contact_id, DESIGNATED_FOR_META, true );
	if ( is_array( $designated_for ) ) {
		$designated_for = array_values( array_diff( $designated_for, [ $user_id ] ) );
		if ( empty( $designated_for ) ) {
			delete_user_meta( $contact_id, DESIGNATED_FOR_META );
		} else {
			update_user_meta( $contact_id, DESIGNATED_FOR_META, $designated_for );
		}
	}
}

/**
 * Check if a user has a pending recovery request.
 *
 * Cancelled or expired requests do not count.
 *
 * @param int $user_id The user ID.
 * @return bool
 */
function has_pending_recovery( int $user_id ) : bool {
	$request = get_pending_recovery( $user_id );

	if ( null === $request || 'cancelled' === $request['status'] ) {
		return false;
	}

	return ! is_recovery_expired( $request );
}

/**
 * Check whether a recovery request has passed its TTL.
 *
 * @param array $request The recovery request data.
 * @return bool
 */
function is_recovery_expired( array $request ) : bool {
	$requested_at = (int) ( $request['requested_at'] ?? 0 );

	return $requested_at > 0 && ( time() - $requested_at ) > RECOVERY_REQUEST_TTL;
}

/**
 * Get a user's pending recovery request.
 *
 * @param int $user_id The user ID.
 * @return array|null The recovery request data, or null.
 */
function get_pending_recovery( int $user_id ) : ?array {
	$request = get_user_meta( $user_id, RECOVERY_REQUEST_META, true );

	return is_array( $request ) ? $request : null;
}

/**
 * Create a recovery request for a locked-out user.
 *
 * @param int $user_id The user ID.
 * @return array|WP_Error The recovery request data, or error.
 */
function create_recovery_request( int $user_id ) {
	$user = get_userdata( $user_id );

	if ( ! $user ) {
		return new WP_Error( 'invalid_user', 'Invalid user.' );
	}

	if ( ! is_recovery_available( $user ) ) {
		return new WP_Error( 'no_recovery', 'No automated recovery is available for your account. Please contact the systems team.' );
	}

	$contacts = get_designated_contacts( $user_id );
	if ( empty( $contacts ) ) {
		return new WP_Error( 'no_contact', 'No designated recovery contacts have been configured for this account.' );
	}

	if ( has_pending_recovery( $user_id ) ) {
		return new WP_Error( 'already_pending', 'A recovery request is already pending for this account.' );
	}

	// Tokens are split by role so that no single party holds the power to disable 2FA:
	//   owner_token       -- held by the account owner; cancels or marks compromised.
	//   contact_tokens    -- per-contact; only confirms (does not complete).
	//   completion_token  -- minted after a contact confirms and emailed only to the
	//                        owner; the only token that completes the recovery.
	$owner_token        = wp_generate_password( 32, false );
	$contact_tokens     = [];
	$contact_tokens_raw = [];
	foreach ( $contacts as $contact ) {
		$raw                                = wp_generate_password( 32, false );
		$contact_tokens[ $contact->ID ]     = wp_hash_password( $raw );
		$contact_tokens_raw[ $contact->ID ] = $raw;
	}

	$request = [
		'owner_token'      => wp_hash_password( $owner_token ),
		'contact_tokens'   => $contact_tokens,
		'completion_token' => null,
		'requested_at'     => time(),
		'status'           => 'pending',
		'ip'               => $_SERVER['REMOTE_ADDR'] ?? '',
	];

	update_user_meta( $user_id, RECOVERY_REQUEST_META, $request );

	// Notify the account owner -- cancel/compromised links use the owner_token.
	send_recovery_requested_email( $user_id, $request, $owner_token );
	send_recovery_requested_slack( $user_id, $request );

	// Notify each designated contact -- each gets their own contact_token.
	foreach ( $contacts as $contact ) {
		send_contact_recovery_request_email( $contact->ID, $user_id, $contact_tokens_raw[ $contact->ID ] );
	}

	return array_merge(
		$request,
		[
			'owner_token_raw'    => $owner_token,
			'contact_tokens_raw' => $contact_tokens_raw,
		]
	);
}

/**
 * Cancel a pending recovery request.
 *
 * The request meta is preserved with status 'cancelled' so that any in-flight
 * tokens (e.g. a contact's confirm link) become inert rather than re-creating
 * a fresh request.
 *
 * @param int    $user_id    The user ID.
 * @param string $token      The recovery token.
 * @param bool   $send_email Whether to send the cancellation email. Compromised-path callers
 *                           suppress this so only the compromised email is sent.
 * @return true|WP_Error
 */
function cancel_recovery_request( int $user_id, string $token, bool $send_email = true ) {
	$request = get_pending_recovery( $user_id );

	if ( ! $request || 'cancelled' === $request['status'] || is_recovery_expired( $request ) ) {
		return new WP_Error( 'no_pending', 'No pending recovery request found.' );
	}

	if ( ! wp_check_password( $token, $request['owner_token'] ) ) {
		return new WP_Error( 'invalid_token', 'Invalid recovery token.' );
	}

	$request['status']       = 'cancelled';
	$request['cancelled_at'] = time();
	update_user_meta( $user_id, RECOVERY_REQUEST_META, $request );

	if ( $send_email ) {
		send_recovery_cancelled_email( $user_id );
	}

	return true;
}

/**
 * Cancel a recovery request and flag the account as having a compromised password.
 *
 * This resets the user's password and destroys all sessions, since a recovery request
 * means someone successfully authenticated with the account password.
 *
 * @param int    $user_id The user ID.
 * @param string $token   The recovery token.
 * @return true|WP_Error
 */
function cancel_recovery_compromised( int $user_id, string $token ) {
	// Suppress the cancellation email -- the compromised email below covers it.
	$result = cancel_recovery_request( $user_id, $token, false );

	if ( is_wp_error( $result ) ) {
		return $result;
	}

	// Reset the password to a random value, forcing the user to use password reset.
	// Suppress the last-password-change tracker since this is a system reset, not a user action.
	add_filter( 'wporg_record_last_password_change', '__return_false' );
	wp_set_password( wp_generate_password( 32, true, true ), $user_id );
	remove_filter( 'wporg_record_last_password_change', '__return_false' );

	// Destroy all sessions for this user.
	$sessions = \WP_Session_Tokens::get_instance( $user_id );
	$sessions->destroy_all();

	send_password_compromised_email( $user_id );

	return true;
}

/**
 * Confirm a recovery request (any designated contact confirms the request is legitimate).
 *
 * On success, mints a fresh completion_token, emails it to the account owner, and
 * also returns it to the caller so internal flows / tests can chain through to
 * complete_recovery without re-reading from the mailbox.
 *
 * @param int    $user_id    The locked-out user ID.
 * @param string $token      The contact's recovery token.
 * @param int    $contact_id The contact user ID confirming.
 * @return array|WP_Error    [ 'completion_token_raw' => string ] on success.
 */
function confirm_contact_recovery( int $user_id, string $token, int $contact_id ) {
	$request = get_pending_recovery( $user_id );

	if ( ! $request || 'cancelled' === $request['status'] || is_recovery_expired( $request ) ) {
		return new WP_Error( 'no_pending', 'No pending recovery request found.' );
	}

	$contact_tokens = $request['contact_tokens'] ?? [];

	// Check that this contact is one of the designated contacts AND holds the token issued to them.
	$contacts    = get_designated_contacts( $user_id );
	$contact_ids = array_map( function( $c ) { return $c->ID; }, $contacts );

	if ( ! in_array( $contact_id, $contact_ids, true ) ) {
		return new WP_Error( 'wrong_contact', 'You are not a designated recovery contact for this user.' );
	}

	if ( ! isset( $contact_tokens[ $contact_id ] ) || ! wp_check_password( $token, $contact_tokens[ $contact_id ] ) ) {
		return new WP_Error( 'invalid_token', 'Invalid recovery token.' );
	}

	// Mint a completion token. Only the account owner ever receives the raw value --
	// the contact's token cannot itself complete the recovery.
	$completion_token = wp_generate_password( 32, false );

	$request['status']           = 'confirmed_by_contact';
	$request['confirmed_by']     = $contact_id;
	$request['completion_token'] = wp_hash_password( $completion_token );
	update_user_meta( $user_id, RECOVERY_REQUEST_META, $request );

	send_contact_confirmed_recovery_email( $user_id, $completion_token );

	return [ 'completion_token_raw' => $completion_token ];
}

/**
 * Complete a recovery request, disabling 2FA for the user.
 *
 * @param int    $user_id The user ID.
 * @param string $token   The recovery token.
 * @return true|WP_Error
 */
function complete_recovery( int $user_id, string $token ) {
	$request = get_pending_recovery( $user_id );

	if ( ! $request || 'cancelled' === $request['status'] || is_recovery_expired( $request ) ) {
		return new WP_Error( 'no_pending', 'No pending recovery request found.' );
	}

	if ( 'confirmed_by_contact' !== $request['status'] ) {
		return new WP_Error( 'not_confirmed', 'The recovery request has not been confirmed by a designated contact.' );
	}

	// The completion_token is minted at confirm time and sent only to the account
	// owner. Contacts never see this value.
	if ( empty( $request['completion_token'] ) || ! wp_check_password( $token, $request['completion_token'] ) ) {
		return new WP_Error( 'invalid_token', 'Invalid recovery token.' );
	}

	// Disable all 2FA providers for this user.
	$providers = Two_Factor_Core::get_available_providers_for_user( get_userdata( $user_id ) );

	if ( ! is_wp_error( $providers ) ) {
		foreach ( array_keys( $providers ) as $provider_key ) {
			Two_Factor_Core::disable_provider_for_user( $user_id, $provider_key );
		}
	}

	// Clean up enabled providers meta.
	delete_user_meta( $user_id, Two_Factor_Core::ENABLED_PROVIDERS_USER_META_KEY );

	// Remove the recovery request.
	delete_user_meta( $user_id, RECOVERY_REQUEST_META );

	send_recovery_completed_email( $user_id );

	return true;
}

/**
 * Invalidate any pending recovery request when a user successfully authenticates with 2FA.
 *
 * @param WP_User $user The authenticated user.
 */
function invalidate_recovery_on_login( $user ) : void {
	if ( ! $user instanceof WP_User ) {
		return;
	}

	$request = get_pending_recovery( $user->ID );

	if ( $request ) {
		delete_user_meta( $user->ID, RECOVERY_REQUEST_META );
	}
}

/**
 * Check if a user has 2FA enabled but no recovery contacts configured.
 *
 * @param WP_User $user The user to check.
 * @return bool True if recovery setup should be prompted.
 */
function check_recovery_prompt_needed( WP_User $user ) : bool {
	if ( ! Two_Factor_Core::is_user_using_two_factor( $user->ID ) ) {
		return false;
	}

	if ( ! is_recovery_available( $user ) ) {
		return false;
	}

	return empty( get_designated_contacts( $user->ID ) );
}

/**
 * Get recovery status information for a user, suitable for the REST API.
 *
 * @param int $user_id The user ID.
 * @return array Recovery status data.
 */
function get_recovery_status( int $user_id ) : array {
	$user     = get_userdata( $user_id );
	$contacts = get_designated_contacts( $user_id );
	$pending  = get_pending_contact_designations( $user_id );

	$contacts_data = [];
	foreach ( $contacts as $contact ) {
		$contacts_data[] = [
			'id'           => $contact->ID,
			'login'        => $contact->user_login,
			'display_name' => $contact->display_name,
		];
	}

	$pending_contacts_data = [];
	foreach ( $pending as $p ) {
		if ( is_designation_expired( $p ) ) {
			continue;
		}
		$pending_contact = get_userdata( $p['contact_id'] );
		if ( $pending_contact ) {
			$pending_contacts_data[] = [
				'contact_id'    => $pending_contact->ID,
				'contact_login' => $pending_contact->user_login,
				'requested_at'  => $p['requested_at'],
			];
		}
	}

	$request = get_pending_recovery( $user_id );
	$request_data = null;
	if ( $request && 'cancelled' !== $request['status'] && ! is_recovery_expired( $request ) ) {
		$request_data = [
			'requested_at' => $request['requested_at'],
			'expires_at'   => (int) $request['requested_at'] + RECOVERY_REQUEST_TTL,
			'status'       => $request['status'],
		];
	}

	// Get users this person is a designated contact for.
	$designated_for_ids = get_user_meta( $user_id, DESIGNATED_FOR_META, true );
	$designated_for     = [];
	if ( is_array( $designated_for_ids ) ) {
		foreach ( $designated_for_ids as $for_user_id ) {
			$for_user = get_userdata( $for_user_id );
			if ( $for_user ) {
				$designated_for[] = [
					'id'           => $for_user->ID,
					'login'        => $for_user->user_login,
					'display_name' => $for_user->display_name,
				];
			}
		}
	}

	return [
		'recovery_available' => $user ? is_recovery_available( $user ) : false,
		'contacts'           => $contacts_data,
		'contacts_pending'   => $pending_contacts_data,
		'pending_request'    => $request_data,
		'designated_for'     => $designated_for,
		'prompt_needed'      => $user ? check_recovery_prompt_needed( $user ) : false,
	];
}
