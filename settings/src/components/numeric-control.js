/**
 * Input field for values that use digits, but aren't strictly numbers in the mathematical sense.
 *
 * The classic example is a credit card, but in our context we have TOTP codes, backup codes, etc. We may want to
 * display them with spaces for easier reading, etc.
 *
 * If we used Gutenberg's `NumberControl`, we'd have to hide the extraneous UI elements, and it would still be
 * using the underlying `input[type="number"]`, which has some accessibility issues.
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/number#accessibility
 * @link https://technology.blog.gov.uk/2020/02/24/why-the-gov-uk-design-system-team-changed-the-input-type-for-numbers/
 * @link https://stackoverflow.com/a/66759105/450127
 */
export default function NumericControl( props ) {
	return (
		<input
			{ ...props }
			type="text"
			inputMode="numeric"
			autoComplete={ props.autoComplete || 'off' }
			pattern={ props.pattern || "[0-9 ]*" }
			onChange={ ( event ) => {
				// Most callers will only need the value, so make it convenient for them.
				props.onChange( event.target.value, event );
			} }
		/>
	);
}
