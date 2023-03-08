<?php

// Mimic w.org for testing wporg-two-factor
if ( ! function_exists( 'is_special_user' ) ) {
	global $supes, $super_admins;
	$supes = array(
		'admin'
	);
	$super_admins = array_merge( $supes );

	function is_special_user( $user_id ) {
		$user = get_userdata( $user_id );
		return in_array( $user->user_login, $GLOBALS['supes'], true );
	}
}

require_once __DIR__ . '/pub/mu-plugins/loader.php';

// Enable dummy provider for convenience when running locally.
add_filter( 'two_factor_providers', function( $providers ) {
	if ( ! defined( 'WP_TESTS_DOMAIN' ) ) {
		$providers['Two_Factor_Dummy'] = TWO_FACTOR_DIR . 'providers/class-two-factor-dummy.php';
	}

	return $providers;
}, 100 ); // Must run _after_ wporg-two-factor.

// Mimics `mu-plugins/main-network/site-support.php`.
add_action( 'init', function() {
	if ( ! function_exists( 'bbp_get_user_slug' ) ) {
		return;
	}

	// e.g., https://wordpress.org/support/users/foo/edit/account/
	add_rewrite_rule(
		bbp_get_user_slug() . '/([^/]+)/' . bbp_get_edit_slug() . '/account/?$',
		'index.php?' . bbp_get_user_rewrite_id() . '=$matches[1]&' . 'edit_account=1',
		'top'
	);
} );

// Activate the wporg-support theme.
add_action( 'wp_install', function() {
	update_option( 'template', 'wporg-support' );
	update_option( 'stylesheet', 'wporg-support' );
} );