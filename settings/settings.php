<?php

namespace WordPressdotorg\Two_Factor;

defined( 'WPINC' ) || die();

add_action( 'plugins_loaded', __NAMESPACE__ . '\replace_core_ui_with_custom' ); // Must run after Two Factor plugin loaded.
add_action( 'init', __NAMESPACE__ . '\register_block' );

/**
 * Registers the block
 */
function register_block() {
	register_block_type( __DIR__ . '/build' );
}

/**
 * Replace the Two Factor UI with our custom version.
 *
 * @codeCoverageIgnore
 */
function replace_core_ui_with_custom() : void {
	if ( ! is_admin() ) {
		// @todo Remove the `if()` once the custom UI is fully functional, since the back-end upstream UI will no
		// longer be needed, and may cause conflicts.
		remove_action( 'show_user_profile', array( 'Two_Factor_Core', 'user_two_factor_options' ) );
		remove_action( 'edit_user_profile', array( 'Two_Factor_Core', 'user_two_factor_options' ) );
	}

	add_action( 'bbp_user_edit_account', __NAMESPACE__ . '\render_custom_ui' );
}

/**
 * Render our custom 2FA interface.
 */
function render_custom_ui() : void {
	wp_enqueue_style( 'wp-components' );

	$user_id    = (int) bbp_get_displayed_user_id();
	$json_attrs = json_encode( (object) [ 'userId' => $user_id ] );

	echo do_blocks( "<!-- wp:wporg-two-factor/settings $json_attrs /-->" );
}
