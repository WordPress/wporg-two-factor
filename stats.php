<?php
namespace WordPressdotorg\Two_Factor\Stats;
use stdClass;

defined( 'WPINC' ) || die();

if ( ! function_exists( 'bump_stats_extra' ) ) {
	return;
}

add_action( 'two_factor_user_authenticated', __NAMESPACE__ . '\two_factor_user_authenticated', 10, 2 );
add_action( 'update_user_meta', __NAMESPACE__ . '\action_update_user_meta', 10, 4 );

/**
 * Convert a Provider class name into a friendly nice name.
 *
 * @param string $provider
 * @return string
 */
function provider_name_from_key( $provider ) {
	return str_replace( '_', ' ', str_ireplace( [ 'TwoFactor_Provider_', 'Two_Factor_' ], '', $provider ) );
}

/**
 * Record stats for number of authentications per provider per day.
 */
function two_factor_user_authenticated( $user_id, $provider ) {
	if ( ! $provider ) {
		return;
	}

	bump_stats_extra( 'two-factor-auth', provider_name_from_key( $provider->get_key() ) );
}

/**
 * Watch for changes to user meta.
 *
 * Currently this only records stats for:
 *  - Enabled 2FA after being nagged about it on login
 *  - Generated backup codes after being nagged about it on login
 */
function action_update_user_meta( $meta_id, $user_id, $meta_key, $new_meta_value ) {
	$relevant_meta_keys = [
		'_two_factor_backup_codes',
		'_two_factor_enabled_providers'
	];
	if ( ! in_array( $meta_key, $relevant_meta_keys, true ) ) {
		return;
	}

	$nag_user_meta = ( '_two_factor_backup_codes' === $meta_key ) ? 'last_2fa_backup_codes_nag_time' : 'last_2fa_nag';
	$last_nagged   = get_user_meta( $user_id, $nag_user_meta, true );

	// The user was last nagged more than an hour ago, the stats here aren't relevant.
	if ( $last_nagged && $last_nagged < time() - HOUR_IN_SECONDS ) {
		return;
	}

	$old_meta_key   = $meta_key;
	$old_meta_value = get_user_meta( $user_id, $meta_key, true );
	$callback       = new stdClass; // Placeholder for the callback, such that it can be used in the callback.
	$callback       = static function( $meta_id, $user_id, $meta_key, $new_meta_value ) use( $old_meta_value, $old_meta_key, &$callback ) {
		if ( $old_meta_key != $meta_key ) {
			return;
		}
		remove_action( 'updated_user_meta', $callback ); // Remove self.

		// The user has set new backup codes.
		if ( '_two_factor_backup_codes' === $meta_key ) {
			bump_stats_extra( 'wporg-two-factor', 'Set Backup Codes after nag' );
		}

		// The user has enabled or disabled providers.
		if ( '_two_factor_enabled_providers' === $meta_key ) {
			$old_providers      = $old_meta_value ?? [];
			$new_providers      = $new_meta_value ?? [];
			$enabled_providers  = array_diff( $new_providers, $old_providers );

			foreach ( $enabled_providers as $provider_key ) {
				bump_stats_extra( 'wporg-two-factor', 'Set ' . provider_name_from_key( $provider_key ) . ' after nag' );
			}
		}
	};

	add_action( 'updated_user_meta', $callback, 10, 4 );
}