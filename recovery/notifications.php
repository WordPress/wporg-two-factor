<?php

/**
 * Notification functions for Account Recovery.
 */

namespace WordPressdotorg\Two_Factor\Recovery;

defined( 'WPINC' ) || die();

/**
 * Send an email to the account owner when a recovery request is created.
 *
 * This warns them that someone successfully logged in with their password and is
 * attempting to disable 2FA.
 *
 * @param int    $user_id The user ID.
 * @param array  $request The recovery request data.
 * @param string $token   The raw (unhashed) recovery token for cancel link.
 */
function send_recovery_requested_email( int $user_id, array $request, string $token ) : void {
	$user = get_userdata( $user_id );
	if ( ! $user ) {
		return;
	}

	$cancel_url = add_query_arg( [
		'action'  => 'wporg-2fa-recovery-cancel',
		'user_id' => $user_id,
		'token'   => $token,
	], home_url( '/' ) );

	$compromised_url = add_query_arg( [
		'action'  => 'wporg-2fa-recovery-compromised',
		'user_id' => $user_id,
		'token'   => $token,
	], home_url( '/' ) );

	$message = sprintf(
		"Hi %s,\n\n" .
		"A two-factor authentication recovery was requested for your WordPress.org account. " .
		"This means someone successfully logged in with your password and is attempting to " .
		"disable two-factor authentication.\n\n" .
		"Requested from IP: %s\n\n" .
		"Your designated recovery contacts have been notified. Once one of them confirms, " .
		"two-factor authentication will be disabled on your account.\n\n" .
		"If you did not request this, take action immediately:\n\n" .
		"Cancel the request:\n%s\n\n" .
		"If you believe your password is compromised, use this link to cancel the request, " .
		"reset your password, and log out all sessions:\n%s\n\n" .
		"-- The WordPress.org Team",
		$user->display_name,
		$request['ip'],
		esc_url_raw( $cancel_url ),
		esc_url_raw( $compromised_url )
	);

	wp_mail(
		$user->user_email,
		'[WordPress.org] Two-Factor Recovery Requested - Action Required',
		$message
	);
}

/**
 * Send an email when a recovery request is cancelled.
 *
 * @param int $user_id The user ID.
 */
function send_recovery_cancelled_email( int $user_id ) : void {
	$user = get_userdata( $user_id );
	if ( ! $user ) {
		return;
	}

	$message = sprintf(
		"Hi %s,\n\n" .
		"The two-factor authentication recovery request for your WordPress.org account has been cancelled.\n\n" .
		"No changes have been made to your account.\n\n" .
		"-- The WordPress.org Team",
		$user->display_name
	);

	wp_mail(
		$user->user_email,
		'[WordPress.org] Two-Factor Recovery Cancelled',
		$message
	);
}

/**
 * Send an email when the user reports their password as compromised.
 *
 * @param int $user_id The user ID.
 */
function send_password_compromised_email( int $user_id ) : void {
	$user = get_userdata( $user_id );
	if ( ! $user ) {
		return;
	}

	$reset_url = network_site_url( 'wp-login.php?action=lostpassword', 'login' );

	$message = sprintf(
		"Hi %s,\n\n" .
		"You reported that your WordPress.org account password may be compromised. " .
		"The following actions have been taken:\n\n" .
		"- The pending recovery request has been cancelled\n" .
		"- Your password has been reset\n" .
		"- All active sessions have been terminated\n\n" .
		"To regain access, please reset your password:\n%s\n\n" .
		"Your two-factor authentication settings remain unchanged.\n\n" .
		"-- The WordPress.org Team",
		$user->display_name,
		esc_url_raw( $reset_url )
	);

	wp_mail(
		$user->user_email,
		'[WordPress.org] Password Reset - Compromised Account',
		$message
	);
}

/**
 * Send Slack notifications when a recovery request is created.
 *
 * Notifies the recovery channel and sends DMs to the account owner and all
 * designated contacts (if they have linked Slack accounts).
 *
 * @param int   $user_id The user ID.
 * @param array $request The recovery request data.
 */
function send_recovery_requested_slack( int $user_id, array $request ) : void {
	if ( ! function_exists( 'notify_slack' ) ) {
		return;
	}

	$user = get_userdata( $user_id );
	if ( ! $user ) {
		return;
	}

	$channel_message = sprintf(
		'2FA recovery requested for %s (ID: %d) from IP %s.',
		$user->user_login,
		$user_id,
		$request['ip']
	);

	/**
	 * Filter the Slack channel for recovery notifications.
	 *
	 * @param string $channel The Slack channel.
	 */
	$channel = apply_filters( 'wporg_2fa_recovery_slack_channel', '' );

	if ( $channel ) {
		notify_slack( $channel, $channel_message );
	}

	// DM the account owner.
	$owner_slack_id = _get_user_slack_id( $user_id );
	if ( $owner_slack_id ) {
		notify_slack(
			$owner_slack_id,
			sprintf(
				'A 2FA recovery was requested for your WordPress.org account from IP %s. ' .
				'If this was not you, check your email for instructions to cancel the request and secure your account.',
				$request['ip']
			)
		);
	}

	// DM each designated contact.
	$contacts = get_designated_contacts( $user_id );
	foreach ( $contacts as $contact ) {
		$contact_slack_id = _get_user_slack_id( $contact->ID );
		if ( $contact_slack_id ) {
			notify_slack(
				$contact_slack_id,
				sprintf(
					'%s (%s) has requested a 2FA recovery on WordPress.org and needs your help. Check your email for a confirmation link.',
					$user->display_name,
					$user->user_login
				)
			);
		}
	}
}

/**
 * Get a user's Slack member ID if available.
 *
 * @param int $user_id The user ID.
 * @return string|null The Slack member ID, or null if not available.
 */
function _get_user_slack_id( int $user_id ) : ?string {
	/**
	 * Filter to retrieve a user's Slack member ID.
	 *
	 * @param string|null $slack_id The Slack member ID. Default null.
	 * @param int         $user_id  The WordPress user ID.
	 */
	return apply_filters( 'wporg_2fa_user_slack_id', null, $user_id );
}

/**
 * Send an email to a potential designated contact asking them to accept.
 *
 * @param int    $contact_id The contact user ID.
 * @param int    $user_id    The user requesting the contact.
 * @param string $token      The raw designation token.
 */
function send_contact_designation_request( int $contact_id, int $user_id, string $token ) : void {
	$contact = get_userdata( $contact_id );
	$user    = get_userdata( $user_id );

	if ( ! $contact || ! $user ) {
		return;
	}

	$accept_url = add_query_arg( [
		'action'     => 'wporg-2fa-accept-designation',
		'user_id'    => $user_id,
		'contact_id' => $contact_id,
		'token'      => $token,
	], home_url( '/' ) );

	$decline_url = add_query_arg( [
		'action'     => 'wporg-2fa-decline-designation',
		'user_id'    => $user_id,
		'contact_id' => $contact_id,
		'token'      => $token,
	], home_url( '/' ) );

	$message = sprintf(
		"Hi %s,\n\n" .
		"%s (%s) has designated you as their two-factor authentication recovery contact on WordPress.org.\n\n" .
		"If they ever lose access to their two-factor device, you may be contacted to verify their identity and help them regain access.\n\n" .
		"To accept this designation:\n%s\n\n" .
		"To decline:\n%s\n\n" .
		"Note: You must have two-factor authentication enabled on your own account to accept.\n\n" .
		"-- The WordPress.org Team",
		$contact->display_name,
		$user->display_name,
		$user->user_login,
		esc_url_raw( $accept_url ),
		esc_url_raw( $decline_url )
	);

	wp_mail(
		$contact->user_email,
		'[WordPress.org] Recovery Contact Designation Request',
		$message
	);
}

/**
 * Send an email when a designated contact accepts the designation.
 *
 * @param int $user_id    The user who requested the contact.
 * @param int $contact_id The contact who accepted.
 */
function send_contact_designation_accepted( int $user_id, int $contact_id ) : void {
	$user    = get_userdata( $user_id );
	$contact = get_userdata( $contact_id );

	if ( ! $user || ! $contact ) {
		return;
	}

	$message = sprintf(
		"Hi %s,\n\n" .
		"%s (%s) has accepted your request to be your two-factor authentication recovery contact on WordPress.org.\n\n" .
		"If you ever lose access to your two-factor device, you can initiate a recovery and %s will be able to verify your identity.\n\n" .
		"-- The WordPress.org Team",
		$user->display_name,
		$contact->display_name,
		$contact->user_login,
		$contact->display_name
	);

	wp_mail(
		$user->user_email,
		'[WordPress.org] Recovery Contact Confirmed',
		$message
	);
}

/**
 * Send an email to the designated contact when a recovery is requested.
 *
 * @param int    $contact_id The contact user ID.
 * @param int    $user_id    The locked-out user ID.
 * @param string $token      The raw recovery token for confirmation.
 */
function send_contact_recovery_request_email( int $contact_id, int $user_id, string $token ) : void {
	$contact = get_userdata( $contact_id );
	$user    = get_userdata( $user_id );

	if ( ! $contact || ! $user ) {
		return;
	}

	$confirm_url = add_query_arg( [
		'action'     => 'wporg-2fa-confirm-contact-recovery',
		'user_id'    => $user_id,
		'contact_id' => $contact_id,
		'token'      => $token,
	], home_url( '/' ) );

	$message = sprintf(
		"Hi %s,\n\n" .
		"%s (%s) says they have lost access to their two-factor authentication device and is requesting account recovery on WordPress.org.\n\n" .
		"If you can verify (out-of-band, such as in person, phone call, or video chat) that this request is legitimate, please confirm it:\n%s\n\n" .
		"You must be logged in with two-factor authentication to confirm this request.\n\n" .
		"If you are unsure whether this request is legitimate, do NOT confirm it. The account owner can contact support instead.\n\n" .
		"-- The WordPress.org Team",
		$contact->display_name,
		$user->display_name,
		$user->user_login,
		esc_url_raw( $confirm_url )
	);

	wp_mail(
		$contact->user_email,
		'[WordPress.org] Recovery Confirmation Needed',
		$message
	);
}

/**
 * Send an email to the locked-out user when their contact has confirmed the recovery.
 *
 * @param int    $user_id The locked-out user ID.
 * @param string $token   The raw recovery token for completion.
 */
function send_contact_confirmed_recovery_email( int $user_id, string $token ) : void {
	$user = get_userdata( $user_id );
	if ( ! $user ) {
		return;
	}

	$complete_url = add_query_arg( [
		'action'  => 'wporg-2fa-recovery-complete',
		'user_id' => $user_id,
		'token'   => $token,
	], home_url( '/' ) );

	$message = sprintf(
		"Hi %s,\n\n" .
		"Your designated recovery contact has confirmed your two-factor authentication recovery request.\n\n" .
		"You can now complete the recovery and regain access to your account:\n%s\n\n" .
		"This will disable two-factor authentication on your account. You will be required to set it up again after logging in.\n\n" .
		"-- The WordPress.org Team",
		$user->display_name,
		esc_url_raw( $complete_url )
	);

	wp_mail(
		$user->user_email,
		'[WordPress.org] Two-Factor Recovery Confirmed by Contact',
		$message
	);
}
