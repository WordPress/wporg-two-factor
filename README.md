# WPorg Two-Factor

WordPress.org-specific customizations for the Two Factor plugin

## Setup

1. Set up a local WP site.
1. Add this code to your `wp-config.php`:
	```php
	define( 'WP_ENVIRONMENT_TYPE', 'local' );

	// Mimic w.org for testing wporg-two-factor
	global $supes, $super_admins;
	$supes = array(
		'your_username'
	);
	$super_admins = array_merge( $supes );

	function is_special_user( $user_id ) {
		$user = get_userdata( $user_id );
		return in_array( $user->user_login, $GLOBALS['supes'], true );
	}
	```
1. Add this code to your `wp-content/mu-plugins/0-sandbox.php`:
	```php
	// Enable dummy provider for convenience when testing locally.
	add_filter( 'two_factor_providers', function( $providers ) {
		$providers['Two_Factor_Dummy'] = TWO_FACTOR_DIR . 'providers/class-two-factor-dummy.php';

		return $providers;
	}, 100 ); // Must run _after_ wporg-two-factor.
	```
1. `git clone` https://github.com/WordPress/two-factor/ into `wp-content/plugins`.
1. Run `composer install` and  `npm install && npm run build`.
1. `git clone` this repo into `wp-content/plugins`
1. Run `composer install`
1. `cd settings` and run `npm install && npm run build`
1. Install `bbPress`.
1. Activate all three plugins.
1. Visit https://example.org/users/{username}/edit/account/ to view the custom settings UI.

## Security

Please privately report any potential security issues to the [WordPress HackerOne](https://hackerone.com/wordpress) program.
