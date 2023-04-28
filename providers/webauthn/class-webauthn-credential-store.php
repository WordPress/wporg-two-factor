<?php

namespace WordPressdotorg\Two_Factor;

use MadWizard\WebAuthn\Credential\CredentialId,
	MadWizard\WebAuthn\Credential\CredentialStoreInterface,
	MadWizard\WebAuthn\Credential\UserCredentialInterface,
	MadWizard\WebAuthn\Credential\UserHandle,
	MadWizard\WebAuthn\Crypto\CoseKey,
	MadWizard\WebAuthn\Server\Registration\RegistrationResultInterface;
use WP_User;
use wpdb;

// phpcs:disable WordPress.NamingConventions.ValidVariableName.VariableNotSnakeCase
// phpcs:disable WordPress.DB.DirectDatabaseQuery -- we intentionally do not use cache; otherwise, with a shared memcached server + object cache credentails may leak.

/**
 * @psalm-type CredentialRow = object{id: positive-int, user_handle: string, credential_id: string, public_key: string, counter: numeric-string, name: string, added: numeric-string, last_used: numeric-string, u2f: numeric-string}
 * @psalm-type CredentialRowArray = array{user_handle: string, credential_id: string, public_key: string, counter: int, name: string, added: int, last_used: int, u2f: int}
 */
class WebAuthn_Credential_Store implements CredentialStoreInterface {
	const REGISTERED_KEY_LEGACY_META = '_two_factor_fido_u2f_registered_key'; // Same as \Two_Factor_FIDO_U2F::REGISTERED_KEY_USER_META_KEY, which could be unavailable

	/**
	 * @global wpdb $wpdb
	 * @psalm-return CredentialRow|null
	 */
	public function get_credential_by_id( CredentialId $id ): ?object {
		/** @var wpdb $wpdb */
		global $wpdb;

		/** @psalm-var CredentialRow|null */
		return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->webauthn_credentials} WHERE credential_id = %s", $id->toString() ) );
	}

	public function findCredential( CredentialId $credentialId ): ?UserCredentialInterface {
		$credential = $this->get_credential_by_id( $credentialId );
		if ( $credential ) {
			return new WebAuthn_User_Credential(
				$credentialId,
				CoseKey::fromString( $credential->public_key ),
				UserHandle::fromString( $credential->user_handle )
			);
		}

		return null;
	}

	public function getSignatureCounter( CredentialId $credentialId ): ?int {
		$credential = $this->get_credential_by_id( $credentialId );
		return $credential ? (int) $credential->counter : null;
	}

	/**
	 * @global wpdb $wpdb
	 */
	public function updateSignatureCounter( CredentialId $credentialId, int $counter ): void {
		/** @var wpdb $wpdb */
		global $wpdb;

		$wpdb->update(
			$wpdb->webauthn_credentials,
			[ 'counter' => $counter ],
			[ 'credential_id' => $credentialId->toString() ],
			'%d',
			'%s'
		);
	}

	/**
	 * @global wpdb $wpdb
	 * @return CredentialId[]
	 */
	public function getUserCredentialIds( UserHandle $userHandle ): array {
		/** @var wpdb $wpdb */
		global $wpdb;

		/** @psalm-var object{credential_id: string}[] */
		$ids = $wpdb->get_results( $wpdb->prepare( "SELECT credential_id FROM {$wpdb->webauthn_credentials} WHERE user_handle = %s", $userHandle->toString() ) );
		return array_map( fn ( $c ): CredentialId => CredentialId::fromString( $c->credential_id ), $ids );
	}

	/**
	 * @psalm-return CredentialRow[]
	 * @global wpdb $wpdb
	 */
	public static function get_user_keys( WP_User $user ): array {
		/** @var wpdb $wpdb */
		global $wpdb;

		$handle = WebAuthn_User::get_for( $user )->getUserHandle();
		/** @psalm-var CredentialRow[] $modern */
		$modern = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$wpdb->webauthn_credentials} WHERE user_handle = %s", $handle->toString() ) );
		if ( empty( $modern ) ) {
			/** @var array */
			$legacy = get_user_meta( $user->ID, self::REGISTERED_KEY_LEGACY_META );
			if ( ! empty( $legacy ) ) {
				Credential_Migrator::migrate( $user, $handle );
				/** @psalm-var CredentialRow[] $modern */
				$modern = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$wpdb->webauthn_credentials} WHERE user_handle = %s", $handle->toString() ) );
			}
		}

		return $modern;
	}

	/**
	 * @psalm-return CredentialRowArray|null
	 * @global wpdb $wpdb
	 */
	public function save_user_key( string $key_name, RegistrationResultInterface $result ): ?array {
		/** @var wpdb $wpdb */
		global $wpdb;

		/** @psalm-var CredentialRowArray */
		$credential = [
			'user_handle'   => $result->getUserHandle()->toString(),
			'credential_id' => $result->getCredentialId()->toString(),
			'public_key'    => $result->getPublicKey()->toString(),
			'counter'       => $result->getSignatureCounter(),
			'name'          => $key_name ?: __( 'New Key', 'two-factor-provider-webauthn' ),
			'added'         => time(),
			'last_used'     => time(),
			'u2f'           => 0,
		];

		$result = $wpdb->insert( $wpdb->webauthn_credentials, $credential, [ '%s', '%s', '%s', '%d', '%s', '%d', '%d', '%d' ] );
		return false !== $result ? $credential : null;
	}

	/**
	 * @global wpdb $wpdb
	 */
	public function delete_user_key( WP_User $user, string $credential_id ): void {
		/** @var wpdb $wpdb */
		global $wpdb;

		$handle = WebAuthn_User::get_for( $user )->getUserHandle();
		$wpdb->delete(
			$wpdb->webauthn_credentials,
			[
				'user_handle'   => $handle->toString(),
				'credential_id' => $credential_id,
			],
			[ '%s', '%s' ]
		);
	}

	/**
	 * @global wpdb $wpdb
	 */
	public function update_last_used_date( CredentialId $credentialId, int $when ): void {
		/** @var wpdb $wpdb */
		global $wpdb;

		$wpdb->update(
			$wpdb->webauthn_credentials,
			[ 'last_used' => $when ],
			[ 'credential_id' => $credentialId->toString() ],
			'%d',
			'%s'
		);
	}

	/**
	 * @global wpdb $wpdb
	 */
	public function rename_key( WP_User $user, string $credential_id, string $new_name ): bool {
		/** @var wpdb $wpdb */
		global $wpdb;

		$handle   = WebAuthn_User::get_for( $user )->getUserHandle();
		$affected = $wpdb->update(
			$wpdb->webauthn_credentials,
			[ 'name' => $new_name ],
			[
				'user_handle'   => $handle->toString(),
				'credential_id' => $credential_id,
			],
			'%s',
			'%s'
		);

		return $affected > 0;
	}
}