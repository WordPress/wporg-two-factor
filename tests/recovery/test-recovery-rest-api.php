<?php

defined( 'WPINC' ) || die();

class Test_WPorg_Two_Factor_Recovery_REST_API extends WP_UnitTestCase {
	protected static WP_User $privileged_user;
	protected static WP_User $regular_user;
	protected static WP_User $contact_user;

	public static function wpSetUpBeforeClass( WP_UnitTest_Factory $factory ) : void {
		self::$privileged_user = $factory->user->create_and_get( [ 'user_login' => 'privileged_rest' ] );
		self::$regular_user    = $factory->user->create_and_get( [ 'user_login' => 'regular_rest', 'role' => 'contributor' ] );
		self::$contact_user    = $factory->user->create_and_get( [ 'user_login' => 'contact_rest', 'role' => 'contributor' ] );

		if ( ! function_exists( 'wporg_encryption_keys' ) ) {
			function wporg_encryption_keys() {
				static $keys = null;
				return $keys ?? $keys = [
					'two-factor' => \WordPressdotorg\MU_Plugins\Encryption\generate_encryption_key(),
				];
			}
		}
	}

	public function tear_down() : void {
		parent::tear_down();

		$GLOBALS['super_admins']         = [];
		$GLOBALS['mock_is_special_user'] = [];

		foreach ( [ self::$privileged_user, self::$regular_user, self::$contact_user ] as $user ) {
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META );
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_PENDING_META );
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_REQUEST_META );
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\DESIGNATED_FOR_META );
			delete_user_meta( $user->ID, Two_Factor_Core::ENABLED_PROVIDERS_USER_META_KEY );
			delete_user_meta( $user->ID, Two_Factor_Core::PROVIDER_USER_META_KEY );
		}
	}

	protected function api_request( string $method, string $endpoint, array $params = [] ) : array {
		$request = new WP_REST_Request( $method, $endpoint );

		if ( 'GET' === $method ) {
			$request->set_query_params( $params );
		} else {
			$request->set_body_params( $params );
		}

		$response = rest_do_request( $request );
		return rest_get_server()->response_to_data( $response, false );
	}

	protected function enable_2fa_for_user( int $user_id ) : void {
		update_user_meta( $user_id, Two_Factor_Core::ENABLED_PROVIDERS_USER_META_KEY, [ 1 => 'Two_Factor_Totp' ] );
		update_user_meta( $user_id, Two_Factor_Core::PROVIDER_USER_META_KEY, 'Two_Factor_Totp' );

		$totp_provider = Two_Factor_Core::get_providers()['Two_Factor_Totp'];
		$totp_provider->set_user_totp_key( $user_id, $totp_provider->generate_key() );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_create_recovery_request
	 */
	public function test_create_recovery_request_via_api() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );

		wp_set_current_user( 0 );

		$nonce = Two_Factor_Core::create_login_nonce( self::$regular_user->ID );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/request', [
			'wp-auth-id'    => self::$regular_user->ID,
			'wp-auth-nonce' => $nonce['key'],
		] );

		$this->assertArrayHasKey( 'success', $actual );
		$this->assertTrue( $actual['success'] );
		// Token must not be exposed in the response -- it is delivered only via email.
		$this->assertArrayNotHasKey( 'token', $actual );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_create_recovery_request
	 */
	public function test_create_recovery_request_rejects_missing_nonce() : void {
		wp_set_current_user( 0 );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/request', [
			'wp-auth-id'    => self::$regular_user->ID,
			'wp-auth-nonce' => 'not-a-real-nonce',
		] );

		$this->assertArrayHasKey( 'code', $actual );
		$this->assertSame( 'recovery_failed', $actual['code'] );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_cancel_recovery
	 */
	public function test_cancel_recovery_via_api() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );

		wp_set_current_user( 0 );

		$create = WordPressdotorg\Two_Factor\Recovery\create_recovery_request( self::$regular_user->ID );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/cancel', [
			'user_id' => self::$regular_user->ID,
			'token'   => $create['owner_token_raw'],
		] );

		$this->assertArrayHasKey( 'success', $actual );
		$this->assertTrue( $actual['success'] );

		// Cancelled state should be preserved (not deleted).
		$pending = WordPressdotorg\Two_Factor\Recovery\get_pending_recovery( self::$regular_user->ID );
		$this->assertSame( 'cancelled', $pending['status'] );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_recovery_status
	 */
	public function test_recovery_status_via_api() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );

		wp_set_current_user( 0 );

		$create = WordPressdotorg\Two_Factor\Recovery\create_recovery_request( self::$regular_user->ID );

		$actual = $this->api_request( 'GET', '/wporg-two-factor/1.0/recovery/status', [
			'user_id' => self::$regular_user->ID,
			'token'   => $create['owner_token_raw'],
		] );

		$this->assertSame( 'pending', $actual['status'] );
		$this->assertFalse( $actual['is_ready'] );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_designate_contact
	 */
	public function test_designate_contact_via_api() : void {
		wp_set_current_user( self::$regular_user->ID, self::$regular_user->user_login );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/designate-contact', [
			'user_id'       => self::$regular_user->ID,
			'contact_login' => self::$contact_user->user_login,
		] );

		$this->assertArrayHasKey( 'success', $actual );
		$this->assertTrue( $actual['success'] );
	}

	/**
	 * Designating a contact should succeed even without 2FA on the contact.
	 * The 2FA check is on acceptance, not designation.
	 *
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_designate_contact
	 */
	public function test_designate_contact_without_2fa_succeeds() : void {
		wp_set_current_user( self::$regular_user->ID, self::$regular_user->user_login );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/designate-contact', [
			'user_id'       => self::$regular_user->ID,
			'contact_login' => self::$contact_user->user_login,
		] );

		$this->assertArrayHasKey( 'success', $actual );
		$this->assertTrue( $actual['success'] );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_remove_contact
	 */
	public function test_remove_contact_via_api() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );

		wp_set_current_user( self::$regular_user->ID, self::$regular_user->user_login );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/remove-contact', [
			'user_id'    => self::$regular_user->ID,
			'contact_id' => self::$contact_user->ID,
		] );

		$this->assertArrayHasKey( 'success', $actual );
		$this->assertTrue( $actual['success'] );
		$this->assertEmpty( WordPressdotorg\Two_Factor\Recovery\get_designated_contacts( self::$regular_user->ID ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_complete_recovery
	 */
	public function test_complete_recovery_via_api() : void {
		$this->enable_2fa_for_user( self::$regular_user->ID );
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );

		wp_set_current_user( 0 );

		$create = WordPressdotorg\Two_Factor\Recovery\create_recovery_request( self::$regular_user->ID );

		// Simulate contact confirmation directly to obtain the completion token.
		$confirm = WordPressdotorg\Two_Factor\Recovery\confirm_contact_recovery(
			self::$regular_user->ID,
			$create['contact_tokens_raw'][ self::$contact_user->ID ],
			self::$contact_user->ID
		);

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/complete', [
			'user_id' => self::$regular_user->ID,
			'token'   => $confirm['completion_token_raw'],
		] );

		$this->assertArrayHasKey( 'success', $actual );
		$this->assertTrue( $actual['success'] );
		$this->assertFalse( Two_Factor_Core::is_user_using_two_factor( self::$regular_user->ID ) );
	}
}
