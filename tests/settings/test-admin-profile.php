<?php
/**
 * Tests for the wp-admin profile screen customizations.
 */

declare( strict_types = 1 );

defined( 'WPINC' ) || die();

/**
 * @covers WordPressdotorg\Two_Factor\remove_admin_profile_php
 */
class Test_WPorg_Two_Factor_Admin_Profile extends WP_UnitTestCase {
	/**
	 * The user viewing the screen.
	 *
	 * @var WP_User
	 */
	protected static WP_User $current_user;

	/**
	 * The user being edited on user-edit.php.
	 *
	 * @var WP_User
	 */
	protected static WP_User $other_user;

	/**
	 * Create the users.
	 *
	 * @param WP_UnitTest_Factory $factory The test factory.
	 */
	public static function wpSetUpBeforeClass( WP_UnitTest_Factory $factory ): void {
		self::$current_user = $factory->user->create_and_get( array( 'first_name' => 'Current' ) );
		self::$other_user   = $factory->user->create_and_get( array( 'first_name' => 'Other' ) );
	}

	/**
	 * Reset the request superglobals.
	 */
	public function tear_down(): void {
		unset( $_POST['first_name'], $_REQUEST['user_id'] );

		parent::tear_down();
	}

	/**
	 * Without a user_id, as on network/profile.php, the profile screen is about the current user.
	 */
	public function test_profile_screen_uses_current_user(): void {
		wp_set_current_user( self::$current_user->ID );
		$_POST['first_name'] = 'Changed';

		do_action( 'load-profile.php' ); // phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores

		$this->assertSame( 'Current', $_POST['first_name'] ); // phpcs:ignore WordPress.Security.NonceVerification.Missing
	}

	/**
	 * The user-edit screen is about the requested user, not the one viewing it.
	 */
	public function test_user_edit_screen_uses_requested_user(): void {
		wp_set_current_user( self::$current_user->ID );
		$_REQUEST['user_id'] = (string) self::$other_user->ID;
		$_POST['first_name'] = 'Changed';

		do_action( 'load-user-edit.php' ); // phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores

		$this->assertSame( 'Other', $_POST['first_name'] ); // phpcs:ignore WordPress.Security.NonceVerification.Missing
	}
}
