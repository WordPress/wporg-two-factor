<?php
namespace WordPressdotorg\Two_Factor;
use Two_Factor_Core;

defined( 'WPINC' ) || die();

/**
 * Get the revalidation status for the current user, aka "sudo mode".
 *
 * @return array {
 *    @type int  $last_validated   The timestamp of the last time the user was validated.
 *    @type int  $expires_at       The timestamp when the current validation expires.
 *    @type bool $needs_revalidate Whether the user needs to revalidate.
 * }
 */
function get_revalidation_status() {
	$last_validated = Two_Factor_Core::is_current_user_session_two_factor();
	$timeout        = apply_filters( 'two_factor_revalidate_time', 10 * MINUTE_IN_SECONDS, get_current_user_id(), 'display' );
	$save_timeout   = apply_filters( 'two_factor_revalidate_time', 10 * MINUTE_IN_SECONDS, get_current_user_id(), 'save' );
	$expires_at     = $last_validated + $timeout;
	$expires_save   = $last_validated + ( 2 * $save_timeout );

	return [
		'last_validated'   => $last_validated,
		'expires_at'       => $expires_at,
		'expires_save'     => $expires_save,
		'needs_revalidate' => ( ! $last_validated || $expires_at < time() ),
		'can_save'         => ( $expires_save > time() ),
	];
}

/**
 * Get the URL for revalidating 2FA, with a redirect parameter.
 *
 * @param string $redirect_to The URL to redirect to after revalidating.
 * @return string
 */
function get_revalidate_url( $redirect_to = '' ) {
	$url = Two_Factor_Core::get_user_two_factor_revalidate_url();
	if ( ! empty( $redirect_to ) ) {
		$url = add_query_arg( 'redirect_to', urlencode( $redirect_to ), $url );
	}

	return $url;
}

/**
 * Get the URL for revalidating 2FA via JavaScript.
 *
 * The calling code should be listening for a 'reValidationComplete' event.
 *
 * @param string $redirect_to The URL to redirect to after revalidating.
 * @return string
 */
function get_js_revalidation_url( $redirect_to = '' ) {
	$url = get_revalidate_url( $redirect_to );

	// Add some JS to the footer to handle the revalidate actions.
	enqueue_assets();

	return $url;
}

/**
 * Output the JavaScript & CSS for the revalidate modal.
 *
 * This is output to the footer of the page, and listens for clicks on revalidate links.
 * When a revalidate link is clicked, a modal dialog is opened with an iframe to the revalidate URL.
 * When the revalidation is complete, the dialog is closed and the calling code is notified via a 'reValidationComplete' event.
 */
function enqueue_assets() {
	wp_enqueue_style( 'wporg-2fa-revalidation', plugins_url( 'style.css', __FILE__ ), [], filemtime( __DIR__ . '/style.css' ) );
	wp_enqueue_script( 'wporg-2fa-revalidation', plugins_url( 'style.js', __FILE__ ), [], filemtime( __DIR__ . '/style.js' ) );

	wp_localize_script( 'wporg-2fa-revalidation', 'wporgTwoFactorRevalidation', [
		'l10n' => [
			'title' => __( 'Two Factor Authentication', 'wporg' ),
		],
		'status' => get_revalidation_status()
	] );
}
