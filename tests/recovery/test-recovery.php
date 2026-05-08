<?php

use function WordPressdotorg\Two_Factor\Recovery\{
	is_recovery_available,
	get_designated_contacts,
	designate_contact,
	accept_designation,
	decline_designation,
	remove_contact,
	has_pending_recovery,
	get_pending_recovery,
	create_recovery_request,
	cancel_recovery_request,
	cancel_recovery_compromised,
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
	protected static WP_User $contact_user_2;
	protected static WP_User $plugin_user;

	public static function wpSetUpBeforeClass( WP_UnitTest_Factory $factory ) : void {
		self::$privileged_user = $factory->user->create_and_get( [ 'user_login' => 'privileged_recovery' ] );
		self::$regular_user    = $factory->user->create_and_get( [ 'user_login' => 'regular_recovery', 'role' => 'contributor' ] );
		self::$contact_user    = $factory->user->create_and_get( [ 'user_login' => 'contact_recovery', 'role' => 'contributor' ] );
		self::$contact_user_2  = $factory->user->create_and_get( [ 'user_login' => 'contact_recovery_2', 'role' => 'contributor' ] );
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

		foreach ( [ self::$privileged_user, self::$regular_user, self::$contact_user, self::$contact_user_2, self::$plugin_user ] as $user ) {
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META );
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_PENDING_META );
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_REQUEST_META );
			delete_user_meta( $user->ID, WordPressdotorg\Two_Factor\Recovery\DESIGNATED_FOR_META );
			delete_user_meta( $user->ID, Two_Factor_Core::ENABLED_PROVIDERS_USER_META_KEY );
			delete_user_meta( $user->ID, Two_Factor_Core::PROVIDER_USER_META_KEY );
		}
	}

	protected function enable_2fa_for_user( int $user_id ) : void {
		update_user_meta( $user_id, Two_Factor_Core::ENABLED_PROVIDERS_USER_META_KEY, [ 1 => 'Two_Factor_Totp' ] );
		update_user_meta( $user_id, Two_Factor_Core::PROVIDER_USER_META_KEY, 'Two_Factor_Totp' );

		$totp_provider = Two_Factor_Core::get_providers()['Two_Factor_Totp'];
		$totp_provider->set_user_totp_key( $user_id, $totp_provider->generate_key() );

		$this->assertTrue( Two_Factor_Core::is_user_using_two_factor( $user_id ) );
	}

	// --- Recovery Availability Tests ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\is_recovery_available
	 */
	public function test_recovery_available_for_regular_user() : void {
		$this->assertTrue( is_recovery_available( self::$regular_user ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\is_recovery_available
	 */
	public function test_recovery_not_available_for_super_admin() : void {
		global $super_admins, $mock_is_special_user;
		$mock_is_special_user = [ self::$privileged_user->ID ];
		$super_admins[]       = self::$privileged_user->user_login;

		$this->assertFalse( is_recovery_available( self::$privileged_user ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\is_recovery_available
	 */
	public function test_recovery_available_for_core_committer() : void {
		global $mock_is_special_user;
		$mock_is_special_user = [ self::$privileged_user->ID ];

		// Special user but NOT super admin => recovery available.
		$this->assertTrue( is_recovery_available( self::$privileged_user ) );
	}

	// --- Designated Contact Tests ---

	/**
	 * Designating a contact should succeed even if they lack 2FA.
	 * The 2FA requirement is enforced when the contact tries to accept.
	 *
	 * @covers WordPressdotorg\Two_Factor\Recovery\designate_contact
	 */
	public function test_designate_contact_allows_no_2fa() : void {
		$result = designate_contact( self::$regular_user->ID, self::$contact_user->user_login );
		$this->assertTrue( $result );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\accept_designation
	 */
	public function test_accept_designation_requires_2fa_on_contact() : void {
		// Inject a pending designation with a token we know, since designate_contact()
		// only stores the hash and emails the raw token out of band.
		$raw_token = 'known-raw-token-for-test';
		update_user_meta(
			self::$regular_user->ID,
			WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_PENDING_META,
			[
				[
					'contact_id'   => self::$contact_user->ID,
					'token'        => wp_hash_password( $raw_token ),
					'requested_at' => time(),
				],
			]
		);

		// Contact has no 2FA enabled -- accept must fail with contact_no_2fa.
		$result = accept_designation( self::$contact_user->ID, self::$regular_user->ID, $raw_token );
		$this->assertWPError( $result );
		$this->assertSame( 'contact_no_2fa', $result->get_error_code() );

		// Once the contact enables 2FA, acceptance succeeds.
		$this->enable_2fa_for_user( self::$contact_user->ID );

		$result = accept_designation( self::$contact_user->ID, self::$regular_user->ID, $raw_token );
		$this->assertTrue( $result );
		$this->assertCount( 1, get_designated_contacts( self::$regular_user->ID ) );
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
	 * @covers WordPressdotorg\Two_Factor\Recovery\get_designated_contacts
	 */
	public function test_designate_contact_creates_pending() : void {
		$result = designate_contact( self::$regular_user->ID, self::$contact_user->user_login );
		$this->assertTrue( $result );

		$this->assertEmpty( get_designated_contacts( self::$regular_user->ID ) );

		$pending = WordPressdotorg\Two_Factor\Recovery\get_pending_contact_designations( self::$regular_user->ID );
		$this->assertCount( 1, $pending );
		$this->assertSame( self::$contact_user->ID, $pending[0]['contact_id'] );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\designate_contact
	 */
	public function test_designate_contact_prevents_duplicate() : void {
		designate_contact( self::$regular_user->ID, self::$contact_user->user_login );

		$result = designate_contact( self::$regular_user->ID, self::$contact_user->user_login );
		$this->assertWPError( $result );
		$this->assertSame( 'already_pending', $result->get_error_code() );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\accept_designation
	 */
	public function test_accept_designation_wrong_token() : void {
		designate_contact( self::$regular_user->ID, self::$contact_user->user_login );

		$result = accept_designation( self::$contact_user->ID, self::$regular_user->ID, 'wrong_token' );
		$this->assertWPError( $result );
		$this->assertSame( 'invalid_token', $result->get_error_code() );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\remove_contact
	 */
	public function test_remove_specific_contact() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [
			self::$contact_user->ID,
			self::$contact_user_2->ID,
		] );
		update_user_meta( self::$contact_user->ID, WordPressdotorg\Two_Factor\Recovery\DESIGNATED_FOR_META, [ self::$regular_user->ID ] );
		update_user_meta( self::$contact_user_2->ID, WordPressdotorg\Two_Factor\Recovery\DESIGNATED_FOR_META, [ self::$regular_user->ID ] );

		$contacts = get_designated_contacts( self::$regular_user->ID );
		$this->assertCount( 2, $contacts );

		remove_contact( self::$regular_user->ID, self::$contact_user->ID );

		$contacts = get_designated_contacts( self::$regular_user->ID );
		$this->assertCount( 1, $contacts );
		$this->assertSame( self::$contact_user_2->ID, $contacts[0]->ID );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\remove_contact
	 */
	public function test_remove_all_contacts() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [
			self::$contact_user->ID,
			self::$contact_user_2->ID,
		] );

		remove_contact( self::$regular_user->ID );

		$this->assertEmpty( get_designated_contacts( self::$regular_user->ID ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\designate_contact
	 */
	public function test_designate_multiple_contacts() : void {
		$this->assertTrue( designate_contact( self::$regular_user->ID, self::$contact_user->user_login ) );
		$this->assertTrue( designate_contact( self::$regular_user->ID, self::$contact_user_2->user_login ) );

		$pending = WordPressdotorg\Two_Factor\Recovery\get_pending_contact_designations( self::$regular_user->ID );
		$this->assertCount( 2, $pending );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\designate_contact
	 */
	public function test_designate_already_confirmed_contact() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );

		$result = designate_contact( self::$regular_user->ID, self::$contact_user->user_login );
		$this->assertWPError( $result );
		$this->assertSame( 'already_designated', $result->get_error_code() );
	}

	// --- Recovery Request Tests ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\create_recovery_request
	 */
	public function test_create_recovery_request() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );

		$result = create_recovery_request( self::$regular_user->ID );

		$this->assertIsArray( $result );
		$this->assertSame( 'pending', $result['status'] );
		$this->assertArrayHasKey( 'raw_token', $result );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\create_recovery_request
	 */
	public function test_create_recovery_request_blocked_for_super_admin() : void {
		global $super_admins, $mock_is_special_user;
		$mock_is_special_user = [ self::$privileged_user->ID ];
		$super_admins[]       = self::$privileged_user->user_login;

		$result = create_recovery_request( self::$privileged_user->ID );
		$this->assertWPError( $result );
		$this->assertSame( 'no_recovery', $result->get_error_code() );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\create_recovery_request
	 */
	public function test_create_recovery_request_no_contacts() : void {
		$result = create_recovery_request( self::$regular_user->ID );
		$this->assertWPError( $result );
		$this->assertSame( 'no_contact', $result->get_error_code() );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\create_recovery_request
	 */
	public function test_create_duplicate_recovery_request() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );

		$result1 = create_recovery_request( self::$regular_user->ID );
		$this->assertIsArray( $result1 );

		$result2 = create_recovery_request( self::$regular_user->ID );
		$this->assertWPError( $result2 );
		$this->assertSame( 'already_pending', $result2->get_error_code() );
	}

	// --- Cancel Recovery Tests ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\cancel_recovery_request
	 */
	public function test_cancel_recovery_request() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );
		$request = create_recovery_request( self::$regular_user->ID );

		$result = cancel_recovery_request( self::$regular_user->ID, $request['raw_token'] );
		$this->assertTrue( $result );
		$this->assertFalse( has_pending_recovery( self::$regular_user->ID ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\cancel_recovery_request
	 */
	public function test_cancel_recovery_request_invalid_token() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );
		create_recovery_request( self::$regular_user->ID );

		$result = cancel_recovery_request( self::$regular_user->ID, 'wrong_token' );
		$this->assertWPError( $result );
		$this->assertSame( 'invalid_token', $result->get_error_code() );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\cancel_recovery_compromised
	 */
	public function test_cancel_recovery_compromised_resets_password() : void {
		$this->enable_2fa_for_user( self::$regular_user->ID );
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );

		$request = create_recovery_request( self::$regular_user->ID );

		// Store the current password hash.
		$old_hash = get_userdata( self::$regular_user->ID )->user_pass;

		$result = cancel_recovery_compromised( self::$regular_user->ID, $request['raw_token'] );
		$this->assertTrue( $result );

		// Recovery should be cancelled.
		$this->assertFalse( has_pending_recovery( self::$regular_user->ID ) );

		// Password should have changed.
		$new_hash = get_userdata( self::$regular_user->ID )->user_pass;
		$this->assertNotSame( $old_hash, $new_hash );
	}

	// --- Complete Recovery Tests ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\complete_recovery
	 */
	public function test_complete_recovery_not_confirmed() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );
		$request = create_recovery_request( self::$regular_user->ID );

		$result = complete_recovery( self::$regular_user->ID, $request['raw_token'] );
		$this->assertWPError( $result );
		$this->assertSame( 'not_confirmed', $result->get_error_code() );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\complete_recovery
	 */
	public function test_complete_recovery_after_confirmation() : void {
		$this->enable_2fa_for_user( self::$regular_user->ID );
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );

		$request = create_recovery_request( self::$regular_user->ID );

		confirm_contact_recovery( self::$regular_user->ID, $request['raw_token'], self::$contact_user->ID );

		$result = complete_recovery( self::$regular_user->ID, $request['raw_token'] );
		$this->assertTrue( $result );
		$this->assertFalse( Two_Factor_Core::is_user_using_two_factor( self::$regular_user->ID ) );
		$this->assertNull( get_pending_recovery( self::$regular_user->ID ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\complete_recovery
	 */
	public function test_complete_recovery_invalid_token() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );
		create_recovery_request( self::$regular_user->ID );

		$result = complete_recovery( self::$regular_user->ID, 'wrong_token' );
		$this->assertWPError( $result );
		$this->assertSame( 'invalid_token', $result->get_error_code() );
	}

	// --- Invalidation on Login ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\invalidate_recovery_on_login
	 */
	public function test_invalidate_recovery_on_login() : void {
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );
		create_recovery_request( self::$regular_user->ID );

		$this->assertTrue( has_pending_recovery( self::$regular_user->ID ) );

		invalidate_recovery_on_login( self::$regular_user );

		$this->assertFalse( has_pending_recovery( self::$regular_user->ID ) );
	}

	// --- Recovery Prompt Tests ---

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\check_recovery_prompt_needed
	 */
	public function test_recovery_prompt_needed_with_2fa_no_contacts() : void {
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
	public function test_recovery_prompt_not_needed_with_contacts() : void {
		$this->enable_2fa_for_user( self::$regular_user->ID );
		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [ self::$contact_user->ID ] );

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

		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [
			self::$contact_user->ID,
		] );

		$request = create_recovery_request( self::$regular_user->ID );
		$this->assertIsArray( $request );

		// Confirm by wrong contact should fail.
		$result = confirm_contact_recovery( self::$regular_user->ID, $request['raw_token'], self::$plugin_user->ID );
		$this->assertWPError( $result );
		$this->assertSame( 'wrong_contact', $result->get_error_code() );

		// Confirm by correct contact.
		$result = confirm_contact_recovery( self::$regular_user->ID, $request['raw_token'], self::$contact_user->ID );
		$this->assertTrue( $result );

		$pending = get_pending_recovery( self::$regular_user->ID );
		$this->assertSame( 'confirmed_by_contact', $pending['status'] );

		$result = complete_recovery( self::$regular_user->ID, $request['raw_token'] );
		$this->assertTrue( $result );
		$this->assertFalse( Two_Factor_Core::is_user_using_two_factor( self::$regular_user->ID ) );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\confirm_contact_recovery
	 */
	public function test_any_contact_can_confirm_recovery() : void {
		$this->enable_2fa_for_user( self::$regular_user->ID );
		$this->enable_2fa_for_user( self::$contact_user->ID );
		$this->enable_2fa_for_user( self::$contact_user_2->ID );

		update_user_meta( self::$regular_user->ID, WordPressdotorg\Two_Factor\Recovery\RECOVERY_CONTACTS_META, [
			self::$contact_user->ID,
			self::$contact_user_2->ID,
		] );

		$request = create_recovery_request( self::$regular_user->ID );
		$this->assertIsArray( $request );

		// The second contact confirms.
		$result = confirm_contact_recovery( self::$regular_user->ID, $request['raw_token'], self::$contact_user_2->ID );
		$this->assertTrue( $result );

		$pending = get_pending_recovery( self::$regular_user->ID );
		$this->assertSame( 'confirmed_by_contact', $pending['status'] );
		$this->assertSame( self::$contact_user_2->ID, $pending['confirmed_by'] );
	}

	/**
	 * @covers WordPressdotorg\Two_Factor\Recovery\designate_contact
	 */
	public function test_designate_blocked_for_super_admin() : void {
		global $super_admins, $mock_is_special_user;
		$mock_is_special_user = [ self::$privileged_user->ID ];
		$super_admins[]       = self::$privileged_user->user_login;

		$result = designate_contact( self::$privileged_user->ID, self::$contact_user->user_login );
		$this->assertWPError( $result );
		$this->assertSame( 'method_not_allowed', $result->get_error_code() );
	}
}
