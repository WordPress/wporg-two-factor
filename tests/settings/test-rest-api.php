<?php

defined( 'WPINC' ) || die();

class Test_WPorg_Two_Factor_Settings_REST_API extends WP_UnitTestCase {
	protected static WP_User $privileged_user;
	protected static WP_User $regular_user;

	/**
	 * Initialize things when class loads.
	 */
	public static function wpSetUpBeforeClass( WP_UnitTest_Factory $factory ) : void {
		// Roles, etc will be assigned dynamically by individual tests.
		self::$privileged_user = $factory->user->create_and_get( array( 'user_login' => 'privileged_user' ) );

		self::$regular_user = $factory->user->create_and_get( array(
			'user_login' => 'regular_user',
			'role'       => 'contributor',
		) );
	}

	/**
	 * Reset things that aren't automatically reset by Core. Runs after each test.
	 */
	public function tear_down() : void {
		parent::tear_down();

		$GLOBALS['super_admins']         = array();
		$GLOBALS['mock_is_special_user'] = array();
	}

	/**
	 * Perform an internal API request.
	 */
	protected function api_request( string $method, string $endpoint, array $params = [] ) : array {
		$request = new WP_REST_Request( $method, $endpoint );
		$request->set_query_params( $params );

		$response = rest_do_request( $request );
		return rest_get_server()->response_to_data( $response, false );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\rest_get_totp_setup
	 * @covers WordPressdotorg\Two_Factor\register_rest_routes
	 */
	public function test_totp_setup_returns_expected_data() : void {
		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login );

		$actual = $this->api_request(
			'GET',
			'/wporg-two-factor/1.0/totp-setup',
			array( 'user_id' => self::$privileged_user->ID )
		);

		$this->assertIsString( $actual['secret_key'] );
		$this->assertGreaterThanOrEqual( 32, strlen( $actual['secret_key'] ) );

		$this->assertIsString( $actual['qr_code_url'] );
		$this->assertStringStartsWith( 'otpauth://totp/', $actual['qr_code_url'] );
	}

	/**
	 * A regular user shouldn't be able to edit another user.
	 *
	 * @covers WordPressdotorg\Two_Factor\rest_get_totp_setup
	 * @covers WordPressdotorg\Two_Factor\register_rest_routes
	 */
	public function test_totp_setup_requires_authorization() : void {
		wp_set_current_user( self::$regular_user->ID, self::$regular_user->user_login );

		$request = new WP_REST_Request( 'GET', '/wporg-two-factor/1.0/totp-setup' );
		$request->set_query_params( array( 'user_id' => self::$privileged_user->ID ) );
		$response = rest_do_request( $request );
		$actual = rest_get_server()->response_to_data( $response, false );

		$this->assertSame( 'rest_forbidden', $actual['code'] );
		$this->assertSame( 403, $actual['data']['status'] );
	}
}
