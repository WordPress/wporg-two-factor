<?php
namespace WordPressdotorg\Two_Factor;
use Two_Factor_Totp;
use function WordPressdotorg\Two_Factor\{ after_provider_setup, after_provider_deactivated };

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
			$key = wporg_encrypt( $key, (string) $user_id, 'two-factor' );
		}

		$result = parent::set_user_totp_key( $user_id, (string) $key );

		if ( $result ) {
			after_provider_setup( $user_id, $this );
		}

		return $result;
	}

	/**
	 * Delete the TOTP secret key for a user.
	 *
	 * @param  int $user_id User ID.
	 *
	 * @return boolean If the key was deleted successfully.
	 */
	public function delete_user_totp_key( $user_id ) {
		$result = parent::delete_user_totp_key( $user_id );

		if ( $result ) {
			after_provider_deactivated( $user_id, $this );
		}

		return $result;
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

		if ( $key && function_exists( 'wporg_is_encrypted' ) ) {
			if ( wporg_is_encrypted( $key ) ) {
				$key = (string) wporg_decrypt( $key, (string) $user_id, 'two-factor' );
			} else {
				// Upgrade the key to be encrypted.
				$this->set_user_totp_key( $user_id, $key );
			}
		}

		return $key;
	}
}
