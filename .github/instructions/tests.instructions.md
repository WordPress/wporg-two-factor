---
applyTo: "tests/**"
---

Testing rules for this security plugin:

- Every code change requires corresponding test coverage.
- Test classes extend `WP_UnitTestCase`.
- Use `wpSetUpBeforeClass( WP_UnitTest_Factory $factory )` for expensive setup shared across tests.
- Use `tear_down()` to reset globals and state after each test.
- NEVER use `remove_all_filters()` or `remove_all_actions()`. Always save callbacks to a variable and remove the specific callback.
- Use `@covers` annotations on every test method to track coverage.
- Test both positive and negative cases — especially for security enforcement (e.g., verify that capability stripping works AND that it doesn't affect users who have 2FA enabled).
- The bootstrap file (`tests/bootstrap.php`) provides mock WordPress.org functions. Check what's available before creating new mocks.
- Run tests with `npm test` which executes PHPUnit inside the wp-env Docker container.
