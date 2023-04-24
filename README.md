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
1. Install and build the `wporg-mu-plugins` repository.
1. Add this code to your `wp-content/mu-plugins/0-sandbox.php`:
	```php
	require_once WPMU_PLUGIN_DIR. '/wporg-mu-plugins/mu-plugins/loader.php';

	// Enable dummy provider for convenience when testing locally.
	add_filter( 'two_factor_providers', function( $providers ) {
		$providers['Two_Factor_Dummy'] = TWO_FACTOR_DIR . 'providers/class-two-factor-dummy.php';

		return $providers;
	}, 100 ); // Must run _after_ wporg-two-factor.

	// Mimics `mu-plugins/main-network/site-support.php`.
	function add_rewrite_rules() {
		// e.g., https://wordpress.org/support/users/foo/edit/account/
		add_rewrite_rule(
			bbp_get_user_slug() . '/([^/]+)/' . bbp_get_edit_slug() . '/account/?$',
			'index.php?' . bbp_get_user_rewrite_id() . '=$matches[1]&' . 'edit_account=1',
			'top'
		);
	}
	add_action( 'init', __NAMESPACE__ . '\add_rewrite_rules' );
	```
1. Install, build, and activate the `wporg-support` theme.
1. Install `bbPress` and `Gutenberg`. You might need to clone & build `trunk` branch of `Gutenberg` if we happen to be using any new features.
1. `git clone` https://github.com/WordPress/two-factor/ into `wp-content/plugins` and follow their setup instructions.
1. `git clone` this repo into `wp-content/plugins`
1. `cd wporg-two-factor && composer install`
1. `yarn && yarn workspaces run build`
1. Activate all four plugins.
1. If you want to make JS changes, then `yarn workspaces run start`
1. Open `wp-admin/options-general.php?page=bbpress` and uncheck `Prefix all forum content with the Forum Root slug (Recommended)`, then save.
1. Visit https://example.org/users/{username}/edit/account/ to view the custom settings UI. If you get a `404` error, visit `wp-admin/options-permalinks.php` and then try again.

## Testing

Front-end unit tests can be run in `/settings` using the `npm run test:unit` or `npm run test:unit:watch` commands.

Back-end unit tests can be run in `/` using the `composer run test` or `composer run test:watch` commands. `composer run coverage` will generate a coverage report.

## Security

Please privately report any potential security issues to the [WordPress HackerOne](https://hackerone.com/wordpress) program.
