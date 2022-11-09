<?php

//use function WordPressdotorg\Two_Factor\{};

defined( 'WPINC' ) || die();

class Test_WPorg_Two_Factor extends WP_UnitTestCase {
	public function test_two_factor_providers() {
		$actual = Two_Factor_Core::get_providers();

		$this->assertArrayHasKey( 'Two_Factor_Totp', $actual );
		$this->assertArrayHasKey( 'Two_Factor_Backup_Codes', $actual );
		// @todo enable after https://github.com/WordPress/two-factor/issues/427 merges
		//$this->assertArrayHasKey( 'Two_Factor_WebAuthn', $actual );

		$this->assertArrayNotHasKey( 'Two_Factor_Email', $actual );
		$this->assertArrayNotHasKey( 'Two_Factor_Dummy', $actual );
	}
}
