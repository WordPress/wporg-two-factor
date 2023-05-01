<?php

namespace WildWolf\WordPress\TwoFactorWebAuthn;

use InvalidArgumentException;
use MadWizard\WebAuthn\Json\JsonConverter;
use MadWizard\WebAuthn\Server\Registration\RegistrationContext;
use MadWizard\WebAuthn\Server\Registration\RegistrationOptions;
use Throwable;
use UnexpectedValueException;
use WildWolf\Utils\Singleton;
use WP_User;
use wpdb;

final class AJAX {
	use Singleton;

	public const REGISTRATION_CONTEXT_USER_META = Constants::REGISTRATION_CONTEXT_USER_META_KEY;

	private function __construct() {
		$this->admin_init();
	}

	public function admin_init(): void {
		add_action( 'wp_ajax_webauthn_preregister', [ $this, 'wp_ajax_webauthn_preregister' ] );
		add_action( 'wp_ajax_webauthn_register', [ $this, 'wp_ajax_webauthn_register' ] );
		add_action( 'wp_ajax_webauthn_delete_key', [ $this, 'wp_ajax_webauthn_delete_key' ] );
		add_action( 'wp_ajax_webauthn_rename_key', [ $this, 'wp_ajax_webauthn_rename_key' ] );
	}

	private function verify_nonce( string $nonce ): void {
		if ( false === check_ajax_referer( $nonce, false, false ) ) {
			wp_send_json_error( __( 'The nonce has expired. Please reload the page and try again.', 'two-factor-provider-webauthn' ), 400 );
		}
	}

	private function check_registration_nonce( WP_User $user ): void {
		$this->verify_nonce( "webauthn-register_key_{$user->ID}" );
	}

	public function wp_ajax_webauthn_preregister(): void {
		$user = wp_get_current_user();
		$this->check_registration_nonce( $user );

		try {
			$server   = Utils::create_webauthn_server();
			$settings = Settings::instance();

			$reg_options = RegistrationOptions::createForUser( WebAuthn_User::get_for( $user ) );
			$reg_options->setExcludeExistingCredentials( true );
			$reg_options->setUserVerification( $settings->get_user_verification_requirement() );

			if ( $settings->get_authenticator_attachment() ) {
				$reg_options->setAuthenticatorAttachment( $settings->get_authenticator_attachment() );
			}

			if ( $settings->get_timeout() ) {
				$reg_options->setTimeout( $settings->get_timeout() * 1000 );
			}

			$options = $server->startRegistration( $reg_options );

			$context = $options->getContext();
			// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.serialize_serialize
			update_user_meta( $user->ID, self::REGISTRATION_CONTEXT_USER_META, base64_encode( serialize( $context ) ) );
			wp_send_json_success( [
				'options' => $options->getClientOptionsJson(),
				'nonce'   => wp_create_nonce( "webauthn-register_key_{$user->ID}" ),
			] );
		} catch ( Throwable $e ) {
			wp_send_json_error( $e->getMessage() );
		}
	}

	/**
	 * @global wpdb $wpdb
	 */
	public function wp_ajax_webauthn_register(): void {
		$user = wp_get_current_user();
		$this->check_registration_nonce( $user );

		try {
			$server  = Utils::create_webauthn_server();
			$context = (string) get_user_meta( $user->ID, self::REGISTRATION_CONTEXT_USER_META, true );
			/** @var mixed */
			$context = unserialize( base64_decode( $context ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.serialize_unserialize
			if ( ! ( $context instanceof RegistrationContext ) ) {
				throw new UnexpectedValueException( __( 'Unable to retrieve the registration context.', 'two-factor-provider-webauthn' ) );
			}

			// We cannot use WordPress sanitization functions here: the credential must not be altered.
			// We validate that `credential` is a string, valid JSON, and decodes to an object (associative array in terms of PHP).
			// If any of the conditions does not hold, we fail the request.
			// The webauthn-server library performs further validation in accordance with the specification.
			// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
			$credential = $_POST['credential'] ?? null; // Dangerous to sanitize; the code will validate the value
			if ( ! is_string( $credential ) ) {
				throw new InvalidArgumentException( __( 'Bad request.', 'two-factor-provider-webauthn' ) );
			}

			/** @var mixed */
			$credential = json_decode( wp_unslash( $credential ), true, 512, JSON_THROW_ON_ERROR );
			if ( is_array( $credential ) ) {
				$result = $server->finishRegistration(
					JsonConverter::decodeCredential( $credential, 'attestation' ),
					$context
				);

				// phpcs:ignore WordPress.Security.NonceVerification.Missing -- false positive, check_registration_nonce() does that
				$name  = sanitize_text_field( (string) ( $_POST['name'] ?? '' ) );
				$store = new WebAuthn_Credential_Store();
				$key   = $store->save_user_key( $name, $result );
				if ( null === $key ) {
					if ( defined( 'DEBUG_TFPWA' ) && true === constant( 'DEBUG_TFPWA' ) ) {
						/** @var wpdb $wpdb */
						/** @psalm-suppress InvalidGlobal */
						global $wpdb;
						$last_query = $wpdb->last_query;
						$last_error = $wpdb->last_error;

						/** @var string */
						$credential = wp_json_encode( [
							'user_handle'   => $result->getUserHandle()->toString(),
							'credential_id' => $result->getCredentialId()->toString(),
							'public_key'    => $result->getPublicKey()->toString(),
							'counter'       => $result->getSignatureCounter(),
							'name'          => $name ?: __( 'New Key', 'two-factor-provider-webauthn' ),
							'added'         => time(),
							'last_used'     => time(),
							'u2f'           => 0,
						] );

						// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
						error_log( sprintf( 'Unable to save the key to the database. Last query: %s, last error: %s, credential: %s', $last_query, $last_error, $credential ) );
						throw new UnexpectedValueException(
							"Unable to save the key to the database.\n"
							. "Last query: {$last_query}\n"
							. "Last error: {$last_error}\n"
							. "Credential: {$credential}"
						);
					}

					throw new UnexpectedValueException( __( 'Unable to save the key to the database.', 'two-factor-provider-webauthn' ) );
				}

				$table = new Key_Table( $user );
				ob_start();
				$table->single_row( (object) $key );
				$row = ob_get_clean();

				wp_send_json_success( [
					'row'   => $row,
					'nonce' => wp_create_nonce( "webauthn-register_key_{$user->ID}" ),
				] );
			} else {
				throw new InvalidArgumentException( __( 'Bad request.', 'two-factor-provider-webauthn' ) );
			}
		} catch ( Throwable $e ) {
			wp_send_json_error( $e->getMessage(), 400 );
		} finally {
			delete_user_meta( $user->ID, self::REGISTRATION_CONTEXT_USER_META );
		}
	}

	public function wp_ajax_webauthn_delete_key(): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verify_nonce() checks the nonce
		$handle = sanitize_text_field( (string) ( $_POST['handle'] ?? '' ) );
		$this->verify_nonce( "delete-key_{$handle}" );

		$store = new WebAuthn_Credential_Store();
		$store->delete_user_key( wp_get_current_user(), $handle );
		wp_send_json_success();
	}

	public function wp_ajax_webauthn_rename_key(): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verify_nonce() checks the nonce
		$handle = sanitize_text_field( (string) ( $_POST['handle'] ?? '' ) );
		$this->verify_nonce( "rename-key_{$handle}" );

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verify_nonce() checks the nonce
		$name = wp_unslash( sanitize_text_field( (string) ( $_POST['name'] ?? '' ) ) );
		if ( empty( $name ) ) {
			wp_send_json_error( __( 'Key name cannot be empty.', 'two-factor-provider-webauthn' ), 400 );
		}

		$store   = new WebAuthn_Credential_Store();
		$success = $store->rename_key( wp_get_current_user(), $handle, $name );
		if ( $success ) {
			wp_send_json_success( [ 'name' => $name ] );
		}

		wp_send_json_error( __( 'Failed to rename the key.', 'two-factor-provider-webauthn' ), 400 );
	}
}
