<?php

defined( 'WPINC' ) || die();

class Test_WPorg_Two_Factor_Settings_REST_API extends WP_UnitTestCase {
	protected static WP_User $privileged_user;
	protected static WP_User $regular_user;

	/**
	 * A `get_user_metadata` filter used to keep a TOTP secret readable during a test, or null.
	 *
	 * @var callable|null
	 */
	protected $totp_key_filter = null;

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
		if ( $this->totp_key_filter ) {
			remove_filter( 'get_user_metadata', $this->totp_key_filter );
			$this->totp_key_filter = null;
		}

		parent::tear_down();

		$GLOBALS['super_admins']                     = array();
		$GLOBALS['mock_is_special_user']             = array();
		$GLOBALS['wp_rest_application_password_uuid'] = null;
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
	 * Mark a user as actively using TOTP two-factor.
	 *
	 * `Two_Factor_Core::get_available_providers_for_user()` clears the stored TOTP secret as a
	 * side effect in this plugin combination, so a filter keeps the secret readable for the
	 * duration of the test. That's enough for `is_user_using_two_factor()` to report the user as
	 * protected, which is the precondition the revalidation check depends on.
	 */
	protected function enable_totp_for_user( int $user_id ) : void {
		$totp_key = Two_Factor_Totp::generate_key();

		$this->totp_key_filter = function( $value, $object_id, $meta_key ) use ( $totp_key ) {
			if ( Two_Factor_Totp::SECRET_META_KEY === $meta_key ) {
				return array( $totp_key );
			}

			return $value;
		};

		add_filter( 'get_user_metadata', $this->totp_key_filter, 10, 3 );
		Two_Factor_Core::enable_provider_for_user( $user_id, 'Two_Factor_Totp' );
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

	/**
	 * A user who already has two-factor enabled must re-validate their second factor
	 * before they can change provider status. A session that never passed 2FA (e.g. an
	 * Application Password request) has no revalidation timestamp and must be rejected,
	 * otherwise a leaked Application Password could disable 2FA without the second factor.
	 *
	 * @covers WordPressdotorg\Two_Factor\rest_update_provider_status
	 * @covers WordPressdotorg\Two_Factor\register_rest_routes
	 */
	public function test_provider_status_requires_two_factor_revalidation() : void {
		$this->enable_totp_for_user( self::$privileged_user->ID );

		// The session created by wp_set_current_user() never passed 2FA, mirroring an Application Password request.
		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login );
		$this->assertTrue( Two_Factor_Core::is_user_using_two_factor( self::$privileged_user->ID ) );

		$request = new WP_REST_Request( 'POST', '/wporg-two-factor/1.0/provider-status' );
		$request->set_query_params( array(
			'user_id'  => self::$privileged_user->ID,
			'provider' => 'Two_Factor_Totp',
			'status'   => 'disable',
		) );
		$response = rest_do_request( $request );

		$this->assertTrue( $response->is_error() );
		$this->assertSame( 'revalidation_required', $response->as_error()->get_error_code() );
		$this->assertTrue(
			Two_Factor_Core::is_user_using_two_factor( self::$privileged_user->ID ),
			'Two-factor should remain enabled when revalidation is missing.'
		);
	}

	/**
	 * A user who is not yet using two-factor can still enable their first provider,
	 * since revalidation only applies once two-factor is active.
	 *
	 * @covers WordPressdotorg\Two_Factor\rest_update_provider_status
	 * @covers WordPressdotorg\Two_Factor\register_rest_routes
	 */
	public function test_provider_status_allows_initial_enrollment() : void {
		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login );
		$this->assertFalse( Two_Factor_Core::is_user_using_two_factor( self::$privileged_user->ID ) );

		$request = new WP_REST_Request( 'POST', '/wporg-two-factor/1.0/provider-status' );
		$request->set_query_params( array(
			'user_id'  => self::$privileged_user->ID,
			'provider' => 'Two_Factor_Totp',
			'status'   => 'enable',
		) );
		$response = rest_do_request( $request );

		// Revalidation only kicks in once a user is already protected, so enrolling the first provider must be allowed rather than rejected with a 403.
		$this->assertFalse( $response->is_error() );
		$this->assertTrue( rest_get_server()->response_to_data( $response, false ) );
		$this->assertContains(
			'Two_Factor_Totp',
			Two_Factor_Core::get_enabled_providers_for_user( self::$privileged_user->ID )
		);
	}

	/**
	 * An Application Password bypasses the two-factor login prompt, so it must not be able to
	 * change two-factor settings even for a user who has not enabled two-factor yet (where the
	 * revalidation check would otherwise allow it).
	 *
	 * @covers WordPressdotorg\Two_Factor\deny_application_password_two_factor_changes
	 * @covers WordPressdotorg\Two_Factor\rest_update_provider_status
	 */
	public function test_provider_status_blocks_application_passwords() : void {
		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login );
		$this->assertFalse( Two_Factor_Core::is_user_using_two_factor( self::$privileged_user->ID ) );

		// Simulate a request authenticated via an Application Password.
		$GLOBALS['wp_rest_application_password_uuid'] = 'test-application-password-uuid';

		$request = new WP_REST_Request( 'POST', '/wporg-two-factor/1.0/provider-status' );
		$request->set_query_params( array(
			'user_id'  => self::$privileged_user->ID,
			'provider' => 'Two_Factor_Totp',
			'status'   => 'enable',
		) );
		$response = rest_do_request( $request );

		$this->assertTrue( $response->is_error() );
		$this->assertSame( 'application_password_forbidden', $response->as_error()->get_error_code() );
		$this->assertNotContains(
			'Two_Factor_Totp',
			Two_Factor_Core::get_enabled_providers_for_user( self::$privileged_user->ID ),
			'An Application Password must not be able to enroll a two-factor provider.'
		);
	}

	/**
	 * The Application Password guard also covers /generate-svn-password, which sits behind the same
	 * two-factor revalidation gate. Generating an SVN password is part of the committer supply-chain
	 * attack surface, so a leaked Application Password must not be able to trigger it.
	 *
	 * @covers WordPressdotorg\Two_Factor\deny_application_password_two_factor_changes
	 * @covers WordPressdotorg\Two_Factor\register_rest_routes
	 */
	public function test_generate_svn_password_blocks_application_passwords() : void {
		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login );

		// Simulate a request authenticated via an Application Password.
		$GLOBALS['wp_rest_application_password_uuid'] = 'test-application-password-uuid';

		$request = new WP_REST_Request( 'POST', '/wporg-two-factor/1.0/generate-svn-password' );
		$request->set_query_params( array( 'user_id' => self::$privileged_user->ID ) );
		$response = rest_do_request( $request );

		$this->assertTrue( $response->is_error() );
		$this->assertSame( 'application_password_forbidden', $response->as_error()->get_error_code() );
	}

	/**
	 * Verify that the 2fa_available_providers REST field returns an empty array
	 * when backup codes are the only 2FA method.
	 *
	 * @covers WordPressdotorg\Two_Factor\Settings\register_rest_fields
	 */
	public function test_available_providers_field_without_ordinary_provider() {
		wp_set_current_user( self::$regular_user->ID, self::$regular_user->user_login );

		$backup_codes_provider = Two_Factor_Backup_Codes::get_instance();
		$backup_codes_provider->generate_codes( self::$regular_user );
		Two_Factor_Core::enable_provider_for_user( self::$regular_user->ID, 'Two_Factor_Backup_Codes' );

		$request = new WP_REST_Request( 'GET', '/wp/v2/users/' . self::$regular_user->ID );
		$request->set_query_params( [ 'context' => 'edit' ] );
		$response = rest_do_request( $request );
		$data     = rest_get_server()->response_to_data( $response, false );

		$this->assertIsArray( $data['2fa_available_providers'] );
		$this->assertEmpty( $data['2fa_available_providers'] );
	}
}
