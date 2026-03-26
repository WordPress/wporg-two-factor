# WordPress.org Two-Factor Plugin — Copilot Agent Instructions

> See also `AGENTS.md` in the repository root for additional context shared across all AI agents.

## Project Overview

This is a **security-critical** WordPress plugin that customizes the [Two-Factor](https://github.com/WordPress/two-factor) plugin for WordPress.org. It enforces 2FA on privileged accounts (committers, deputies, theme authors, WordCamp organizers), strips capabilities from users who haven't enabled 2FA, and provides a React-based settings UI with REST API endpoints.

Key subsystems: provider management (WebAuthn/TOTP/Backup Codes), capability enforcement, session revalidation ("sudo mode"), encrypted TOTP secrets, and a block-based settings interface.

## Working on Issues

### Before Writing Code

1. **Read the issue thoroughly.** Understand the problem, reproduction steps, and acceptance criteria.
2. **Explore the relevant code.** Read the files involved — don't guess at implementations.
3. **Understand _why_ the code is the way it is.** Check `git log` and `git blame` for the files you'll change. Read commit messages and linked PRs/issues to understand the decisions that led to the current design. Security-related decisions are especially important — do not undo them without understanding the rationale.
4. **Check for related tests.** Look in `tests/` for existing test coverage of the area you're modifying.
5. **Map the dependency chain.** This plugin depends on the Two-Factor core plugin, the WebAuthn provider plugin, bbPress, Gutenberg, and wporg-mu-plugins. Understand which dependencies are involved in your change.

### Writing Code

Follow **WordPress coding standards** strictly:
- PHP: tabs for indentation, Yoda conditions (`'value' === $var`), snake_case functions, braces on same line.
- JS/React: tabs for indentation, follow wp-scripts/eslint conventions.
- When in doubt, match the existing file's style and adhere to the WordPress coding standards above.

**Architecture rules:**
- The main plugin file (`wporg-two-factor.php`) uses the `WordPressdotorg\Two_Factor` namespace.
- Settings UI lives in `settings/` — it's a `@wordpress/scripts` block package with its own `package.json`.
- REST API endpoints are in `settings/rest-api.php`.
- Session revalidation is in `revalidation/index.php`.
- Custom providers: `class-encrypted-totp-provider.php` (TOTP with encryption), `class-wporg-webauthn-provider.php` (WebAuthn with caching).

**Security considerations:**
- This is a security plugin. Every change must be defensively coded.
- Never weaken capability checks, 2FA enforcement, or session validation.
- TOTP secrets are encrypted at rest — maintain this guarantee.
- User input must be sanitized, output must be escaped.
- Do not introduce OWASP Top 10 vulnerabilities.

### Writing Tests

Every PR **must** include tests for the changes. This is a security plugin — untested code is unacceptable.

**PHP unit tests:**
- Location: `tests/` directory, files prefixed with `test-`.
- Framework: PHPUnit 9.6 with WordPress test utilities (`WP_UnitTestCase`).
- Run: `npm test` (runs PHPUnit inside wp-env).
- Coverage target: 100% for meaningful, testable code. Use `@codeCoverageIgnore` pragmatically (as configured in `phpunit.xml.dist`) to exclude non-behavioral glue, unreachable or environment-specific paths, but never to hide untested business logic.
- **NEVER use `remove_all_filters()` or `remove_all_actions()` in tests** — it removes production callbacks. Always add/remove specific callbacks by reference.
- Test classes extend `WP_UnitTestCase`. Use `wpSetUpBeforeClass` for expensive setup, `tear_down` for cleanup.
- The test bootstrap (`tests/bootstrap.php`) mocks WordPress.org-specific functions.

**JavaScript tests:**
- Location: `settings/src/tests/`.
- Framework: Jest via `@wordpress/scripts`.
- Run: `npm run test:js`.
- Uses `@testing-library/react` for component tests.

**End-to-end tests with Playwright:**
- Use the Playwright MCP server to interact with the local WordPress site in the browser.
- wp-env provides two instances:
  - **Dev instance:** `http://localhost:8888` — use this for Playwright browser testing.
  - **Test instance:** `http://localhost:8889` — used by PHPUnit (no browser testing here).
- **Login credentials:** username `admin`, password `password` (wp-env defaults).
- **Login URL:** `http://localhost:8888/wp-login.php`. Log in before testing authenticated flows.
- The dev environment has a **Dummy 2FA provider** enabled (see `.wp-env/mu-plugins/mu-plugin.php`), which allows completing 2FA login without real authenticator hardware. Use this for Playwright flows that require passing the 2FA prompt.
- The `admin` user is configured as a super admin and "special user" in the mu-plugin, so 2FA enforcement applies to them.
- This is a **multisite** installation with bbPress, Gutenberg, and the Two-Factor plugins active network-wide.
- Test real user flows: enabling 2FA, verifying enforcement, checking the settings UI, revalidation prompts.
- Take screenshots to verify visual state when relevant.
- The user profile / 2FA settings page is at `http://localhost:8888/support/users/admin/edit/account/` (bbPress user edit page).

### Validating Changes

Before opening a PR, verify your changes pass all checks:

1. **PHP tests:** `npm test`
2. **JS tests:** `npm run test:js`
3. **JS linting:** `npm run lint:js`
4. **PHP linting:** `npx wp-env run cli --env-cwd=wp-content/plugins/wporg-two-factor composer lint`
5. **E2E verification:** Use Playwright to verify the change works in the browser.

If any check fails, fix the issue — do not skip or ignore failures.

## Project Layout

```
wporg-two-factor.php          # Main plugin entry point (namespace: WordPressdotorg\Two_Factor)
class-encrypted-totp-provider.php  # TOTP provider with at-rest encryption
class-wporg-webauthn-provider.php  # WebAuthn provider with caching
stats.php                     # 2FA adoption analytics
settings/
  settings.php                # Settings page registration, replaces core 2FA UI
  rest-api.php                # REST endpoints for TOTP setup, provider status, passwords
  package.json                # @wordpress/scripts block package
  src/                        # React components for settings UI
    components/               # UI components (TOTP, passwords, backup codes, WebAuthn)
    tests/                    # Jest tests for React components
revalidation/
  index.php                   # Session revalidation / "sudo mode" system
tests/
  bootstrap.php               # Test bootstrap with WordPress.org mocks
  test-wporg-two-factor.php   # Main PHP test suite
  settings/
    test-rest-api.php          # REST API endpoint tests
.wp-env.json                  # wp-env configuration (multisite, plugins, themes)
.wp-env/
  after-start.sh              # Lifecycle script: composer install, plugin activation, bbPress config
  mu-plugins/                 # Mock mu-plugins for local development
```

## Build & Test Commands

| Task | Command |
|---|---|
| Start dev environment | `npx wp-env start` |
| Run PHP tests | `npm test` |
| Run JS tests | `npm run test:js` |
| Lint JS | `npm run lint:js` |
| Lint PHP | `npx wp-env run cli --env-cwd=wp-content/plugins/wporg-two-factor composer lint` |
| Build settings block | `npm run build --workspaces` |
| WP-CLI in dev env | `npx wp-env run cli wp <command>` |

## Commit Message Style

Follow the existing style visible in `git log`. Use a short imperative subject line with a category prefix when appropriate (e.g., "WebAuthN:", "Revalidation:", "Tests:", "Build:"). Keep messages concise and focused on _why_, not _what_.

## Key Dependencies

- **Two-Factor** (`WordPress/two-factor`): Core 2FA framework — provides `Two_Factor_Core`, `Two_Factor_Totp`, `Two_Factor_Backup_Codes`.
- **Two-Factor WebAuthn** (`two-factor-provider-webauthn`): WebAuthn provider — provides `TwoFactor_Provider_WebAuthn`.
- **bbPress**: Forum plugin — user profiles integrate with 2FA settings.
- **wporg-mu-plugins**: WordPress.org shared utilities including encryption functions.
- **Gutenberg**: Block editor — settings UI is a block.

## What NOT to Do

- Do not refactor code you weren't asked to change.
- Do not add features beyond what the issue requests.
- Do not weaken security checks or enforcement for convenience.
- Do not skip or disable pre-commit hooks or linting.
- Do not introduce new dependencies without strong justification.
- Do not change CI/CD workflows unless the issue specifically requires it.
