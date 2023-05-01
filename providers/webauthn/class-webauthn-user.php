<?php

namespace WildWolf\WordPress\TwoFactorWebAuthn;

use MadWizard\WebAuthn\Credential\UserHandle;
use MadWizard\WebAuthn\Exception\NotAvailableException;
use MadWizard\WebAuthn\Server\UserIdentityInterface;
use UnexpectedValueException;
use WP_User;
use wpdb;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery -- there is no other way to access our own tables

class WebAuthn_User implements UserIdentityInterface {
	public const CACHE_GROUP_NAME = '2fa-webauthn';

	private WP_User $user;

	public static function get_for( WP_User $user ): self {
		return new self( $user );
	}

	private function __construct( WP_User $user ) {
		$this->user = $user;
	}

	/**
	 * @throws NotAvailableException
	 * @global wpdb $wpdb
	 */
	public function getUserHandle(): UserHandle {
		/** @var wpdb $wpdb */
		global $wpdb;

		$key = sprintf( 'handle:%u', $this->user->ID );
		/** @var mixed */
		$handle = wp_cache_get( $key, self::CACHE_GROUP_NAME );
		if ( false === $handle || ! is_string( $handle ) ) {
			$handle = $wpdb->get_var( $wpdb->prepare( "SELECT user_handle FROM {$wpdb->webauthn_users} WHERE user_id = %d", $this->user->ID ) );
			if ( ! $handle ) {
				$handle = UserHandle::random()->toString();
				$result = $wpdb->insert(
					$wpdb->webauthn_users,
					[
						'user_id'     => $this->user->ID,
						'user_handle' => $handle,
					],
					[ '%d', '%s' ]
				);

				if ( false === $result ) {
					throw new UnexpectedValueException( __( 'Unable to save the user handle to the database.', 'two-factor-provider-webauthn' ) );
				}
			}

			wp_cache_set( $key, $handle, self::CACHE_GROUP_NAME, 3600 );
		}

		return UserHandle::fromString( $handle );
	}

	public function getUsername(): string {
		return $this->user->user_login;
	}

	public function getDisplayName(): string {
		return $this->user->display_name;
	}

	/**
	 * @global wpdb $wpdb
	 */
	public static function get_user_by_handle( UserHandle $handle ): ?WP_User {
		/** @var wpdb $wpdb */
		global $wpdb;

		$key = sprintf( 'user:%s', $handle->toString() );
		/** @var mixed */
		$user_id = wp_cache_get( $key, self::CACHE_GROUP_NAME );
		if ( false === $user_id || ! is_int( $user_id ) ) {
			/** @psalm-var numeric-string|null $user_id */
			$user_id = $wpdb->get_var( $wpdb->prepare( "SELECT user_id FROM {$wpdb->webauthn_users} WHERE user_handle = %s", $handle->toString() ) );
			wp_cache_set( $key, (int) $user_id, self::CACHE_GROUP_NAME, 3600 );
		}

		return $user_id ? new WP_User( (int) $user_id ) : null;
	}
}
