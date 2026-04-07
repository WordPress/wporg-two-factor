<?php

defined( 'WPINC' ) || die();

class Test_WPorg_Two_Factor_Application_Passwords extends WP_UnitTestCase {
	protected static WP_User $privileged_user;
	protected static WP_User $regular_user;

	/**
	 * Initialize things when class loads.
	 */
	public static function wpSetUpBeforeClass( WP_UnitTest_Factory $factory ) : void {
		self::$privileged_user = $factory->user->create_and_get( array( 'user_login' => 'app_pass_privileged' ) );
		self::$regular_user   = $factory->user->create_and_get( array(
			'user_login' => 'app_pass_regular',
			'role'       => 'contributor',
		) );
	}

	/**
	 * Clean up application passwords after each test.
	 */
	public function tear_down() : void {
		WP_Application_Passwords::delete_all_application_passwords( self::$privileged_user->ID );
		WP_Application_Passwords::delete_all_application_passwords( self::$regular_user->ID );

		parent::tear_down();
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
	 * @covers WordPressdotorg\Two_Factor\register_user_fields
	 */
	public function test_application_passwords_field_returns_empty_array_when_none_exist() : void {
		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login );

		$actual = $this->api_request(
			'GET',
			'/wp/v2/users/' . self::$privileged_user->ID,
			array( 'context' => 'edit' )
		);

		$this->assertArrayHasKey( 'application_passwords', $actual );
		$this->assertSame( array(), $actual['application_passwords'] );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\register_user_fields
	 */
	public function test_application_passwords_field_returns_expected_data() : void {
		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login );

		WP_Application_Passwords::create_new_application_password(
			self::$privileged_user->ID,
			array( 'name' => 'Test App' )
		);

		$actual = $this->api_request(
			'GET',
			'/wp/v2/users/' . self::$privileged_user->ID,
			array( 'context' => 'edit' )
		);

		$this->assertArrayHasKey( 'application_passwords', $actual );
		$this->assertCount( 1, $actual['application_passwords'] );

		$password = $actual['application_passwords'][0];
		$this->assertSame( 'Test App', $password['name'] );
		$this->assertArrayHasKey( 'uuid', $password );
		$this->assertArrayHasKey( 'created', $password );
		$this->assertArrayHasKey( 'last_used', $password );
		$this->assertArrayHasKey( 'last_ip', $password );
		$this->assertNull( $password['last_used'] );
		$this->assertNull( $password['last_ip'] );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\register_user_fields
	 */
	public function test_application_passwords_field_returns_multiple_passwords() : void {
		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login );

		WP_Application_Passwords::create_new_application_password(
			self::$privileged_user->ID,
			array( 'name' => 'App One' )
		);
		WP_Application_Passwords::create_new_application_password(
			self::$privileged_user->ID,
			array( 'name' => 'App Two' )
		);

		$actual = $this->api_request(
			'GET',
			'/wp/v2/users/' . self::$privileged_user->ID,
			array( 'context' => 'edit' )
		);

		$this->assertCount( 2, $actual['application_passwords'] );

		$names = array_column( $actual['application_passwords'], 'name' );
		$this->assertContains( 'App One', $names );
		$this->assertContains( 'App Two', $names );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\register_user_fields
	 */
	public function test_application_passwords_field_returns_iso8601_created_date() : void {
		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login );

		WP_Application_Passwords::create_new_application_password(
			self::$privileged_user->ID,
			array( 'name' => 'Date Test App' )
		);

		$actual = $this->api_request(
			'GET',
			'/wp/v2/users/' . self::$privileged_user->ID,
			array( 'context' => 'edit' )
		);

		$password = $actual['application_passwords'][0];

		// Verify the created date is a valid ISO 8601 string.
		$this->assertNotFalse( strtotime( $password['created'] ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\register_user_fields
	 */
	public function test_application_passwords_field_not_in_view_context() : void {
		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login );

		WP_Application_Passwords::create_new_application_password(
			self::$privileged_user->ID,
			array( 'name' => 'Context Test App' )
		);

		$actual = $this->api_request(
			'GET',
			'/wp/v2/users/' . self::$privileged_user->ID,
			array( 'context' => 'view' )
		);

		$this->assertArrayNotHasKey( 'application_passwords', $actual );
	}

	/**
	 * Verify that a user who is not a member of the current blog can still
	 * revoke their own application password via the REST API.
	 *
	 * @covers WordPressdotorg\Two_Factor\treat_as_member_of_blog
	 */
	public function test_non_member_can_revoke_application_password() : void {
		wp_set_current_user( self::$regular_user->ID, self::$regular_user->user_login );

		list( , $item ) = WP_Application_Passwords::create_new_application_password(
			self::$regular_user->ID,
			array( 'name' => 'Revoke Test' )
		);

		// Remove the user from the current blog to simulate profiles.wordpress.org.
		$remove_user_callback = function( $check, $user_id, $meta_key ) {
			global $wpdb;

			if ( $user_id !== self::$regular_user->ID ) {
				return $check;
			}

			$blog_id          = get_current_blog_id();
			$capabilities_key = $wpdb->base_prefix;
			if ( 1 !== $blog_id ) {
				$capabilities_key .= $blog_id . '_';
			}
			$capabilities_key .= 'capabilities';

			if ( $meta_key !== $capabilities_key ) {
				return $check;
			}

			// Return false wrapped in an array: get_metadata() unwraps one level,
			// yielding false, which fails is_array() in is_user_member_of_blog().
			return array( false );
		};

		add_filter( 'get_user_metadata', $remove_user_callback, 9, 3 );

		$this->assertFalse(
			is_user_member_of_blog( self::$regular_user->ID ),
			'Precondition: user should not be a member of the blog.'
		);

		$request  = new WP_REST_Request( 'DELETE', '/wp/v2/users/' . self::$regular_user->ID . '/application-passwords/' . $item['uuid'] );
		$response = rest_do_request( $request );

		remove_filter( 'get_user_metadata', $remove_user_callback, 9 );

		$this->assertSame( 200, $response->get_status(), 'Non-member should be able to revoke their own application password.' );

		$remaining_passwords = WP_Application_Passwords::get_user_application_passwords( self::$regular_user->ID );
		$remaining_uuids     = wp_list_pluck( $remaining_passwords, 'uuid' );

		$this->assertNotContains(
			$item['uuid'],
			$remaining_uuids,
			'Application password should be removed after revocation.'
		);
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\register_user_fields
	 */
	public function test_application_passwords_field_excludes_sensitive_data() : void {
		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login );

		WP_Application_Passwords::create_new_application_password(
			self::$privileged_user->ID,
			array( 'name' => 'Sensitive Test' )
		);

		$actual = $this->api_request(
			'GET',
			'/wp/v2/users/' . self::$privileged_user->ID,
			array( 'context' => 'edit' )
		);

		$password = $actual['application_passwords'][0];
		$allowed_keys = array( 'uuid', 'name', 'created', 'last_used', 'last_ip' );

		$this->assertSame( $allowed_keys, array_keys( $password ) );
	}
}
