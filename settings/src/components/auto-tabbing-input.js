/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';

/**
 * Internal dependencies
 */
import NumericControl from './numeric-control';

const AutoTabbingInput = ( props ) => {
	const { inputs, setInputs, onComplete, error } = props;

	const handleChange = useCallback( ( value, event, index, inputRef ) => {
		setInputs( ( prevInputs ) => {
			const newInputs = [ ...prevInputs ];

			// Clean input
			if ( value.trim() === '' ) {
				event.target.value = '';
				value = '';
			}

			newInputs[ index ] = value;

			// Check if all inputs are filled
			const allFilled = newInputs.every( ( input ) => '' !== input );
			if ( allFilled && onComplete ) {
				onComplete( true );
			} else {
				onComplete( false );
			}

			return newInputs;
		} );

		if ( value && '' !== value.trim() && inputRef.current.nextElementSibling ) {
			inputRef.current.nextElementSibling.focus();
		}
	}, [] );

	const handleKeyDown = useCallback( ( value, event, index, inputRef ) => {
		if ( event.key === 'Backspace' && ! value && inputRef.current.previousElementSibling ) {
			inputRef.current.previousElementSibling.focus();
		}
	}, [] );

	const handlePaste = useCallback( ( event ) => {
		const paste = event.clipboardData.getData( 'Text' ).replace( /[^0-9]/g, '' );

		if ( inputs.length === paste.length ) {
			event.preventDefault();
			setInputs( paste.split( '' ) );
			onComplete( true );
		}
	}, [] );

	return (
		<div
			className={ 'wporg-2fa__auto-tabbing-input' + ( error ? ' is-error' : '' ) }
			onPaste={ handlePaste }
		>
			{ inputs.map( ( value, index ) => (
				<NumericControl
					{ ...props }
					value={ value }
					key={ index }
					index={ index }
					onChange={ handleChange }
					onKeyDown={ handleKeyDown }
					maxLength="1"
					required
				/>
			) ) }
		</div>
	);
};

export default AutoTabbingInput;
