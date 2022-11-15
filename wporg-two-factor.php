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
defined( 'WPINC' ) || die();

// Disabled until ready for launch.
if ( 'production' === wp_get_environment_type() ) {
	return;
}


add_filter( 'two_factor_providers', __NAMESPACE__ . '\two_factor_providers', 99 ); // Must run after all other plugins.

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
