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

		// Generate an encryption key for testing with.
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
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_EMAIL_ENABLED_META );
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACT_META );
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACT_PENDING_META );
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
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_email_opt_in
	 */
	public function test_email_opt_in_requires_auth() : void {
		wp_set_current_user( 0 );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/email-opt-in', [
			'user_id' => self::$regular_user->ID,
		] );

		$this->assertArrayHasKey( 'code', $actual );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_email_opt_in
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_email_opt_out
	 */
	public function test_email_opt_in_and_out() : void {
		wp_set_current_user( self::$regular_user->ID, self::$regular_user->user_login );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/email-opt-in', [
			'user_id' => self::$regular_user->ID,
		] );

		$this->assertArrayHasKey( 'success', $actual );
		$this->assertTrue( $actual['success'] );
		$this->assertTrue( WordPressdotorg\Two_Factor\Recovery\is_recovery_email_enabled( self::$regular_user->ID ) );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/email-opt-out', [
			'user_id' => self::$regular_user->ID,
		] );

		$this->assertArrayHasKey( 'success', $actual );
		$this->assertTrue( $actual['success'] );
		$this->assertFalse( WordPressdotorg\Two_Factor\Recovery\is_recovery_email_enabled( self::$regular_user->ID ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_create_recovery_request
	 */
	public function test_create_recovery_request_via_api() : void {
		WordPressdotorg\Two_Factor\Recovery\enable_recovery_email( self::$regular_user->ID );

		// Public endpoint - no auth needed.
		wp_set_current_user( 0 );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/request', [
			'user_login' => self::$regular_user->user_login,
			'type'       => 'email',
		] );

		$this->assertArrayHasKey( 'success', $actual );
		$this->assertTrue( $actual['success'] );
		$this->assertArrayHasKey( 'token', $actual );
		$this->assertArrayHasKey( 'available_at', $actual );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_create_recovery_request
	 */
	public function test_create_recovery_request_invalid_user() : void {
		wp_set_current_user( 0 );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/request', [
			'user_login' => 'nonexistent_user_xyz',
			'type'       => 'email',
		] );

		// Should return a vague error for security.
		$this->assertArrayHasKey( 'code', $actual );
		$this->assertSame( 'recovery_failed', $actual['code'] );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_cancel_recovery
	 */
	public function test_cancel_recovery_via_api() : void {
		WordPressdotorg\Two_Factor\Recovery\enable_recovery_email( self::$regular_user->ID );

		wp_set_current_user( 0 );

		$create = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/request', [
			'user_login' => self::$regular_user->user_login,
			'type'       => 'email',
		] );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/cancel', [
			'user_id' => self::$regular_user->ID,
			'token'   => $create['token'],
		] );

		$this->assertArrayHasKey( 'success', $actual );
		$this->assertTrue( $actual['success'] );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_recovery_status
	 */
	public function test_recovery_status_via_api() : void {
		WordPressdotorg\Two_Factor\Recovery\enable_recovery_email( self::$regular_user->ID );

		wp_set_current_user( 0 );

		$create = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/request', [
			'user_login' => self::$regular_user->user_login,
			'type'       => 'email',
		] );

		$actual = $this->api_request( 'GET', '/wporg-two-factor/1.0/recovery/status', [
			'user_id' => self::$regular_user->ID,
			'token'   => $create['token'],
		] );

		$this->assertArrayHasKey( 'type', $actual );
		$this->assertSame( 'email', $actual['type'] );
		$this->assertSame( 'pending', $actual['status'] );
		$this->assertFalse( $actual['is_ready'] );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_designate_contact
	 */
	public function test_designate_contact_via_api() : void {
		$this->enable_2fa_for_user( self::$contact_user->ID );
		wp_set_current_user( self::$regular_user->ID, self::$regular_user->user_login );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/designate-contact', [
			'user_id'       => self::$regular_user->ID,
			'contact_login' => self::$contact_user->user_login,
		] );

		$this->assertArrayHasKey( 'success', $actual );
		$this->assertTrue( $actual['success'] );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_designate_contact
	 */
	public function test_designate_contact_no_2fa() : void {
		wp_set_current_user( self::$regular_user->ID, self::$regular_user->user_login );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/designate-contact', [
			'user_id'       => self::$regular_user->ID,
			'contact_login' => self::$contact_user->user_login,
		] );

		$this->assertArrayHasKey( 'code', $actual );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_remove_contact
	 */
	public function test_remove_contact_via_api() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACT_META, self::$contact_user->ID );

		wp_set_current_user( self::$regular_user->ID, self::$regular_user->user_login );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/remove-contact', [
			'user_id' => self::$regular_user->ID,
		] );

		$this->assertArrayHasKey( 'success', $actual );
		$this->assertTrue( $actual['success'] );
		$this->assertNull( WordPressdotorg\Two_Factor\Recovery\get_designated_contact( self::$regular_user->ID ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\rest_complete_recovery
	 */
	public function test_complete_recovery_via_api() : void {
		$this->enable_2fa_for_user( self::$regular_user->ID );
		WordPressdotorg\Two_Factor\Recovery\enable_recovery_email( self::$regular_user->ID );

		wp_set_current_user( 0 );

		$create = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/request', [
			'user_login' => self::$regular_user->user_login,
			'type'       => 'email',
		] );

		// Set available_at to the past.
		$stored = WordPressdotorg\Two_Factor\Recovery\get_pending_recovery( self::$regular_user->ID );
		$stored['available_at'] = time() - 1;
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_REQUEST_META, $stored );

		$actual = $this->api_request( 'POST', '/wporg-two-factor/1.0/recovery/complete', [
			'user_id' => self::$regular_user->ID,
			'token'   => $create['token'],
		] );

		$this->assertArrayHasKey( 'success', $actual );
		$this->assertTrue( $actual['success'] );
		$this->assertFalse( Two_Factor_Core::is_user_using_two_factor( self::$regular_user->ID ) );
	}
}
