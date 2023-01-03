# WPorg Two-Factor

WordPress.org-specific customizations for the Two Factor plugin

## Setup

1. Set up a local WP site.
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
