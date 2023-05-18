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
 * @param props.autoComplete
 * @param props.pattern
 * @param props.title
 * @param props.onChange
 * @param props.onFocus
 * @param props.onKeyDown
 * @param props.onKeyUp
 * @param props.index
 * @param props.value
 * @param props.maxLength
 * @param props.required
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/number#accessibility
 * @see https://technology.blog.gov.uk/2020/02/24/why-the-gov-uk-design-system-team-changed-the-input-type-for-numbers/
 * @see https://stackoverflow.com/a/66759105/450127
 */
export default function NumericControl( {
	autoComplete,
	pattern,
	title,
	onChange,
	onFocus,
	onKeyDown,
	onKeyUp,
	index,
	value,
	maxLength,
	required,
} ) {
	const inputRef = useRef( null );

	const createHandler = ( handler ) => ( event ) =>
		// Most callers will only need the value, so make it convenient for them.
		handler && handler( event.target.value, event, index, inputRef.current );

	const handleChange = useCallback( createHandler( onChange ), [] );

	const handleFocus = useCallback( createHandler( onFocus ), [] );

	const handleKeyDown = useCallback( createHandler( onKeyDown ), [] );

	const handleKeyUp = useCallback( createHandler( onKeyUp ), [] );

	return (
		<input
			type="text"
			inputMode="numeric"
			ref={ inputRef }
			autoComplete={ autoComplete || 'off' }
			pattern={ pattern || '[0-9 ]*' }
			title={ title || 'Only numbers and spaces are allowed' }
			onChange={ handleChange }
			onFocus={ handleFocus }
			onKeyDown={ handleKeyDown }
			onKeyUp={ handleKeyUp }
			data-1p-ignore // Prevent 1Password from showing up
			value={ value }
			maxLength={ maxLength }
			required={ required }
		/>
	);
}
