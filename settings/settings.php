<?php

namespace WordPressdotorg\Two_Factor;

defined( 'WPINC' ) || die();

add_action( 'plugins_loaded', __NAMESPACE__ . '\replace_core_ui_with_custom' ); // Must run after Two Factor plugin loaded.
add_action( 'init', __NAMESPACE__ . '\register_block' );
add_action( 'rest_api_init', __NAMESPACE__ . '\register_user_fields' );
add_filter( 'rest_pre_insert_user', __NAMESPACE__ . '\require_email_confirmation', 10, 2 );

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
	$json_attrs = json_encode( [ 'userId' => $user_id ] );

	$preload_paths = [
		'/wp/v2/users/' . $user_id . '?context=edit',
	];
	preload_api_requests( $preload_paths );

	echo do_blocks( "<!-- wp:wporg-two-factor/settings $json_attrs /-->" );
}

/**
 * Register/Output some REST-API calls to be pre-loaded.
 *
 * This prevents the browser having to make the HTTP call before the react UI can be ready.
 * This duplicates block_editor_rest_api_preload() as there is no generic function for performing this preloading.
 * WARNING: This will output Javascript immediately if called during the page load if the wp-api-fetch script has already been output.
 *
 * @param array $preload_paths The REST API paths to be pre-loaded, must include prefixed slash.
 * @return void
 */
function preload_api_requests( array $preload_paths ) : void {
	global $post, $wp_scripts, $wp_styles;

	/*
	 * Ensure the global $post, $wp_scripts, and $wp_styles remain the same after
	 * API data is preloaded.
	 * Because API preloading can call the_content and other filters, plugins
	 * can unexpectedly modify the global $post or enqueue assets which are not
	 * intended for the block editor.
	 */
	$backup_global_post = ! empty( $post ) ? clone $post : $post;
	$backup_wp_scripts  = ! empty( $wp_scripts ) ? clone $wp_scripts : $wp_scripts;
	$backup_wp_styles   = ! empty( $wp_styles ) ? clone $wp_styles : $wp_styles;

	$preload_data = array_reduce(
		$preload_paths,
		'rest_preload_api_request',
		[]
	);

	// Restore the global $post, $wp_scripts, and $wp_styles as they were before API preloading.
	$post       = $backup_global_post;
	$wp_scripts = $backup_wp_scripts;
	$wp_styles  = $backup_wp_styles;

	$preload_js = sprintf(
		'wp.apiFetch.use( wp.apiFetch.createPreloadingMiddleware( %s ) );',
		wp_json_encode( $preload_data )
	);

	// The script may have already been printed. In that case, add the pre-loading inline now.
	if ( wp_script_is( 'wp-api-fetch', 'done' ) ) {
		printf(
			'<script>%s</script>',
			$preload_js
		);
	} else {
		wp_enqueue_script( 'wp-api-fetch' );
		wp_add_inline_script(
			'wp-api-fetch',
			$preload_js,
			'after'
		);
	}
}

/**
 * Register any user meta that needs to be exposed.
 */
function register_user_fields(): void {
	// Expose the `_new_email` user meta through the rest api as a custom user field.
	// This is for "The user has a pending email change"
	register_rest_field(
		'user',
		'pending_email',
		[
			'get_callback' => function( $user ) {
				return get_user_meta( $user['id'], '_new_email', true )['newemail'] ?? false;
			},
			'update_callback' => function( $value, $user ) {
				if ( '' === $value ) {
					delete_user_meta( $user->ID, '_new_email' );
					return true;
				}
			},
			'schema' => [
				'type'    => 'string',
				'context' => [ 'edit' ],
			]
		]
	);

}

/**
 * Implement the "Require email confirmation" functionality for the rest api.
 *
 * TODO: This is a core bug. This should be handled by core.
 * TODO: This generates urls to /support/wp-admin/profile.php?newuseremail=%s
 *       bbPress also implements this functionality, through bbp_edit_user_email_send_notification()
 *
 * @param array $insert_data The user data being updated.
 * @return array
 */
function require_email_confirmation( $insert_data, $request ) {
	global $errors;

	if ( isset( $insert_data->user_email ) ) {
		$post_backup = $_POST;

		// The POST fields needed by send_confirmation_on_profile_email().
		$_POST['user_id'] = $insert_data->ID;
		$_POST['email']   = $insert_data->user_email;

		send_confirmation_on_profile_email();

		if ( $_POST['email'] !== $insert_data->user_email || $errors->has_errors() ) {
			$insert_data->user_email = $_POST['email'];
		}

		$_POST = $post_backup;
	}

	return $insert_data;
}