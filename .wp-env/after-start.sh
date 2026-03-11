#!/bin/bash

# Install Composer dependencies for both CLI and test environments.
wp-env run cli --env-cwd=wp-content/plugins/wporg-two-factor composer install
wp-env run tests-cli --env-cwd=wp-content/plugins/wporg-two-factor composer install

# Activate all plugins network-wide.
wp-env run cli wp plugin activate --network --all

# Activate the theme.
wp-env run cli wp theme activate wporg-support-2024

# Configure bbPress to not use a root prefix for forums.
wp-env run cli wp option update _bbp_include_root 0

# Flush rewrite rules.
wp-env run cli wp rewrite flush
