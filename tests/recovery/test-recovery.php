<?php

use function WordPressdotorg\Two_Factor\Recovery\{
	get_recovery_delay,
	get_allowed_recovery_methods,
	is_recovery_email_enabled,
	enable_recovery_email,
	disable_recovery_email,
	get_designated_contact,
	designate_contact,
	accept_designation,
	decline_designation,
	remove_contact,
	has_pending_recovery,
	get_pending_recovery,
	create_recovery_request,
	cancel_recovery_request,
	confirm_contact_recovery,
	complete_recovery,
	invalidate_recovery_on_login,
	check_recovery_prompt_needed,
};

defined( 'WPINC' ) || die();

class Test_WPorg_Two_Factor_Recovery extends WP_UnitTestCase {
	protected static WP_User $privileged_user;
	protected static WP_User $regular_user;
	protected static WP_User $contact_user;
	protected static WP_User $plugin_user;

	public static function wpSetUpBeforeClass( WP_UnitTest_Factory $factory ) : void {
		self::$privileged_user = $factory->user->create_and_get( [ 'user_login' => 'privileged_recovery' ] );
		self::$regular_user    = $factory->user->create_and_get( [ 'user_login' => 'regular_recovery', 'role' => 'contributor' ] );
		self::$contact_user    = $factory->user->create_and_get( [ 'user_login' => 'contact_recovery', 'role' => 'contributor' ] );
		self::$plugin_user     = $factory->user->create_and_get( [ 'user_login' => 'plugin_recovery', 'role' => 'contributor' ] );

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

		// Clean up recovery meta for all test users.
		foreach ( [ self::$privileged_user, self::$regular_user, self::$contact_user, self::$plugin_user ] as $user ) {
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_EMAIL_ENABLED_META );
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACT_META );
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACT_PENDING_META );
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_REQUEST_META );
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\DESIGNATED_FOR_META );
			delete_user_meta( $user->ID, Two_Factor_Core::ENABLED_PROVIDERS_USER_META_KEY );
			delete_user_meta( $user->ID, Two_Factor_Core::PROVIDER_USER_META_KEY );
		}
	}

	/**
	 * Enable 2FA for a user.
	 */
	protected function enable_2fa_for_user( int $user_id ) : void {
		update_user_meta( $user_id, Two_Factor_Core::ENABLED_PROVIDERS_USER_META_KEY, [ 1 => 'Two_Factor_Totp' ] );
		update_user_meta( $user_id, Two_Factor_Core::PROVIDER_USER_META_KEY, 'Two_Factor_Totp' );

		$totp_provider = Two_Factor_Core::get_providers()['Two_Factor_Totp'];
		$totp_provider->set_user_totp_key( $user_id, $totp_provider->generate_key() );

		$this->assertTrue( Two_Factor_Core::is_user_using_two_factor( $user_id ) );
	}

	// --- Recovery Delay Tests ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\get_recovery_delay
	 */
	public function test_get_recovery_delay_regular_user() : void {
		$this->assertSame( DAY_IN_SECONDS, get_recovery_delay( self::$regular_user ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\get_recovery_delay
	 */
	public function test_get_recovery_delay_plugin_committer() : void {
		self::$plugin_user->has_plugins = true;

		$this->assertSame( 3 * DAY_IN_SECONDS, get_recovery_delay( self::$plugin_user ) );

		unset( self::$plugin_user->has_plugins );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\get_recovery_delay
	 */
	public function test_get_recovery_delay_high_usage_plugin_committer() : void {
		self::$plugin_user->has_plugins = true;

		add_filter( 'wporg_2fa_user_has_high_active_installs', '__return_true' );
		$this->assertSame( 7 * DAY_IN_SECONDS, get_recovery_delay( self::$plugin_user ) );
		remove_filter( 'wporg_2fa_user_has_high_active_installs', '__return_true' );

		unset( self::$plugin_user->has_plugins );
	}

	// --- Allowed Methods Tests ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\get_allowed_recovery_methods
	 */
	public function test_get_allowed_methods_regular_user() : void {
		$this->assertSame( [ 'email', 'contact' ], get_allowed_recovery_methods( self::$regular_user ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\get_allowed_recovery_methods
	 */
	public function test_get_allowed_methods_super_admin() : void {
		global $super_admins, $mock_is_special_user;
		$mock_is_special_user = [ self::$privileged_user->ID ];
		$super_admins[]       = self::$privileged_user->user_login;

		$this->assertSame( [], get_allowed_recovery_methods( self::$privileged_user ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\get_allowed_recovery_methods
	 */
	public function test_get_allowed_methods_core_committer() : void {
		global $mock_is_special_user;
		$mock_is_special_user = [ self::$privileged_user->ID ];

		// Special user but NOT super admin => contact only.
		$this->assertSame( [ 'contact' ], get_allowed_recovery_methods( self::$privileged_user ) );
	}

	// --- Email Recovery Toggle Tests ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\enable_recovery_email
	 * @covers WordPressdotorg\Two_Factor\Recovery\is_recovery_email_enabled
	 * @covers WordPressdotorg\Two_Factor\Recovery\disable_recovery_email
	 */
	public function test_email_recovery_toggle() : void {
		$this->assertFalse( is_recovery_email_enabled( self::$regular_user->ID ) );

		$this->assertTrue( enable_recovery_email( self::$regular_user->ID ) );
		$this->assertTrue( is_recovery_email_enabled( self::$regular_user->ID ) );

		$this->assertTrue( disable_recovery_email( self::$regular_user->ID ) );
		$this->assertFalse( is_recovery_email_enabled( self::$regular_user->ID ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\enable_recovery_email
	 */
	public function test_email_recovery_blocked_for_special_user() : void {
		global $mock_is_special_user;
		$mock_is_special_user = [ self::$privileged_user->ID ];

		// Core committers can only use contact, not email.
		$this->assertFalse( enable_recovery_email( self::$privileged_user->ID ) );
	}

	// --- Designated Contact Tests ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\designate_contact
	 */
	public function test_designate_contact_requires_2fa() : void {
		$result = designate_contact( self::$regular_user->ID, self::$contact_user->user_login );
		$this->assertWPError( $result );
		$this->assertSame( 'contact_no_2fa', $result->get_error_code() );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\designate_contact
	 */
	public function test_designate_contact_self_designation() : void {
		$this->enable_2fa_for_user( self::$regular_user->ID );

		$result = designate_contact( self::$regular_user->ID, self::$regular_user->user_login );
		$this->assertWPError( $result );
		$this->assertSame( 'self_designation', $result->get_error_code() );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\designate_contact
	 * @covers WordPressdotorg\Two_Factor\Recovery\accept_designation
	 * @covers WordPressdotorg\Two_Factor\Recovery\get_designated_contact
	 */
	public function test_designate_contact_full_flow() : void {
		$this->enable_2fa_for_user( self::$contact_user->ID );

		// Designate contact.
		$result = designate_contact( self::$regular_user->ID, self::$contact_user->user_login );
		$this->assertTrue( $result );

		// Should not be confirmed yet.
		$this->assertNull( get_designated_contact( self::$regular_user->ID ) );

		// Get the pending data to extract the token for acceptance.
		$pending = WordPressdotorg\Two_Factor\Recovery\get_pending_contact_designation( self::$regular_user->ID );
		$this->assertNotNull( $pending );
		$this->assertSame( self::$contact_user->ID, $pending['contact_id'] );

		// We can't use the hashed token directly, but we can test with a wrong token.
		$result = accept_designation( self::$contact_user->ID, self::$regular_user->ID, 'wrong_token' );
		$this->assertWPError( $result );
		$this->assertSame( 'invalid_token', $result->get_error_code() );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\remove_contact
	 */
	public function test_remove_contact() : void {
		// Set up a confirmed contact directly via meta.
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACT_META, self::$contact_user->ID );
		update_user_meta( self::$contact_user->ID, WordPressdotorg\Two_Factor\Recovery\DESIGNATED_FOR_META, [ self::$regular_user->ID ] );

		$contact = get_designated_contact( self::$regular_user->ID );
		$this->assertSame( self::$contact_user->ID, $contact->ID );

		remove_contact( self::$regular_user->ID );

		$this->assertNull( get_designated_contact( self::$regular_user->ID ) );

		// Reverse relationship should also be cleaned up.
		$designated_for = get_user_meta( self::$contact_user->ID, WordPressdotorg\Two_Factor\Recovery\DESIGNATED_FOR_META, true );
		$this->assertEmpty( $designated_for );
	}

	// --- Recovery Request Tests ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\create_recovery_request
	 */
	public function test_create_email_recovery_request() : void {
		enable_recovery_email( self::$regular_user->ID );

		$result = create_recovery_request( self::$regular_user->ID, 'email' );

		$this->assertIsArray( $result );
		$this->assertSame( 'email', $result['type'] );
		$this->assertSame( 'pending', $result['status'] );
		$this->assertArrayHasKey( 'raw_token', $result );
		$this->assertSame( $result['available_at'], $result['requested_at'] + DAY_IN_SECONDS );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\create_recovery_request
	 */
	public function test_create_recovery_request_email_not_enabled() : void {
		$result = create_recovery_request( self::$regular_user->ID, 'email' );
		$this->assertWPError( $result );
		$this->assertSame( 'email_not_enabled', $result->get_error_code() );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\create_recovery_request
	 */
	public function test_create_recovery_request_blocked_for_super_admin() : void {
		global $super_admins, $mock_is_special_user;
		$mock_is_special_user = [ self::$privileged_user->ID ];
		$super_admins[]       = self::$privileged_user->user_login;

		$result = create_recovery_request( self::$privileged_user->ID, 'email' );
		$this->assertWPError( $result );
		$this->assertSame( 'no_recovery', $result->get_error_code() );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\create_recovery_request
	 */
	public function test_create_duplicate_recovery_request() : void {
		enable_recovery_email( self::$regular_user->ID );

		$result1 = create_recovery_request( self::$regular_user->ID, 'email' );
		$this->assertIsArray( $result1 );

		$result2 = create_recovery_request( self::$regular_user->ID, 'email' );
		$this->assertWPError( $result2 );
		$this->assertSame( 'already_pending', $result2->get_error_code() );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\create_recovery_request
	 */
	public function test_create_contact_recovery_request_no_contact() : void {
		$result = create_recovery_request( self::$regular_user->ID, 'contact' );
		$this->assertWPError( $result );
		$this->assertSame( 'no_contact', $result->get_error_code() );
	}

	// --- Cancel Recovery Tests ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\cancel_recovery_request
	 */
	public function test_cancel_recovery_request() : void {
		enable_recovery_email( self::$regular_user->ID );
		$request = create_recovery_request( self::$regular_user->ID, 'email' );

		$result = cancel_recovery_request( self::$regular_user->ID, $request['raw_token'] );
		$this->assertTrue( $result );
		$this->assertFalse( has_pending_recovery( self::$regular_user->ID ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\cancel_recovery_request
	 */
	public function test_cancel_recovery_request_invalid_token() : void {
		enable_recovery_email( self::$regular_user->ID );
		create_recovery_request( self::$regular_user->ID, 'email' );

		$result = cancel_recovery_request( self::$regular_user->ID, 'wrong_token' );
		$this->assertWPError( $result );
		$this->assertSame( 'invalid_token', $result->get_error_code() );
	}

	// --- Complete Recovery Tests ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\complete_recovery
	 */
	public function test_complete_recovery_before_delay() : void {
		enable_recovery_email( self::$regular_user->ID );
		$request = create_recovery_request( self::$regular_user->ID, 'email' );

		// Should fail - delay hasn't elapsed.
		$result = complete_recovery( self::$regular_user->ID, $request['raw_token'] );
		$this->assertWPError( $result );
		$this->assertSame( 'too_early', $result->get_error_code() );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\complete_recovery
	 */
	public function test_complete_recovery_after_delay() : void {
		$this->enable_2fa_for_user( self::$regular_user->ID );
		enable_recovery_email( self::$regular_user->ID );
		$request = create_recovery_request( self::$regular_user->ID, 'email' );

		// Manually set available_at to the past.
		$stored = get_pending_recovery( self::$regular_user->ID );
		$stored['available_at'] = time() - 1;
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_REQUEST_META, $stored );

		$result = complete_recovery( self::$regular_user->ID, $request['raw_token'] );
		$this->assertTrue( $result );

		// 2FA should be disabled.
		$this->assertFalse( Two_Factor_Core::is_user_using_two_factor( self::$regular_user->ID ) );

		// Recovery request should be cleaned up.
		$this->assertNull( get_pending_recovery( self::$regular_user->ID ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\complete_recovery
	 */
	public function test_complete_recovery_invalid_token() : void {
		enable_recovery_email( self::$regular_user->ID );
		create_recovery_request( self::$regular_user->ID, 'email' );

		$result = complete_recovery( self::$regular_user->ID, 'wrong_token' );
		$this->assertWPError( $result );
		$this->assertSame( 'invalid_token', $result->get_error_code() );
	}

	// --- Invalidation on Login ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\invalidate_recovery_on_login
	 */
	public function test_invalidate_recovery_on_login() : void {
		enable_recovery_email( self::$regular_user->ID );
		create_recovery_request( self::$regular_user->ID, 'email' );

		$this->assertTrue( has_pending_recovery( self::$regular_user->ID ) );

		// Simulate successful 2FA login.
		invalidate_recovery_on_login( self::$regular_user );

		$this->assertFalse( has_pending_recovery( self::$regular_user->ID ) );
	}

	// --- Recovery Prompt Tests ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\check_recovery_prompt_needed
	 */
	public function test_recovery_prompt_needed_with_2fa_no_recovery() : void {
		$this->enable_2fa_for_user( self::$regular_user->ID );

		$this->assertTrue( check_recovery_prompt_needed( self::$regular_user ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\check_recovery_prompt_needed
	 */
	public function test_recovery_prompt_not_needed_without_2fa() : void {
		$this->assertFalse( check_recovery_prompt_needed( self::$regular_user ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\check_recovery_prompt_needed
	 */
	public function test_recovery_prompt_not_needed_with_email_recovery() : void {
		$this->enable_2fa_for_user( self::$regular_user->ID );
		enable_recovery_email( self::$regular_user->ID );

		$this->assertFalse( check_recovery_prompt_needed( self::$regular_user ) );
	}

	// --- Contact Recovery Flow ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\create_recovery_request
	 * @covers WordPressdotorg\Two_Factor\Recovery\confirm_contact_recovery
	 * @covers WordPressdotorg\Two_Factor\Recovery\complete_recovery
	 */
	public function test_contact_recovery_full_flow() : void {
		$this->enable_2fa_for_user( self::$regular_user->ID );
		$this->enable_2fa_for_user( self::$contact_user->ID );

		// Set up confirmed contact directly.
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACT_META, self::$contact_user->ID );

		// Create contact recovery request.
		$request = create_recovery_request( self::$regular_user->ID, 'contact' );
		$this->assertIsArray( $request );
		$this->assertSame( 'contact', $request['type'] );

		// Confirm by wrong contact should fail.
		$result = confirm_contact_recovery( self::$regular_user->ID, $request['raw_token'], self::$plugin_user->ID );
		$this->assertWPError( $result );
		$this->assertSame( 'wrong_contact', $result->get_error_code() );

		// Confirm by correct contact.
		$result = confirm_contact_recovery( self::$regular_user->ID, $request['raw_token'], self::$contact_user->ID );
		$this->assertTrue( $result );

		// Check status is updated.
		$pending = get_pending_recovery( self::$regular_user->ID );
		$this->assertSame( 'confirmed_by_contact', $pending['status'] );

		// Complete recovery.
		$result = complete_recovery( self::$regular_user->ID, $request['raw_token'] );
		$this->assertTrue( $result );
		$this->assertFalse( Two_Factor_Core::is_user_using_two_factor( self::$regular_user->ID ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\confirm_contact_recovery
	 */
	public function test_contact_recovery_not_confirmed_cannot_complete() : void {
		$this->enable_2fa_for_user( self::$regular_user->ID );
		$this->enable_2fa_for_user( self::$contact_user->ID );

		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACT_META, self::$contact_user->ID );

		$request = create_recovery_request( self::$regular_user->ID, 'contact' );

		// Try to complete without contact confirmation.
		$result = complete_recovery( self::$regular_user->ID, $request['raw_token'] );
		$this->assertWPError( $result );
		$this->assertSame( 'not_confirmed', $result->get_error_code() );
	}
}
