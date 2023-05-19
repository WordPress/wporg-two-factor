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
}
