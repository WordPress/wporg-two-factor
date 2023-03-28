/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';

/**
 * Internal dependencies
 */
import NumericControl    from './numeric-control';

const AutoTabbingInput = ( props ) => {
    const  { inputs, setInputs, onComplete } = props;

    const handleChange = useCallback( (value, event, index, inputRef) => {

        setInputs((prevInputs) => {
            const newInputs = [...prevInputs];

            // Clean input
            if (value.trim() === "") {
                event.target.value = "";
                value  = "";
            }
            
            newInputs[index] = value;

            // Check if all inputs are filled
            const allFilled = newInputs.every((input) => "" !== input);
            if (allFilled && onComplete) {
                onComplete(true);
            } else {
                onComplete(false);
            }

            return newInputs;
        });

        if (value && "" !== value.trim() && inputRef.current.nextElementSibling) {
            inputRef.current.nextElementSibling.focus();
        }
    }, []);
  
    const handleKeyDown = useCallback( (value, event, index, inputRef) => {
        if (event.key === 'Backspace' && ! value && inputRef.current.previousElementSibling) {
            inputRef.current.previousElementSibling.focus();
        }
    }, []);

    return (
        <div className="wporg-2fa__auto-tabbing-input">
          {inputs.map((value, index) => (
            <NumericControl
                {...props}
                key={index}
                index={index}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                maxLength="1"
                required
            />
          ))}
        </div>
    );
  };
  
  export default AutoTabbingInput;
