<?php

namespace WordPressdotorg\Two_Factor;
use Two_Factor_Core;

defined( 'WPINC' ) || die();

require __DIR__ . '/rest-api.php';

add_action( 'plugins_loaded', __NAMESPACE__ . '\replace_core_ui_with_custom' ); // Must run after Two Factor plugin loaded.
add_action( 'init', __NAMESPACE__ . '\register_block' );
add_action( 'enqueue_block_assets', __NAMESPACE__ . '\maybe_dequeue_stylesheet', 40 );

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
	/*
	 * @todo Temporarily commented so that WebAuthn can be managed via wp-admin. Restore this when our custom WebAuthn UI is ready.
	 * See https://github.com/WordPress/wporg-two-factor/issues/114, https://github.com/WordPress/wporg-two-factor/issues/87.
	 */
	if ( ! is_admin() ) {
		remove_action( 'show_user_profile', array( 'Two_Factor_Core', 'user_two_factor_options' ) );
		remove_action( 'edit_user_profile', array( 'Two_Factor_Core', 'user_two_factor_options' ) );
		remove_action( 'personal_options_update', array( 'Two_Factor_Core', 'user_two_factor_options_update' ) );
		remove_action( 'edit_user_profile_update', array( 'Two_Factor_Core', 'user_two_factor_options_update' ) );
	}

	add_action( 'bbp_user_edit_account', __NAMESPACE__ . '\render_custom_ui' );

	// Add some customizations to the revalidate_2fa page for when it's displayed in an iframe.
	add_action( 'login_footer', __NAMESPACE__ . '\login_footer_revalidate_customizations' );
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

	echo '<div class="notice notice-info notice-alt"><p>This interface and functionality is currently a <em>beta release</em>, while it is currently operational it\'s not yet officially released. Please report any issues you encounter to <a href="https://github.com/WordPress/wporg-two-factor/issues">WordPress/wporg-two-factor on GitHub</a>.</p></div>';

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
 * Print JS and CSS for customizing the interim revalidation iframe.
 *
 * @codeCoverageIgnore
 */
function login_footer_revalidate_customizations() {
	// When the revalidate_2fa page is displayed in an interim login on not-login, add some style and JS handlers.
	if (
		'login.wordpress.org' === $_SERVER['HTTP_HOST'] ||
		empty( $_REQUEST['interim-login'] ) ||
		'revalidate_2fa' !== ( $_REQUEST['action'] ?? '' )
	) {
		return;
	}

	?>
	<style>
		.login-action-revalidate_2fa {
			background: white;
			padding: 0 32px;
		}

		.login-action-revalidate_2fa #login {
			padding: unset;
			width: auto;
		}

		.login-action-revalidate_2fa #login h1,
		.login-action-revalidate_2fa #backtoblog,
		.login-action-revalidate_2fa .two-factor-prompt + br {
			display: none;
		}

		.login-action-revalidate_2fa #login_error {
			box-shadow: none;
			background-color: #f4a2a2;
		}

		.login-action-revalidate_2fa #loginform {
			border: none;
			padding: 0;
			box-shadow: none;
			margin-top: 0;
			overflow: visible;
		}

		.login-action-revalidate_2fa #loginform .button-primary {
			width: 100%;
			float: unset;
		}

		.login-action-revalidate_2fa #login p {
			font-size: 14px;
		}

		.login-action-revalidate_2fa .backup-methods-wrap {
			padding: 0;
		}
	</style>
	<script>
		(function() {
			const loginFormExists  = !! document.querySelector( '#loginform' );
			const loginFormMessage = document.querySelector( '#login .message' )?.textContent || '';

			// If the login no longer exists, let the parent know.
			if ( ! loginFormExists ) {
				window.parent.postMessage( { type: 'reValidationComplete', message: loginFormMessage }, '*' );
			}
		})();
	</script>
	<?php
}

/**
 * Only load CSS when the block is actually used.
 *
 * Without this, the CSS will be loaded on every page, but it's only needed on the Account page.
 *
 * @todo this may not be necessary once https://github.com/WordPress/gutenberg/issues/54491 is resolved.
 */
function maybe_dequeue_stylesheet() {
	if ( bbp_get_displayed_user_id() ) {
		return;
	}

	wp_dequeue_style( 'wporg-two-factor-settings-style' );
}
