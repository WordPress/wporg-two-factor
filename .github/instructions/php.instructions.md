---
applyTo: "**/*.php"
---

Follow WordPress PHP coding standards and WordPress documentation standards:
- Tabs for indentation, never spaces.
- Snake_case for function and variable names.
- Opening braces on the same line as the statement.
- Space inside parentheses: `if ( $condition )`, `function_call( $arg )`.
- Use strict type comparisons (`===`, `!==`) unless there's a specific reason not to.
- Sanitize all input, escape all output. Use `sanitize_*()`, `esc_html()`, `esc_attr()`, `wp_kses()` as appropriate.
- Prefix functions and hooks with the plugin namespace or use the `WordPressdotorg\Two_Factor` namespace.
