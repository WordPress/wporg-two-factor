<?php

/**
 * Plugin Name: WordPress.org Two Factor
 * Description: WordPress.org-specific customizations for the Two Factor plugin.
 * License:     GPLv2 or later
 * Text Domain: wporg
 * Network:     true
 * Update URI:  false
 */

namespace WordPressdotorg\Two_Factor;
use Two_Factor_Core;
use WP_User, WP_Error;

defined( 'WPINC' ) || die();

// Disabled until ready for launch.
if ( 'production' === wp_get_environment_type() ) {
	return;
}

// Load the Two Factor plugin, so that only this plugin needs to be activated, and the above conditional is respected.
include_once( dirname( __DIR__ ) . '/two-factor/two-factor.php' );

require_once __DIR__ . '/settings/settings.php';

add_filter( 'two_factor_providers', __NAMESPACE__ . '\two_factor_providers', 99 ); // Must run _after_ all other plugins.
add_action( 'set_current_user', __NAMESPACE__ . '\remove_super_admins_until_2fa_enabled', 1 ); // Must run _before_ all other plugins.
add_action( 'login_redirect', __NAMESPACE__ . '\redirect_to_2fa_settings', 105, 3 ); // After `wporg_remember_where_user_came_from_redirect()`, before `WP_WPorg_SSO::redirect_to_policy_update()`.
add_action( 'user_has_cap', __NAMESPACE__ . '\remove_capabilities_until_2fa_enabled', 99, 4 ); // Must run _after_ all other plugins.

/**
 * Determine which providers should be available to users.
 */
function two_factor_providers( array $providers ) : array {
	// Match the name => file path format of input var, but the path isn't needed.
	$desired_providers = array(
		'Two_Factor_WebAuthn'     => '',
		'Two_Factor_Totp'         => '',
		'Two_Factor_Backup_Codes' => '',
	);

	return array_intersect_key( $providers, $desired_providers );
}


/**
 * Remove a user's Super Admins status if they don't have 2FA enabled.
 *
 * This is needed in addition to `remove_capabilities_until_2fa_enabled()` for two reasons:
 *     1: To protect against code that calls `is_super_admin()` directly, instead of checking capabilities.
 *     2: To avoid the code in `has_cap()` that allows Super Admins to do anything unless `do_not_allow` is set.
 *        That would interfere with reducing their capabilities to a Subscriber in `remove_capabilities_until_2fa_enabled()`.
 */
function remove_super_admins_until_2fa_enabled() : void {
	global $super_admins;

	$user     = wp_get_current_user();
	$position = array_search( $user->user_login, $super_admins, true );

	if ( false === $position ) {
		return;
	}

	if ( user_requires_2fa( $user ) && ! Two_Factor_Core::is_user_using_two_factor( $user->ID ) ) {
		unset( $super_admins[ $position ] );
	}
}

/**
 * Remove capabilities when a user with elevated privileges hasn't enabled 2FA.
 *
 * That is necessary even though we'll redirect all requests to their profile, because otherwise they could still
 * perform privileged actions on the front end, via the REST API, etc.
 */
function remove_capabilities_until_2fa_enabled( array $allcaps, array $caps, array $args, WP_User $user ) : array {
	if ( 0 === $user->ID || ! user_requires_2fa( $user ) ) {
		return $allcaps;
	}

	if ( ! Two_Factor_Core::is_user_using_two_factor( $user->ID ) ) {
		// This also relies on `remove_super_admins_until_2fa_enabled()`, see notes in that function.
		$allcaps = get_role( 'subscriber' )->capabilities;

		if ( function_exists( 'bbp_is_user_inactive' ) && ! bbp_is_user_inactive( $user->ID ) ) {
			$allcaps = array_merge( $allcaps, bbp_get_caps_for_role( bbp_get_participant_role() ) );
			$allcaps['read_private_forums'] = false;
		}

		add_action( 'admin_notices', __NAMESPACE__ . '\render_2fa_admin_notice' );
		add_filter( 'wporg_global_header_alert_markup', __NAMESPACE__ . '\get_enable_2fa_notice' );
	}

	return $allcaps;
}

/**
 * Check if the user has enough elevated privileges to require 2FA.
 */
function user_requires_2fa( WP_User $user ) : bool {
	global $trusted_deputies, $wcorg_subroles;

	if ( ! array_key_exists( 'phpunit_version', $GLOBALS ) ) {
		// 2FA is opt-in during beta testing.
		// todo Remove this once we open it to all users.
		$beta_testers = array( 'iandunn', 'dd32', 'paulkevan', 'tellyworth' );
		if ( ! in_array( $user->user_login, $beta_testers, true ) ) {
			return false;
		}
	}

	$required = false;

	if ( is_special_user( $user->ID ) ) {
		$required = true;
	} elseif ( $trusted_deputies && in_array( $user->ID, $trusted_deputies, true ) ) {
		$required = true;
	} elseif ( $wcorg_subroles && array_key_exists( $user->ID, $wcorg_subroles ) ) {
		$required = true;
	}

	return $required;
}

/**
 * Redirect a user to their 2FA settings if they need to enable it.
 *
 * This isn't usually necessary, since WordPress will prevent Subscribers from visiting other Core screens, but
 * sometimes plugins add screens that are available to Subscribers (either intentionally or not).
 *
 * @param WP_User|WP_Error $user
 */
function redirect_to_2fa_settings( string $redirect_to, string $requested_redirect_to, $user ) : string {
	if ( is_wp_error( $user ) ) {
		return $redirect_to;
	}

	if ( ! user_requires_2fa( $user ) || Two_Factor_Core::is_user_using_two_factor( $user->ID ) ) {
		return $redirect_to;
	}

	return get_edit_account_url();
}

/**
 * Inform the user that they need to enable 2FA.
 *
 * @codeCoverageIgnore
 */
function render_2fa_admin_notice() : void {
	?>

	<div class="notice notice-error">
		<p>
			<?php echo wp_kses_post( get_enable_2fa_notice() ); ?>
		</p>
	</div>

	<?php
}

/**
 * Get the notice for enabling 2FA.
 *
 * When used as a filter callback, this will prepend the 2FA notice to others notices.
 */
function get_enable_2fa_notice( string $existing_notices = '' ) : string {
	$two_factor_notice = sprintf(
		__(
			'Your account requires two-factor authentication, which adds an extra layer of protection against hackers. You cannot make any changes to this site until you <a href="%s">enable it</a>.',
			'wporg'
		),
		get_edit_account_url()
	);

	return $two_factor_notice . $existing_notices;
}

/**
 * Get the URL of the Edit Account screen.
 */
function get_edit_account_url() : string {
	$user = wp_get_current_user();

	if ( function_exists( 'bbp_get_user_profile_edit_url' ) ) {
		$url = bbp_get_user_profile_edit_url( $user->ID, $user->user_nicename ) . 'account/';
	} else {
		// Fallback for sites that don't have bbPress active.
		$url = "https://wordpress.org/support/users/{$user->user_nicename}/edit/account/";
	}

	return $url;
}
