<?php
/**
 * PHPUnit bootstrap file
 *
 * phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- This is a shell script.
 * phpcs:disable WordPress.WP.GlobalVariablesOverride.Prohibited -- This is intentional and necessary.
 */

if ( false !== stripos( gethostname(), 'wordpress.org' ) ) {
	die( 'These tests modify the database and should only be run in local environments, never in w.org sandboxes.' );
}

$_tests_dir = getenv( 'WP_TESTS_DIR' );

if ( ! $_tests_dir ) {
	$_tests_dir = rtrim( sys_get_temp_dir(), '/\\' ) . '/wordpress-tests-lib';
}

if ( ! file_exists( $_tests_dir . '/includes/functions.php' ) ) {
	echo "Could not find $_tests_dir/includes/functions.php";
	exit( 1 );
}

// Give access to tests_add_filter() function.
require_once $_tests_dir . '/includes/functions.php';

// Mock w.org functions
function is_special_user( $user_id = false ) {
	return in_array( $user_id, $GLOBALS['mock_is_special_user'], true );
}

/**
 * Manually load the plugin being tested.
 */
function _manually_load_plugin() {
	$GLOBALS['mock_is_special_user'] = array();

	// Mimic w.org capes.php.
	$GLOBALS['super_admins'] = array();

	require dirname( __DIR__, 2 ) . '/two-factor/two-factor.php';
	require dirname( __DIR__ ) . '/wporg-two-factor.php';
}
tests_add_filter( 'muplugins_loaded', '_manually_load_plugin' );

// Start up the WP testing environment.
require $_tests_dir . '/includes/bootstrap.php';
