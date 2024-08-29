<?php
namespace WordPressdotorg\Two_Factor\Stats;

use Two_Factor_Core, Two_Factor_Backup_Codes;
use WildWolf\WordPress\TwoFactorWebAuthn\Plugin as WebAuthn_Plugin;
use WildWolf\WordPress\TwoFactorWebAuthn\Constants as WebAuthn_Plugin_Constants;
use WP_User, WP_Error;

defined( 'WPINC' ) || die();

if ( ! function_exists( 'bump_stats_extra' ) ) {
	return;
}

add_action( 'two_factor_user_authenticated', __NAMESPACE__ . '\two_factor_user_authenticated', 10, 2 );

/**
 * Record stats for number of authentications per provider per day.
 */
function two_factor_user_authenticated( $user_id, $provider ) {
	if ( ! $provider ) {
		return;
	}

	$provider = str_ireplace( [ 'TwoFactor_Provider_', 'Two_Factor_' ], '', $provider->get_key() );
	$provider = str_replace( '_', ' ', $provider );

	bump_stats_extra( 'two-factor-auth', $provider );
}

