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
		if ( function_exists( 'wporg_encrypt' ) ) {
			$key = wporg_encrypt( $key, 'two-factor' );
		}

		return parent::set_user_totp_key( $user_id, $key );
	}

	/**
	 * When retrieving the key, decrypt it first.
	 *
	 * @param int $user_id User ID.
	 * @return string|false TOTP key, or false if not set.
	 */
	public function get_user_totp_key( $user_id ) {
		$key = parent::get_user_totp_key( $user_id );
		if ( ! $key ) {
			return $key;
		}

		if ( function_exists( 'wporg_maybe_decrypt' ) ) {
			$key = wporg_maybe_decrypt( $key, 'two-factor' );
		}

		return $key;
	}
}
