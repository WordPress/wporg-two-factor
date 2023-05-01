<?php

namespace WildWolf\WordPress\TwoFactorWebAuthn;

use MadWizard\WebAuthn\Builder\ServerBuilder;
use MadWizard\WebAuthn\Config\RelyingParty;
use MadWizard\WebAuthn\Server\ServerInterface;

abstract class Utils {
	public static function get_u2f_app_id(): string {
		/** @psalm-var array{host: string, port?: positive-int} */
		$url_parts = wp_parse_url( home_url() );

		if ( ! empty( $url_parts['port'] ) ) {
			return sprintf( 'https://%s:%d', $url_parts['host'], $url_parts['port'] );
		}

		return sprintf( 'https://%s', $url_parts['host'] );
	}

	/**
	 * @psalm-param array<string,mixed> $params
	 */
	public static function render( string $view, array $params = [] ): void {
		/** @psalm-suppress UnresolvableInclude */
		require __DIR__ . '/../views/' . $view . '.php';
	}

	public static function create_webauthn_server(): ServerInterface {
		$builder = new ServerBuilder();
		$builder->setRelyingParty( new RelyingParty( get_bloginfo( 'name' ), self::get_u2f_app_id() ) );
		$builder->setCredentialStore( new WebAuthn_Credential_Store() );
		$builder->enableExtensions( 'appid' );
		return $builder->build();
	}
}
