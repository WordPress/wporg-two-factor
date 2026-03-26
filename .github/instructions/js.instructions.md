---
applyTo: "settings/**/*.{js,jsx,ts,tsx}"
---

JavaScript/React conventions for the settings UI:

- This is a `@wordpress/scripts` block package. Use WordPress JS coding standards.
- Tabs for indentation.
- Import WordPress packages from `@wordpress/*` (e.g., `@wordpress/element`, `@wordpress/api-fetch`, `@wordpress/i18n`).
- Use `apiFetch` for REST API calls, not raw `fetch`.
- Translatable strings use `__()`, `_n()`, `sprintf()` from `@wordpress/i18n`.
- Jest tests live in `settings/src/tests/` and use `@testing-library/react`.
- Run JS tests with `npm run test:js`, lint with `npm run lint:js`.
