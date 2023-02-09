<?php

namespace WordPressdotorg\Two_Factor;
use Two_Factor_Core;

defined( 'WPINC' ) || die();

require __DIR__ . '/rest-api.php';

add_action( 'plugins_loaded', __NAMESPACE__ . '\replace_core_ui_with_custom' ); // Must run after Two Factor plugin loaded.
add_action( 'init', __NAMESPACE__ . '\register_block' );

/**
 * Registers the block
 *
 * @codeCoverageIgnore
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
	remove_action( 'show_user_profile', array( 'Two_Factor_Core', 'user_two_factor_options' ) );
	remove_action( 'edit_user_profile', array( 'Two_Factor_Core', 'user_two_factor_options' ) );
	remove_action( 'personal_options_update', array( 'Two_Factor_Core', 'user_two_factor_options_update' ) );
	remove_action( 'edit_user_profile_update', array( 'Two_Factor_Core', 'user_two_factor_options_update' ) );

	add_action( 'bbp_user_edit_account', __NAMESPACE__ . '\render_custom_ui' );

	// Hide account details on profile.php + user-edit.php.
	add_action( 'load-profile.php', __NAMESPACE__ . '\remove_admin_profile_php' );
	add_action( 'load-user-edit.php', __NAMESPACE__ . '\remove_admin_profile_php' );
}

/**
 * Render our custom 2FA interface.
 *
 * @codeCoverageIgnore
 */
function render_custom_ui() : void {
	if ( ! current_user_can( 'edit_user', bbp_get_displayed_user_id() ) ) {
		echo 'You cannot edit this user.';
		return;
	}

	$user_id    = bbp_get_displayed_user_id();
	$json_attrs = json_encode( [ 'userId' => $user_id ] );

	$preload_paths = [
		'/wp/v2/users/' . $user_id . '?context=edit',
	];

	$enabled_providers = Two_Factor_Core::get_enabled_providers_for_user( $user_id );

	if ( ! in_array( 'Two_Factor_Totp', $enabled_providers, true ) ) {
		$preload_paths[] = "/wporg-two-factor/1.0/totp-setup?user_id=$user_id"; // todo not working, still see xhr request
	}

	preload_api_requests( $preload_paths );

	echo do_blocks( "<!-- wp:wporg-two-factor/settings $json_attrs /-->" );
}

/**
 * Display a warning about where to manage ones profile details.
 */
function remove_admin_profile_php() {
	$user = defined( 'IS_PROFILE_PAGE' ) ? wp_get_current_user() : get_user_by( 'id', $_REQUEST['user_id'] );

	add_action( 'admin_notices', function() use ( $user ) {
		echo '<div class="notice notice-info"><p>';
		printf(
			__( 'Your profile details can be managed through your <a href="%s">WordPress.org profile</a>.', 'wporg' ),
			'https://profiles.wordpress.org/' . $user->user_nicename . '/profile/edit/'
		);
		echo '</p></div>';
	} );

	// Hide the fields through Javascript due to lack of core hooks.
	wp_register_script( 'hide-settings', '', [ 'jquery' ], '', true );
	wp_enqueue_script( 'hide-settings' );
	wp_add_inline_script( 'hide-settings', "
		jQuery( '#email, #description, #password').parents('table').hide().prev('h2').hide();
		jQuery( '#user_login').parents('table').find('tr:not(.user-role-wrap)').hide().parents('table').prev('h2').hide();
	" );

	// Prevent updates by overwriting with existing user data.
	foreach ( [ 'first_name', 'last_name', 'nickname', 'display_name', 'email', 'url', 'aim', 'yim', 'jabber', 'description' ] as $field ) {
		if ( isset( $_POST[ $field ] ) ) {
			$_POST[ $field ] = wp_slash( $user->$field ?? $user->{"user_$field"} );
		}
	}

	// Prevent password changes by unsetting the fields.
	unset( $_POST['pass1'], $_POST['pass2'] );
}
