<?php
namespace WordPressdotorg\Two_Factor\Revalidation;
use Two_Factor_Core;

defined( 'WPINC' ) || die();

/**
 * The name of the cookie used to store the revalidation time.
 *
 * This cookie is not a security cookie, it's only purpose is to flag to the JS whether
 * the user session has a valid 2FA state or not.
 *
 * The value of the cookie may be incorrect, in which case the server will handle redirection
 * to the revalidation flow.
 *
 * @var string
 */
const COOKIE_NAME = 'wporg_2fa_status';

/**
 * Get the revalidation status for the current user, aka "sudo mode".
 *
 * @return array {
 *    @type int  $last_validated   The timestamp of the last time the user was validated.
 *    @type int  $expires_at       The timestamp when the current validation expires.
 *    @type int  $expires_save     The timestamp when the user will need to revalidate to save.
 *    @type bool $needs_revalidate Whether the user needs to revalidate.
 *    @type bool $can_save         Whether the user can currently save.
 * }
 */
function get_status() {
	$last_validated = Two_Factor_Core::is_current_user_session_two_factor();
	$timeout        = apply_filters( 'two_factor_revalidate_time', 10 * MINUTE_IN_SECONDS, get_current_user_id(), 'display' );
	$save_timeout   = 2 * apply_filters( 'two_factor_revalidate_time', 10 * MINUTE_IN_SECONDS, get_current_user_id(), 'save' );
	$expires_at     = $last_validated + $timeout;
	$expires_save   = $last_validated + $save_timeout;

	return [
		'last_validated'   => $last_validated,
		'expires_at'       => $expires_at,
		'expires_save'     => $expires_save,
		'needs_revalidate' => ( ! $last_validated || $expires_at < time() ),
		'can_save'         => ( $expires_save > time() ),
	];
}

/**
 * Perform a redirect to the revalidation URL if the user needs to revalidate.
 *
 * @param string $redirect_to The URL to redirect to after revalidating.
 * @return void
 */
function auth_redirect( $redirect_to = '' ) {
	$status = get_status();

	if ( ! $status['needs_revalidate'] ) {
		return;
	}

	// If the user is not validated, redirect to the revalidation URL.
	wp_safe_redirect( get_url( $redirect_to ) );
	exit;
}

/**
 * Get the URL for revalidating 2FA, with a redirect parameter.
 *
 * @param string $redirect_to The URL to redirect to after revalidating.
 * @return string
 */
function get_url( $redirect_to = '' ) {
	$url = Two_Factor_Core::get_user_two_factor_revalidate_url();
	if ( ! empty( $redirect_to ) ) {
		$url = add_query_arg( 'redirect_to', urlencode( $redirect_to ), $url );
	}

	return $url;
}

/**
 * Get the URL for revalidating 2FA via JavaScript.
 *
 * The calling code can listening for a 'reValidationComplete' event, or
 * simply have the user continue to $redirect_to.
 *
 * @param string $redirect_to The URL to redirect to after revalidating.
 * @return string
 */
function get_js_url( $redirect_to = '' ) {
	// Enqueue the JS to to handle the revalidate action.
	enqueue_assets();

	return get_url( $redirect_to );
}

/**
 * Output the JavaScript & CSS for the revalidate modal.
 *
 * This is output to the footer of the page, and listens for clicks on revalidate links.
 * When a revalidate link is clicked, a modal dialog is opened with an iframe to the revalidate 2FA session.
 * When the revalidation is complete, the dialog is closed and the calling code is notified via a 'reValidationComplete' event.
 */
function enqueue_assets() {
	wp_enqueue_style( 'wporg-2fa-revalidation', plugins_url( 'style.css', __FILE__ ), [], filemtime( __DIR__ . '/style.css' ) );
	wp_enqueue_script( 'wporg-2fa-revalidation', plugins_url( 'script.js', __FILE__ ), [], filemtime( __DIR__ . '/script.js' ), true );

	wp_localize_script( 'wporg-2fa-revalidation', 'wporgTwoFactorRevalidation', [
		'cookieName' => COOKIE_NAME,
		'l10n'       => [
			'title'   => __( 'Two-Factor Authentication', 'wporg' ),
			'message' => __( 'Please verify your Two-Factor Authentication to continue.', 'wporg' ),
		],
		'url'        => get_url(),
	] );
}

add_action( 'two_factor_user_authenticated', __NAMESPACE__ . '\set_cookie' );
add_action( 'two_factor_user_revalidated', __NAMESPACE__ . '\set_cookie' );
function set_cookie() {
	if ( ! apply_filters( 'send_auth_cookies', true, 0, 0, 0, '', '' ) ) {
		return;
	}

	$expires_at = get_status()['expires_save'] ?? time();

	/*
	 * Set a cookie to let JS know when the validation expires.
	 *
	 * The value is "wporg_2fa_status=TIMESTAMP", where TIMESTAMP is when the validation will expire.
	 * The cookie will expire a minute before the server would cease to accept the save action.
	 */
	setcookie(
		COOKIE_NAME,
		$expires_at,
		$expires_at - MINUTE_IN_SECONDS, // The cookie will cease to exist to JS at this time.
		COOKIEPATH,
		COOKIE_DOMAIN,
		is_ssl(),
		false // NOT HTTP only, this needs to be JS accessible.
	);
}

add_action( 'clear_auth_cookie', __NAMESPACE__ . '\clear_cookie' );
function clear_cookie() {
	if ( ! apply_filters( 'send_auth_cookies', true, 0, 0, 0, '', '' ) ) {
		return;
	}

	setcookie( COOKIE_NAME, '', time() - YEAR_IN_SECONDS, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), false );
}
