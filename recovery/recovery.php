<?php

/**
 * Account Recovery for WordPress.org Two-Factor Authentication.
 *
 * Provides email-based and designated-contact-based recovery flows
 * for users locked out of their 2FA devices.
 */

namespace WordPressdotorg\Two_Factor\Recovery;
use Two_Factor_Core;
use WP_User, WP_Error;

defined( 'WPINC' ) || die();

require_once __DIR__ . '/notifications.php';
require_once __DIR__ . '/cron.php';
require_once __DIR__ . '/rest-api.php';

const RECOVERY_EMAIL_ENABLED_META    = '_wporg_2fa_recovery_email_enabled';
const RECOVERY_CONTACT_META          = '_wporg_2fa_recovery_contact';
const RECOVERY_CONTACT_PENDING_META  = '_wporg_2fa_recovery_contact_pending';
const RECOVERY_REQUEST_META          = '_wporg_2fa_recovery_request';
const DESIGNATED_FOR_META            = '_wporg_2fa_designated_for';

// Auto-invalidate pending recovery when user authenticates with 2FA.
add_action( 'two_factor_user_authenticated', __NAMESPACE__ . '\invalidate_recovery_on_login' );

/**
 * Get the recovery delay in seconds for a given user based on their privilege level.
 *
 * @param WP_User $user The user to check.
 * @return int Delay in seconds.
 */
function get_recovery_delay( WP_User $user ) : int {
	// High-usage plugin committers: 7 days.
	if ( $user->has_plugins && has_high_active_installs( $user ) ) {
		return 7 * DAY_IN_SECONDS;
	}

	// Plugin committers: 3 days.
	if ( $user->has_plugins ) {
		return 3 * DAY_IN_SECONDS;
	}

	// Everyone else: 24 hours.
	return DAY_IN_SECONDS;
}

/**
 * Check if a plugin committer has high active installs.
 *
 * For MVP, this checks if the user has any plugins with >= 100,000 active installs.
 * This can be refined later to use more granular data.
 *
 * @param WP_User $user The user to check.
 * @return bool
 */
function has_high_active_installs( WP_User $user ) : bool {
	/**
	 * Filter whether a user has high active installs.
	 *
	 * @param bool    $has_high_installs Whether the user has high active installs. Default false.
	 * @param WP_User $user             The user being checked.
	 */
	return (bool) apply_filters( 'wporg_2fa_user_has_high_active_installs', false, $user );
}

/**
 * Get the recovery methods allowed for a given user based on their privilege level.
 *
 * @param WP_User $user The user to check.
 * @return array Array of allowed method strings: 'email', 'contact'.
 */
function get_allowed_recovery_methods( WP_User $user ) : array {
	$is_special = function_exists( 'is_special_user' ) && is_special_user( $user->ID );

	// Super admins: no automated recovery (out-of-band management only).
	if ( $is_special && is_super_admin( $user->ID ) ) {
		return [];
	}

	// Core committers (special users who aren't super admins): contact only.
	if ( $is_special ) {
		return [ 'contact' ];
	}

	// Everyone else: both methods.
	return [ 'email', 'contact' ];
}

/**
 * Check if email recovery is enabled for a user.
 *
 * @param int $user_id The user ID.
 * @return bool
 */
function is_recovery_email_enabled( int $user_id ) : bool {
	return (bool) get_user_meta( $user_id, RECOVERY_EMAIL_ENABLED_META, true );
}

/**
 * Enable email recovery for a user.
 *
 * @param int $user_id The user ID.
 * @return bool
 */
function enable_recovery_email( int $user_id ) : bool {
	$user    = get_userdata( $user_id );
	$allowed = get_allowed_recovery_methods( $user );

	if ( ! in_array( 'email', $allowed, true ) ) {
		return false;
	}

	return (bool) update_user_meta( $user_id, RECOVERY_EMAIL_ENABLED_META, '1' );
}

/**
 * Disable email recovery for a user.
 *
 * @param int $user_id The user ID.
 * @return bool
 */
function disable_recovery_email( int $user_id ) : bool {
	return delete_user_meta( $user_id, RECOVERY_EMAIL_ENABLED_META );
}

/**
 * Get the designated recovery contact for a user.
 *
 * @param int $user_id The user ID.
 * @return WP_User|null The contact user, or null if none.
 */
function get_designated_contact( int $user_id ) : ?WP_User {
	$contact_id = get_user_meta( $user_id, RECOVERY_CONTACT_META, true );

	if ( ! $contact_id ) {
		return null;
	}

	$contact = get_userdata( (int) $contact_id );

	return $contact instanceof WP_User ? $contact : null;
}

/**
 * Get the pending contact designation request for a user.
 *
 * @param int $user_id The user ID requesting the contact.
 * @return array|null The pending request data, or null.
 */
function get_pending_contact_designation( int $user_id ) : ?array {
	$pending = get_user_meta( $user_id, RECOVERY_CONTACT_PENDING_META, true );

	return is_array( $pending ) ? $pending : null;
}

/**
 * Designate a recovery contact for a user. Sends an approval request to the contact.
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

	// Contact must have 2FA enabled.
	if ( ! Two_Factor_Core::is_user_using_two_factor( $contact->ID ) ) {
		return new WP_Error( 'contact_no_2fa', 'The designated contact must have two-factor authentication enabled.' );
	}

	$user    = get_userdata( $user_id );
	$allowed = get_allowed_recovery_methods( $user );

	if ( ! in_array( 'contact', $allowed, true ) ) {
		return new WP_Error( 'method_not_allowed', 'Contact recovery is not available for your account.' );
	}

	// Remove any existing confirmed contact and pending designation.
	remove_contact( $user_id );

	$token = wp_generate_password( 32, false );

	$pending = [
		'contact_id'   => $contact->ID,
		'token'        => wp_hash_password( $token ),
		'requested_at' => time(),
	];

	update_user_meta( $user_id, RECOVERY_CONTACT_PENDING_META, $pending );

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
	$pending = get_pending_contact_designation( $user_id );

	if ( ! $pending ) {
		return new WP_Error( 'no_pending', 'There is no pending contact designation request.' );
	}

	if ( (int) $pending['contact_id'] !== $contact_id ) {
		return new WP_Error( 'wrong_contact', 'This designation request is not for you.' );
	}

	if ( ! wp_check_password( $token, $pending['token'] ) ) {
		return new WP_Error( 'invalid_token', 'Invalid designation token.' );
	}

	// Set the confirmed contact.
	update_user_meta( $user_id, RECOVERY_CONTACT_META, $contact_id );
	delete_user_meta( $user_id, RECOVERY_CONTACT_PENDING_META );

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
	$pending = get_pending_contact_designation( $user_id );

	if ( ! $pending ) {
		return new WP_Error( 'no_pending', 'There is no pending contact designation request.' );
	}

	if ( (int) $pending['contact_id'] !== $contact_id ) {
		return new WP_Error( 'wrong_contact', 'This designation request is not for you.' );
	}

	if ( ! wp_check_password( $token, $pending['token'] ) ) {
		return new WP_Error( 'invalid_token', 'Invalid designation token.' );
	}

	delete_user_meta( $user_id, RECOVERY_CONTACT_PENDING_META );

	return true;
}

/**
 * Remove a designated contact.
 *
 * @param int $user_id The user whose contact to remove.
 * @return bool
 */
function remove_contact( int $user_id ) : bool {
	$contact_id = get_user_meta( $user_id, RECOVERY_CONTACT_META, true );

	if ( $contact_id ) {
		// Remove from the contact's designated_for list.
		$designated_for = get_user_meta( (int) $contact_id, DESIGNATED_FOR_META, true );
		if ( is_array( $designated_for ) ) {
			$designated_for = array_values( array_diff( $designated_for, [ $user_id ] ) );
			if ( empty( $designated_for ) ) {
				delete_user_meta( (int) $contact_id, DESIGNATED_FOR_META );
			} else {
				update_user_meta( (int) $contact_id, DESIGNATED_FOR_META, $designated_for );
			}
		}
	}

	delete_user_meta( $user_id, RECOVERY_CONTACT_META );
	delete_user_meta( $user_id, RECOVERY_CONTACT_PENDING_META );

	return true;
}

/**
 * Check if a user has a pending recovery request.
 *
 * @param int $user_id The user ID.
 * @return bool
 */
function has_pending_recovery( int $user_id ) : bool {
	$request = get_pending_recovery( $user_id );

	return null !== $request && 'cancelled' !== $request['status'];
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
 * @param int    $user_id The user ID.
 * @param string $type    Recovery type: 'email' or 'contact'.
 * @return array|WP_Error The recovery request data, or error.
 */
function create_recovery_request( int $user_id, string $type ) {
	$user = get_userdata( $user_id );

	if ( ! $user ) {
		return new WP_Error( 'invalid_user', 'Invalid user.' );
	}

	$allowed = get_allowed_recovery_methods( $user );

	if ( empty( $allowed ) ) {
		return new WP_Error( 'no_recovery', 'No automated recovery methods are available for your account. Please contact the systems team.' );
	}

	if ( ! in_array( $type, $allowed, true ) ) {
		return new WP_Error( 'method_not_allowed', "The '{$type}' recovery method is not available for your account." );
	}

	if ( 'email' === $type && ! is_recovery_email_enabled( $user_id ) ) {
		return new WP_Error( 'email_not_enabled', 'Email recovery is not enabled for this account.' );
	}

	if ( 'contact' === $type && ! get_designated_contact( $user_id ) ) {
		return new WP_Error( 'no_contact', 'No designated recovery contact has been configured for this account.' );
	}

	if ( has_pending_recovery( $user_id ) ) {
		return new WP_Error( 'already_pending', 'A recovery request is already pending for this account.' );
	}

	$token = wp_generate_password( 32, false );

	$request = [
		'type'         => $type,
		'token'        => wp_hash_password( $token ),
		'requested_at' => time(),
		'available_at' => time() + get_recovery_delay( $user ),
		'status'       => 'pending',
		'ip'           => $_SERVER['REMOTE_ADDR'] ?? '',
	];

	update_user_meta( $user_id, RECOVERY_REQUEST_META, $request );

	// Send notifications.
	send_recovery_requested_email( $user_id, $request, $token );
	send_recovery_requested_slack( $user_id, $request );

	if ( 'contact' === $type ) {
		$contact = get_designated_contact( $user_id );
		send_contact_recovery_request_email( $contact->ID, $user_id, $token );
	}

	return array_merge( $request, [ 'raw_token' => $token ] );
}

/**
 * Cancel a pending recovery request.
 *
 * @param int    $user_id The user ID.
 * @param string $token   The recovery token.
 * @return true|WP_Error
 */
function cancel_recovery_request( int $user_id, string $token ) {
	$request = get_pending_recovery( $user_id );

	if ( ! $request || 'cancelled' === $request['status'] ) {
		return new WP_Error( 'no_pending', 'No pending recovery request found.' );
	}

	if ( ! wp_check_password( $token, $request['token'] ) ) {
		return new WP_Error( 'invalid_token', 'Invalid recovery token.' );
	}

	delete_user_meta( $user_id, RECOVERY_REQUEST_META );

	send_recovery_cancelled_email( $user_id );

	return true;
}

/**
 * Confirm a recovery request (designated contact confirms the request is legitimate).
 *
 * @param int    $user_id    The locked-out user ID.
 * @param string $token      The recovery token.
 * @param int    $contact_id The contact user ID confirming.
 * @return true|WP_Error
 */
function confirm_contact_recovery( int $user_id, string $token, int $contact_id ) {
	$request = get_pending_recovery( $user_id );

	if ( ! $request || 'contact' !== $request['type'] ) {
		return new WP_Error( 'no_pending', 'No pending contact recovery request found.' );
	}

	if ( ! wp_check_password( $token, $request['token'] ) ) {
		return new WP_Error( 'invalid_token', 'Invalid recovery token.' );
	}

	$designated_contact = get_designated_contact( $user_id );

	if ( ! $designated_contact || $designated_contact->ID !== $contact_id ) {
		return new WP_Error( 'wrong_contact', 'You are not the designated recovery contact for this user.' );
	}

	$request['status'] = 'confirmed_by_contact';
	update_user_meta( $user_id, RECOVERY_REQUEST_META, $request );

	send_contact_confirmed_recovery_email( $user_id, $token );

	return true;
}

/**
 * Complete a recovery request, disabling 2FA for the user.
 *
 * @param int    $user_id The user ID.
 * @param string $token   The recovery token (original or completion token).
 * @return true|WP_Error
 */
function complete_recovery( int $user_id, string $token ) {
	$request = get_pending_recovery( $user_id );

	if ( ! $request ) {
		return new WP_Error( 'no_pending', 'No pending recovery request found.' );
	}

	// Accept either the original token or the completion token (generated by cron).
	$valid_token = wp_check_password( $token, $request['token'] );
	if ( ! $valid_token && ! empty( $request['completion_token'] ) ) {
		$valid_token = wp_check_password( $token, $request['completion_token'] );
	}

	if ( ! $valid_token ) {
		return new WP_Error( 'invalid_token', 'Invalid recovery token.' );
	}

	if ( 'email' === $request['type'] && time() < $request['available_at'] ) {
		return new WP_Error( 'too_early', 'The recovery waiting period has not elapsed yet.' );
	}

	if ( 'contact' === $request['type'] && 'confirmed_by_contact' !== $request['status'] ) {
		return new WP_Error( 'not_confirmed', 'The recovery request has not been confirmed by your designated contact.' );
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
 * Check if a user has 2FA enabled but no recovery options configured.
 *
 * @param WP_User $user The user to check.
 * @return bool True if recovery setup should be prompted.
 */
function check_recovery_prompt_needed( WP_User $user ) : bool {
	if ( ! Two_Factor_Core::is_user_using_two_factor( $user->ID ) ) {
		return false;
	}

	$allowed = get_allowed_recovery_methods( $user );

	if ( empty( $allowed ) ) {
		return false;
	}

	// Check if any recovery option is configured.
	if ( is_recovery_email_enabled( $user->ID ) ) {
		return false;
	}

	if ( get_designated_contact( $user->ID ) ) {
		return false;
	}

	return true;
}

/**
 * Get recovery status information for a user, suitable for the REST API.
 *
 * @param int $user_id The user ID.
 * @return array Recovery status data.
 */
function get_recovery_status( int $user_id ) : array {
	$user    = get_userdata( $user_id );
	$contact = get_designated_contact( $user_id );
	$pending = get_pending_contact_designation( $user_id );

	$contact_data = null;
	if ( $contact ) {
		$contact_data = [
			'id'           => $contact->ID,
			'login'        => $contact->user_login,
			'display_name' => $contact->display_name,
		];
	}

	$pending_contact_data = null;
	if ( $pending ) {
		$pending_contact = get_userdata( $pending['contact_id'] );
		if ( $pending_contact ) {
			$pending_contact_data = [
				'contact_login' => $pending_contact->user_login,
				'requested_at'  => $pending_contact->ID ? $pending['requested_at'] : null,
			];
		}
	}

	$request = get_pending_recovery( $user_id );
	$request_data = null;
	if ( $request && 'cancelled' !== $request['status'] ) {
		$request_data = [
			'type'         => $request['type'],
			'requested_at' => $request['requested_at'],
			'available_at' => $request['available_at'],
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
		'email_enabled'   => is_recovery_email_enabled( $user_id ),
		'contact'         => $contact_data,
		'contact_pending' => $pending_contact_data,
		'pending_request' => $request_data,
		'allowed_methods' => $user ? get_allowed_recovery_methods( $user ) : [],
		'designated_for'  => $designated_for,
		'recovery_delay'  => $user ? get_recovery_delay( $user ) : DAY_IN_SECONDS,
		'prompt_needed'   => $user ? check_recovery_prompt_needed( $user ) : false,
	];
}
