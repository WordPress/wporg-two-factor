<?php

use function WordPressdotorg\Two_Factor\{ user_requires_2fa };
use function WordPressdotorg\MU_Plugins\Encryption\{ generate_encryption_key };

defined( 'WPINC' ) || die();

class Test_WPorg_Two_Factor extends WP_UnitTestCase {
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

		// Generate an encryption key for testing with.
		if ( ! function_exists( 'wporg_encryption_keys' ) ) {
			function wporg_encryption_keys() {
				static $keys = null;

				return $keys ?? $keys = [
					'two-factor' => generate_encryption_key(),
				];
			}
		}
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
	 * @covers WordPressdotorg\Two_Factor\two_factor_providers
	 */
	public function test_two_factor_providers() : void {
		$actual = Two_Factor_Core::get_providers();

		$this->assertArrayHasKey( 'Two_Factor_Totp', $actual );
		$this->assertArrayHasKey( 'Two_Factor_Backup_Codes', $actual );
		// @todo enable after https://github.com/WordPress/two-factor/issues/427 merges
		//$this->assertArrayHasKey( 'Two_Factor_WebAuthn', $actual );

		$this->assertArrayNotHasKey( 'Two_Factor_Email', $actual );
		$this->assertArrayNotHasKey( 'Two_Factor_Dummy', $actual );
	}

	/**
	 * Enable a 2FA provider on the given user.
	 */
	protected function enable_2fa_for_user( int $user_id ) : void {
		// This should start counting at one instead of zero, to match `Two_Factor_Core`.
		update_user_meta( $user_id, Two_Factor_Core::ENABLED_PROVIDERS_USER_META_KEY, array( 1 => 'Two_Factor_Totp' ) );
		update_user_meta( $user_id, Two_Factor_Core::PROVIDER_USER_META_KEY, 'Two_Factor_Totp' );
		update_user_meta( $user_id, Two_Factor_Totp::SECRET_META_KEY, 'foo bar bax quiz' );

		$this->assertTrue( Two_Factor_Core::is_user_using_two_factor( $user_id ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\remove_super_admins_until_2fa_enabled
	 */
	public function test_super_admin_removed_when_2fa_not_enabled() : void {
		global $mock_is_special_user, $super_admins;
		$mock_is_special_user = array( self::$privileged_user->ID );
		$super_admins[]       = self::$privileged_user->user_login;

		$this->assertTrue( is_super_admin( self::$privileged_user->ID ) );
		$this->assertTrue( user_requires_2fa( self::$privileged_user ) );
		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login ); // Triggers remove_super_admins_until_2fa_enabled().
		$this->assertFalse( is_super_admin( self::$privileged_user->ID ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\remove_super_admins_until_2fa_enabled
	 */
	public function test_super_admin_maintained_when_2fa_enabled() : void {
		global $mock_is_special_user, $super_admins;
		$mock_is_special_user = array( self::$privileged_user->ID );
		$super_admins[]       = self::$privileged_user->user_login;

		$this->assertTrue( is_super_admin( self::$privileged_user->ID ) );
		$this->assertTrue( user_requires_2fa( self::$privileged_user ) );
		self::enable_2fa_for_user( self::$privileged_user->ID );
		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login ); // Triggers remove_super_admins_until_2fa_enabled().
		$this->assertTrue( is_super_admin( self::$privileged_user->ID ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\remove_capabilities_until_2fa_enabled
	 */
	public function test_caps_removed_when_2fa_not_enabled() : void {
		global $mock_is_special_user, $super_admins;
		$mock_is_special_user = array( self::$privileged_user->ID );
		$super_admins[]       = self::$privileged_user->user_login;

		$this->assertTrue( is_super_admin( self::$privileged_user->ID ) );
		$this->assertTrue( user_requires_2fa( self::$privileged_user ) );
		$this->assertFalse( Two_Factor_Core::is_user_using_two_factor( self::$privileged_user->ID ) );

		wp_set_current_user( self::$privileged_user->ID ); // Triggers `remove_super_admins_until_2fa_enabled()`.
		$this->assertFalse( is_super_admin( self::$privileged_user->ID ) );
		$this->assertFalse( user_can( self::$privileged_user, 'manage_network' ) ); // Triggers `remove_capabilities_until_2fa_enabled()`.
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\remove_capabilities_until_2fa_enabled
	 */
	public function test_caps_maintained_when_2fa_enabled() : void {
		global $mock_is_special_user, $super_admins;
		$mock_is_special_user = array( self::$privileged_user->ID );
		$super_admins[]       = self::$privileged_user->user_login;

		self::enable_2fa_for_user( self::$privileged_user->ID );
		$this->assertTrue( is_super_admin( self::$privileged_user->ID ) );
		$this->assertTrue( user_requires_2fa( self::$privileged_user ) );

		wp_set_current_user( self::$privileged_user->ID ); // Triggers `remove_super_admins_until_2fa_enabled()`.
		$this->assertTrue( user_can( self::$privileged_user, 'manage_network' ) ); // Triggers `remove_capabilities_until_2fa_enabled()`.
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\user_requires_2fa
	 */
	public function test_user_requires_2fa() : void {
		$cases = $this->data_user_requires_2fa();

		foreach ( $cases as $case ) {
			$GLOBALS[ $case['global_name'] ] = $case['global_value'];

			$this->assertTrue( user_requires_2fa( self::$privileged_user ) );
			$this->assertFalse( user_requires_2fa( self::$regular_user ) );

			$GLOBALS[ $case['global_name'] ] = array();
		}
	}

	/**
	 * This isn't a formal `@dataProvider` because those are executed before `wpSetUpBeforeClass()`,
	 * but this needs to access variables created during that method.
	 *
	 * @link https://stackoverflow.com/a/42161440/450127
	 */
	public function data_user_requires_2fa() : array {
		return array(
			'is special user' => array(
				'global_name'  => 'mock_is_special_user',
				'global_value' => array( self::$privileged_user->ID ),
			),

			'wordcamp trusted deputies' => array(
				'global_name'  => 'trusted_deputies',
				'global_value' => array( self::$privileged_user->ID ),
			),

			'wordcamp subroles' => array(
				'global_name'  => 'wcorg_subroles',
				'global_value' => array(
					self::$privileged_user->ID => array( 'wordcamp_wrangler' ),
				),
			),
		);
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\user_requires_2fa
	 */
	public function test_invalid_user_doesnt_require_2fa() : void {
		$this->assertFalse( user_requires_2fa( false ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\redirect_to_2fa_settings
	 */
	public function test_redirected_when_2fa_needed() {
		global $mock_is_special_user, $super_admins;
		$mock_is_special_user = array( self::$privileged_user->ID );
		$super_admins[]       = self::$privileged_user->user_login;

		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login );
		$expected = sprintf( 'https://wordpress.org/support/users/%s/edit/account/', self::$privileged_user->user_nicename );
		$actual   = apply_filters( 'login_redirect', admin_url(), admin_url(), self::$privileged_user );

		$this->assertTrue( user_requires_2fa( self::$privileged_user ) );
		$this->assertFalse( Two_Factor_Core::is_user_using_two_factor( self::$privileged_user->ID ) );
		$this->assertSame( $expected, $actual );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\redirect_to_2fa_settings
	 */
	public function test_not_redirected_when_2fa_not_needed() {
		global $mock_is_special_user, $super_admins;

		$expected = admin_url();

		$actual = apply_filters( 'login_redirect', $expected, $expected, new WP_Error() );
		$this->assertSame( $expected, $actual );

		$actual = apply_filters( 'login_redirect', $expected, $expected, self::$regular_user );
		$this->assertSame( $expected, $actual );

		// User requires 2fa and has it enabled.
		$mock_is_special_user = array( self::$privileged_user->ID );
		$super_admins[]       = self::$privileged_user->user_login;
		$this->enable_2fa_for_user( self::$privileged_user->ID );
		wp_set_current_user( self::$privileged_user->ID, self::$privileged_user->user_login );
		$actual = apply_filters( 'login_redirect', $expected, $expected, self::$privileged_user);
		$this->assertSame( $expected, $actual );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\set_primary_provider_for_user
	 */
	public function test_set_primary_provider_for_user() {
		// Set backup codes as primary.
		$backup_codes_provider = Two_Factor_Backup_Codes::get_instance();
		$backup_codes_provider->generate_codes( self::$regular_user );
		$enabled = Two_Factor_Core::enable_provider_for_user( self::$regular_user->ID, 'Two_Factor_Backup_Codes' );

		$expected = null;
		$actual   = Two_Factor_Core::get_primary_provider_for_user( self::$regular_user->ID );
		$this->assertTrue( $enabled );
		$this->assertSame( $expected, $actual );

		// Enable TOTP (as secondary).
		$totp_provider = Two_Factor_Core::get_providers()['Two_Factor_Totp'];
		$totp_provider->set_user_totp_key( self::$regular_user->ID, $totp_provider->generate_key() );
		$enabled       = Two_Factor_Core::enable_provider_for_user( self::$regular_user->ID, 'Two_Factor_Totp' );
		$this->assertTrue( $enabled );

		// Validate that the TOTP key was stored in an encrypted form.
		$totp_key       = $totp_provider->get_user_totp_key( self::$regular_user->ID );
		$totp_user_meta = get_user_meta( self::$regular_user->ID, $totp_provider::SECRET_META_KEY, true );
		$this->assertNotSame( $totp_key, $totp_user_meta );

		// Validate that TOTP is now the primary provider.
		$provider       = Two_Factor_Core::get_primary_provider_for_user( self::$regular_user->ID );
		$expected_class = 'WordPressdotorg\Two_Factor\Encrypted_Totp_Provider';
		$actual_class   = get_class( $provider );
		$this->assertSame( $expected_class, $actual_class );

		$expected_key = 'Two_Factor_Totp';
		$actual_key   = $provider->get_key();
		$this->assertSame( $expected_key, $provider->get_key() );

		// Validate that Backup Codes are now available as secondary.
		$expected = [ 'Two_Factor_Backup_Codes', 'Two_Factor_Totp' ];
		$actual   = Two_Factor_Core::get_enabled_providers_for_user( self::$regular_user );

		$this->assertSame( $expected, $actual );
	}
}
