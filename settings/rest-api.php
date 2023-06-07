<?php

namespace WordPressdotorg\Two_Factor;
use Two_Factor_Core, Two_Factor_Totp, Two_Factor_Backup_Codes;
use WildWolf\WordPress\TwoFactorWebAuthn\{ WebAuthn_Credential_Store };
use WP_REST_Server, WP_REST_Request;

defined( 'WPINC' ) || die();

add_action( 'rest_api_init', __NAMESPACE__ . '\register_rest_routes' );
add_action( 'rest_api_init', __NAMESPACE__ . '\register_user_fields' );
add_filter( 'rest_pre_insert_user', __NAMESPACE__ . '\require_email_confirmation', 10, 2 );

/**
 * Register/Output some REST-API calls to be pre-loaded.
 *
 * This prevents the browser having to make the HTTP call before the React UI can be ready.
 * This duplicates block_editor_rest_api_preload() as there is no generic function for performing this preloading.
 * WARNING: This will output Javascript immediately if called during the page load if the wp-api-fetch script has already been output.
 *
 * @codeCoverageIgnore
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
 * Register the rest-api endpoints required for this provider.
 */
function register_rest_routes() : void {
	register_rest_route(
		'wporg-two-factor/1.0',
		'/totp-setup',
		array(
			'methods'  => WP_REST_Server::READABLE,
			'callback' => __NAMESPACE__ . '\rest_get_totp_setup',
			'permission_callback' => function( $request ) {
				return current_user_can( 'edit_user', $request['user_id'] );
			},
			'args' => array(
				'user_id' => array(
					'required' => true,
					'type'     => 'number',
				),
			),
		),
	);
}

/**
 * Rest API endpoint for supplying data needed to set up TOTP.
 */
function rest_get_totp_setup( WP_REST_Request $request ) : array {
	$user_id = absint( $request['user_id'] );
	$user    = get_user_by( 'id', $user_id );
	$key     = Two_Factor_Totp::generate_key();

	return array(
		'secret_key'  => $key,
		'qr_code_url' => Two_Factor_Totp::generate_qr_code_url( $user, $key ),
	);
}

/**
 * Register any user meta that needs to be exposed.
 *
 * @codeCoverageIgnore
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

	register_rest_field(
		'user',
		'2fa_required',
		[
			'get_callback' => function( $user ) {
				return user_requires_2fa( get_userdata( $user['id'] ) );
			},
			'schema' => [
				'type'    => 'boolean',
				'context' => [ 'edit' ],
			]
		]
	);

	// Available providers are enabled _and_ configured.
	register_rest_field(
		'user',
		'2fa_available_providers',
		[
			'get_callback' => function( $user ) {
				return array_keys( Two_Factor_Core::get_available_providers_for_user( get_userdata( $user['id'] ) ) );
			},
			'schema' => [
				'type'    => 'array',
				'context' => [ 'edit' ],
			]
		]
	);

	register_rest_field(
		'user',
		'2fa_primary_provider',
		[
			'get_callback' => function( $user ) {
				$provider = Two_Factor_Core::get_primary_provider_for_user( get_userdata( $user['id'] ) );

				return is_a( $provider, 'Two_Factor_Provider' ) ? $provider->get_key() : null;
			},
			'schema' => [
				'type'    => 'array',
				'context' => [ 'edit' ],
			]
		]
	);

	register_rest_field(
		'user',
		'2fa_backup_codes_remaining',
		[
			'get_callback' => function( $user ) {
				return Two_Factor_Backup_Codes::codes_remaining_for_user( get_userdata( $user['id'] ) );
			},
			'schema' => [
				'type'    => 'int',
				'context' => [ 'edit' ],
			],
		]
	);

	register_rest_field(
		'user',
		'2fa_revalidation',
		[
			'get_callback' => function() {
				/*
				 * Note: This field is always about the authenticated user, NOT the user being requested.
				 *       This should likely be it's own endpoint, but it's here for now, to ensure that
				 *       when an admin is editing other users, they get prompted to update their 2FA as well.
				 */

				$last_validated = Two_Factor_Core::is_current_user_session_two_factor();
				if ( ! $last_validated ) {
					return false;
				}

				$revalidate_url = Two_Factor_Core::get_user_two_factor_revalidate_url( true );
				$expiry         = apply_filters( 'two_factor_revalidate_time', 10 * MINUTE_IN_SECONDS, get_current_user_id(), '' );
				$expires_at     = $last_validated + $expiry;

				return compact( 'revalidate_url', 'expires_at' );
			},
			'schema' => [
				'type'    => 'array',
				'context' => [ 'edit' ],
			],
		]
	);

	register_rest_field(
		'user',
		'2fa_webauthn_keys',
		[
			'get_callback' => function( $user ) {
				$keys = WebAuthn_Credential_Store::get_user_keys( get_userdata( $user['id'] ) );

				array_walk( $keys, function( & $key ) {
					$key->delete_nonce = wp_create_nonce( 'delete-key_' . $key->credential_id );

					// Remove unnecessary data.
					$key = array_intersect_key( (array) $key, array_flip( [ 'id', 'credential_id', 'name', 'delete_nonce' ] ) );
				} );

				return $keys;
			},
			'schema' => [
				'type'    => 'array',
				'context' => [ 'edit' ],
			],
		]
	);

	register_rest_field(
		'user',
		'2fa_webauthn_register_nonce',
		[
			'get_callback' => function( $user ) {
				return wp_create_nonce( "webauthn-register_key_{$user[ 'id' ]}" );
			},
			'schema' => [
				'type'    => 'array',
				'context' => [ 'edit' ],
			],
		]
	);

}

/**
 * Implement the "Require email confirmation" functionality for the REST API.
 *
 * TODO: This is a core bug. This should be handled by core.
 * TODO: This should be moved to a WordPress.org mu-plugin.
 * TODO: This generates urls to /support/wp-admin/profile.php?newuseremail=%s
 *       bbPress also implements this functionality, through bbp_edit_user_email_send_notification()
 *
 * @codeCoverageIgnore
 *
 * @param array $insert_data The user data being updated.
 * @return array
 */
function require_email_confirmation( $insert_data, $request ) {
	global $errors;

	if ( isset( $insert_data->user_email ) ) {
		$post_backup = $_POST;

		// Switch out the core wp-admin confirmation url with bbPress's.
		if ( function_exists( 'bbp_get_user_profile_edit_url' ) ) {
			add_filter( 'new_user_email_content', function( $email_text ) {
				$user_hash   = get_user_meta( $_POST['user_id'], '_new_email', true );
				$confirm_url = add_query_arg(
					[
						'action'       => 'bbp-update-user-email',
						'newuseremail' => $user_hash['hash']
					],
					bbp_get_user_profile_edit_url( $_POST['user_id'] )
				);

				$email_text = str_replace(
					'###ADMIN_URL###',
					esc_url_raw( $confirm_url ),
					$email_text
				);

				return $email_text;
			} );
		}

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
