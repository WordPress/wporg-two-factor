# Agent Instructions for wporg-two-factor

## Overview

WordPress.org-specific customizations for the [Two Factor](https://github.com/WordPress/two-factor) plugin. This is a WordPress **mu-plugin** (network-activated) that extends the upstream Two Factor plugin with encrypted TOTP, WebAuthn support, a custom React-based settings UI (Gutenberg block), session revalidation, and capability restrictions for privileged users without 2FA.

**Languages:** PHP (WordPress plugin, ~8 source files), JavaScript/React (Gutenberg block in `settings/`).
**Runtime:** PHP 7.4+ (CI uses 7.4), Node 18+ (`.nvmrc`, CI uses 20), Docker (for wp-env test environment).
**Namespace:** `WordPressdotorg\Two_Factor`

## Repository Layout

```
wporg-two-factor.php          # Main plugin file — hooks, filters, capability logic
class-encrypted-totp-provider.php  # Extends Two_Factor_Totp with encryption
class-wporg-webauthn-provider.php  # Extends WebAuthn provider with caching/filters
stats.php                     # WordPress.org stats tracking
revalidation/index.php        # 2FA session revalidation ("sudo mode")
settings/                     # Gutenberg block workspace (npm workspace)
  settings.php                # Block registration, custom UI replacement
  rest-api.php                # REST API endpoints and user fields
  src/                        # React source (components/, hooks/, tests/, utilities/)
    block.json                # Block metadata
    render.php                # Block server-side render callback
  build/                      # Compiled output (gitignored)
  package.json                # Workspace package with wp-scripts
  jest.config.js, jest.setup.js, babel.config.json
tests/
  bootstrap.php               # PHPUnit bootstrap — loads plugins in wp-env context
  test-wporg-two-factor.php   # PHP tests for main plugin
  settings/                   # PHP tests for REST API and application passwords
.wp-env.json                  # wp-env config (multisite dev, single-site test install)
.wp-env/after-start.sh        # Lifecycle script: composer install, plugin/theme activation, bbPress config
phpcs.xml                     # PHPCS config: WordPress-Core/Docs/Extra with exclusions
phpunit.xml.dist              # PHPUnit config (multisite, prefix "test-")
composer.json                 # PHP deps: phpcs, phpunit, wpcs, polyfills
package.json                  # Root: wp-env, npm workspaces ["settings"]
```

## Build & Validate Commands

Always run `npm install` first. This installs both root and workspace (`settings/`) dependencies.

### Bootstrap

```sh
npm install                    # Install all Node dependencies (root + workspaces)
composer install               # Install PHP dependencies (phpcs, phpunit, etc.)
```

### Build (JavaScript)

```sh
npm run build --workspaces     # Builds settings/ block → settings/build/
```

### Local Development Environment (requires Docker)

```sh
npx wp-env start               # Starts WordPress + test containers (~37s)
# Dev site: http://localhost:8888  |  Test site: http://localhost:8889
npx wp-env stop                # Stops containers
```

### Testing

**PHP tests** require a running wp-env Docker environment:

```sh
npx wp-env start               # Must be running first
npm test                       # Runs PHPUnit inside the tests-cli container (~1s)
```

**JavaScript tests** do NOT require Docker:

```sh
npm run test:js                # Runs Jest tests in settings/ workspace (~3s)
```

### Linting

**JavaScript lint** (enforced in CI — must pass with 0 errors):

```sh
npm run lint:js                # ESLint via wp-scripts on settings/src/
```

**PHP lint** (NOT enforced in CI — has pre-existing violations):

```sh
composer run lint              # PHPCS with WordPress coding standards
composer run format            # Auto-fix with PHPCBF
```

## CI Checks (GitHub Actions on PRs)

Two workflows run on every pull request (both must pass), plus a build workflow on trunk:

1. **`.github/workflows/lint.yml`** — Runs `npm run lint:js`. JS lint errors (not warnings) will fail the build.

2. **`.github/workflows/test.yml`** — Starts wp-env, then runs `npm test` (PHP) and `npm run test:js` (JS). Both must pass.

3. **`.github/workflows/build.yml`** — Runs only on trunk push (not PRs). Builds and pushes to the `build` branch.

## Key Conventions

- **WordPress Coding Standards.** Use tabs for indentation. PHP follows WordPress-Core style (see `phpcs.xml` for customized rules). Text domain is `wporg`.
- **PHP test files** are prefixed `test-` and placed in `tests/`. Test classes extend `WP_UnitTestCase`. PHPUnit runs as **multisite** per `phpunit.xml.dist`.
- **JS test files** use `*.test.js` convention inside `settings/src/tests/`.
- **Never use `remove_all_filters()` or `remove_all_actions()` in tests.** Always save specific callbacks and add/remove them individually.
- **The `settings/` directory is an npm workspace.** JS build/lint/test commands are delegated via `--workspaces` or `-w settings`.
- **Dependencies not obvious from layout:** The plugin depends on `WordPress/two-factor`, `two-factor-provider-webauthn`, `WordPress/wporg-mu-plugins` (build branch), `bbpress`, `gutenberg`, and themes `wporg-parent-2021` (build branch) and `wporg-support-2024` — all mapped via `.wp-env.json`.

## Validation Checklist

Before submitting changes, always verify:

1. `npm run lint:js` exits with 0 errors (warnings are acceptable)
2. `npm run test:js` — all JS tests pass
3. `npm test` — all PHP tests pass (requires `npx wp-env start`)
4. `npm run build --workspaces` — JS build succeeds without errors

Trust these instructions. Only search the codebase if something here is incomplete or produces unexpected errors.
