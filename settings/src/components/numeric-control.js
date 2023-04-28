/**
 * WordPress dependencies
 */
import { useRef, useCallback } from '@wordpress/element';

/**
 * Input field for values that use digits, but aren't strictly numbers in the mathematical sense.
 *
 * The classic example is a credit card, but in our context we have TOTP codes, backup codes, etc. We may want to
 * display them with spaces for easier reading, etc.
 *
 * If we used Gutenberg's `NumberControl`, we'd have to hide the extraneous UI elements, and it would still be
 * using the underlying `input[type="number"]`, which has some accessibility issues.
 *
 * @param props
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/number#accessibility
 * @see https://technology.blog.gov.uk/2020/02/24/why-the-gov-uk-design-system-team-changed-the-input-type-for-numbers/
 * @see https://stackoverflow.com/a/66759105/450127
 */
export default function NumericControl( props ) {
	const { autoComplete, pattern, title, onChange, onKeyDown, index } = props;

	const inputRef = useRef( null );

	const handleChange = useCallback(
		// Most callers will only need the value, so make it convenient for them.
		( event ) =>
			onChange && onChange( event.target.value, event, index, inputRef ),
		[]
	);

	const handleKeyDown = useCallback(
		// Most callers will only need the value, so make it convenient for them.
		( event ) =>
			onKeyDown &&
			onKeyDown( event.target.value, event, index, inputRef ),
		[]
	);

	return (
		<input
			{ ...props }
			type="text"
			inputMode="numeric"
			ref={ inputRef }
			autoComplete={ autoComplete || 'off' }
			pattern={ pattern || '[0-9 ]*' }
			title={ title || 'Only numbers and spaces are allowed' }
			onChange={ handleChange }
			onKeyDown={ handleKeyDown }
			data-1p-ignore // Prevent 1Password from showing up
		/>
	);
}
