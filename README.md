# WPorg Two-Factor

WordPress.org-specific customizations for the Two Factor plugin

## Setup

1. `npm install`
1. `npm run build --workspaces`
1. `npx wp-env start`
1. Visit `https://localhost:8888/users/admin/edit/account/` to view the custom settings UI.
1. If you want to make JS changes, run `npm run start --workspaces`.

## Testing

PHP unit tests can be run with `npm test`. `composer run coverage` will generate a coverage report.

JavaScript unit tests can be run with `npm run test:js`.

## Security

Please privately report any potential security issues to the [WordPress HackerOne](https://hackerone.com/wordpress) program.
