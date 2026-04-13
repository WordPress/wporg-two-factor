<?php

/**
 * Notification functions for Account Recovery.
 */

namespace WordPressdotorg\Two_Factor\Recovery;

defined( 'WPINC' ) || die();

/**
 * Send an email to the account owner when a recovery request is created.
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

	$available_date = wp_date( 'F j, Y \a\t g:i A T', $request['available_at'] );

	$message = sprintf(
		"Hi %s,\n\n" .
		"A two-factor authentication recovery was requested for your WordPress.org account.\n\n" .
		"Recovery type: %s\n" .
		"Requested from IP: %s\n" .
		"Recovery will be available: %s\n\n" .
		"If you did not request this, you can cancel it immediately:\n%s\n\n" .
		"If you still have access to your two-factor device, simply log in normally and the request will be automatically cancelled.\n\n" .
		"-- The WordPress.org Team",
		$user->display_name,
		'email' === $request['type'] ? 'Email recovery' : 'Designated contact recovery',
		$request['ip'],
		$available_date,
		esc_url_raw( $cancel_url )
	);

	wp_mail(
		$user->user_email,
		'[WordPress.org] Two-Factor Recovery Requested',
		$message,
		[ 'From: WordPress.org <noreply@wordpress.org>' ]
	);
}

/**
 * Send an email when the recovery waiting period has elapsed and recovery is available.
 *
 * @param int    $user_id The user ID.
 * @param array  $request The recovery request data.
 * @param string $token   The raw (unhashed) recovery token for completion link.
 */
function send_recovery_available_email( int $user_id, array $request, string $token ) : void {
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
		"The waiting period for your two-factor authentication recovery has elapsed.\n\n" .
		"You can now complete the recovery and regain access to your account:\n%s\n\n" .
		"This will disable two-factor authentication on your account. You will be required to set it up again after logging in.\n\n" .
		"If you did not request this recovery, your account may be compromised. Please log in immediately to cancel this request.\n\n" .
		"-- The WordPress.org Team",
		$user->display_name,
		esc_url_raw( $complete_url )
	);

	wp_mail(
		$user->user_email,
		'[WordPress.org] Two-Factor Recovery Available',
		$message,
		[ 'From: WordPress.org <noreply@wordpress.org>' ]
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
		$message,
		[ 'From: WordPress.org <noreply@wordpress.org>' ]
	);
}

/**
 * Send a Slack notification when a recovery request is created.
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

	$message = sprintf(
		'2FA recovery requested for %s (ID: %d) via %s from IP %s. Available at %s.',
		$user->user_login,
		$user_id,
		$request['type'],
		$request['ip'],
		wp_date( 'Y-m-d H:i:s T', $request['available_at'] )
	);

	/**
	 * Filter the Slack channel for recovery notifications.
	 *
	 * @param string $channel The Slack channel.
	 */
	$channel = apply_filters( 'wporg_2fa_recovery_slack_channel', '' );

	if ( $channel ) {
		notify_slack( $channel, $message );
	}
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
		"Note: You must have two-factor authentication enabled on your own account to be a recovery contact.\n\n" .
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
		$message,
		[ 'From: WordPress.org <noreply@wordpress.org>' ]
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
		$message,
		[ 'From: WordPress.org <noreply@wordpress.org>' ]
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
		$message,
		[ 'From: WordPress.org <noreply@wordpress.org>' ]
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
		$message,
		[ 'From: WordPress.org <noreply@wordpress.org>' ]
	);
}
