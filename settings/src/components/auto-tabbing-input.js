/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';

/**
 * Internal dependencies
 */
import NumericControl from './numeric-control';

const AutoTabbingInput = ( props ) => {
	const { inputs, setInputs, error, setError } = props;

	const handleChange = useCallback( ( value, event, index ) => {
		setInputs( ( prevInputs ) => {
			const newInputs = [ ...prevInputs ];

			newInputs[ index ] = value.trim() === '' ? '' : value;

			return newInputs;
		} );
	}, [] );

	const handleKeyUp = useCallback( ( value, event, index, inputElement ) => {
		// Ignore keys associated with input navigation and paste events.
		if ( [ 'Tab', 'Shift', 'Meta' ].includes( event.key ) ) {
			return;
		}

		if ( event.key === 'Backspace' && inputElement.previousElementSibling ) {
			inputElement.previousElementSibling.focus();
		} else if ( !! value && inputElement.nextElementSibling ) {
			inputElement.nextElementSibling.focus();
		}
	}, [] );

	const handleFocus = useCallback(
		( value, event, index, inputElement ) => inputElement.select(),
		[]
	);

	const handlePaste = useCallback( ( event ) => {
		event.preventDefault();

		const newInputs = event.clipboardData
			.getData( 'Text' )
			.replace( /[^0-9]/g, '' )
			.split( '' );

		if ( inputs.length === newInputs.length ) {
			setInputs( newInputs );
		} else {
			setError( 'The code you pasted is not the correct length.' );
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
					onKeyUp={ handleKeyUp }
					onFocus={ handleFocus }
					maxLength="1"
					required
				/>
			) ) }
		</div>
	);
};

export default AutoTabbingInput;
