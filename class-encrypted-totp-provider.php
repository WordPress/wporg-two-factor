<?php
namespace WordPressdotorg\Two_Factor;
use Two_Factor_Totp;

/**
 * Extends the default Two_Factor_Totp class to encrypt the TOTP key.
 */
class Encrypted_Totp_Provider extends Two_Factor_Totp {
	/**
	 * Use the parent class as the "key" in the Two Factor UI.
	 */
	public function get_key() {
		return parent::class;
	}

	/**
	 * When saving the key, encrypt it first.
	 *
	 * @param int    $user_id User ID.
	 * @param string $key     TOTP key.
	 * @return bool True if the key was saved, false otherwise.
	 */
	public function set_user_totp_key( $user_id, $key ) {
		if ( self::encryption_enabled() ) {
			$key = wporg_encrypt( $key, (string) $user_id, 'two-factor' );
		}

		return parent::set_user_totp_key( $user_id, (string) $key );
	}

	/**
	 * When retrieving the key, decrypt it first.
	 *
	 * If the key isn't currently stored encrypted, it's upgraded to encrypted status.
	 *
	 * @param int $user_id User ID.
	 * @return string|false TOTP key, or false if not set.
	 */
	public function get_user_totp_key( $user_id ) {
		$key = parent::get_user_totp_key( $user_id );

		if ( $key && self::encryption_enabled() ) {
			if ( wporg_is_encrypted( $key ) ) {
				$key = (string) wporg_decrypt( $key, (string) $user_id, 'two-factor' );
			} else {
				// Upgrade the key to be encrypted.
				$this->set_user_totp_key( $user_id, $key );
			}
		}

		return $key;
	}

	/**
	 * Test whether encryption is available.
	 */
	private static function encryption_enabled() {
		if ( ! function_exists( 'wporg_is_encrypted' ) ) {
			return false;
		}

		// On local systems, encryption is not enabled if the constant is missing.
		if ( 'local' == wp_get_environment_type() && ! defined( 'WPORG_TWO_FACTOR_ENCRYPTION_KEY' ) ) {
			return false;
		}

		// Else, encryption functions are available, it's not local, or keys are defined.
		return true;
	}
}
