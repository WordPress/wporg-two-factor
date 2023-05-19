<?php
namespace WordPressdotorg\Two_Factor;
use TwoFactor_Provider_WebAuthn, Two_Factor_Core;

/**
 * Extends the TwoFactor_Provider_WebAuthn class for WordPress.org needs.
 */
class WPORG_TwoFactor_Provider_WebAuthn extends TwoFactor_Provider_WebAuthn {
	/**
	 * Use the parent class as the "key" in the Two Factor UI.
	 */
	public function get_key() {
		return parent::class;
	}

	/**
	 * Override the parent constructor to allow for adding filters early.
	 *
	 * This would be ideal as a `__construct()` method, but the parent is final and $instance is private.
	 */
	public static function get_instance() {
		static $instance = false;
		if ( ! $instance ) {
			$instance = new static();
		}

		// Add the custom filters needed for this class
		static $filters_added = false;
		if ( ! $filters_added ) {
			$filters_added = true;

			$instance->_add_filters();
		}

		return $instance;
	}

	/**
	 * Check if the provider is available for the given user.
	 *
	 * This method includes caching for WordPress.org, as it's called on most pageloads.
	 */
	public function is_available_for_user( $user ) {
		$is_available = wp_cache_get( 'webauthn:' . $user->ID, 'users', false, $found );
		if ( $found ) {
			return $is_available;
		}

		$is_available = parent::is_available_for_user( $user );

		wp_cache_set( 'webauthn:' . $user->ID, $is_available, 'users', HOUR_IN_SECONDS );

		return $is_available;
	}

	/**
	 * See https://github.com/sjinks/wp-two-factor-provider-webauthn/pull/468
	 *
	 * @return string
	 */
	public function get_alternative_provider_label() {
		return __( 'Use your security key', 'wporg-two-factor' );
	}

	/**
	 * Add some filters to watch for WebAuthn events.
	 */
	public function _add_filters() {
		// Clear the cache when a user is updated.
		add_action( 'wp_ajax_webauthn_preregister', [ $this, '_webauthn_ajax_request' ], 1 );
		add_action( 'wp_ajax_webauthn_register',    [ $this, '_webauthn_ajax_request' ], 1 );
		add_action( 'wp_ajax_webauthn_delete_key',  [ $this, '_webauthn_ajax_request' ], 1 );
		add_action( 'wp_ajax_webauthn_rename_key',  [ $this, '_webauthn_ajax_request' ], 1 );

		// Disable the admin UI if it needs revalidation.
		add_action( 'show_user_security_settings', [ $this, '_show_user_security_settings' ], -1 );
	}

	/**
	 * Force the user to revalidate their 2FA if they're updating their WebAuthn keys.
	 *
	 * This is pending an upstream PR for the revalidation.
	 */
	public function _webauthn_ajax_request() {
		// Check the users session is still active and 2FA revalidation isn't required.
		if ( ! Two_Factor_Core::current_user_can_update_two_factor_options() ) {
			wp_send_json_error( 'Your session has expired. Please refresh the page and try again.' );
		}

		// Clear the caches for this class after the request is finished.
		add_action( 'shutdown', [ $this, '_clear_cache' ] );
	}

	/**
	 * Wrap the additional providers in a disabled fieldset if the user needs to revalidate.
	 *
	 * This is pending an upstream PR.
	 */
	public function _show_user_security_settings() {
		$show_2fa_options = Two_Factor_Core::current_user_can_update_two_factor_options();
		if ( ! $show_2fa_options ) {
			// TODO: Perhaps the Core UI should extend it's `<fieldset>` to wrap the additional providers?
			echo '<fieldset disabled="disabled">';
			add_action( 'show_user_security_settings', function() { echo '</fieldset>'; }, 1001 );
		}
	}

	public function _clear_cache() {
		wp_cache_delete( 'webauthn:' . get_current_user_id(), 'users' );
	}
}
