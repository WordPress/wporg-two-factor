<?php
namespace WordPressdotorg\Two_Factor;
use TwoFactor_Provider_WebAuthn;

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
	 * See https://github.com/sjinks/wp-two-factor-provider-webauthn/pull/468
	 *
	 * @return string
	 */
	public function get_alternative_provider_label() {
		return __( 'Use your security key', 'wporg-two-factor' );
	}
}
