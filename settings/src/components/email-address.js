
/**
 * WordPress dependencies
 */
import { Button, TextControl } from '@wordpress/components';

/**
 * Render the Email setting.
 */
export default function EmailAddress( { userData } ) {

	return (
		<>
			<p>
				To change your email address enter a new one below.
			</p>

			<TextControl
				type="email"
				help="We will send you a verification email after updating your email address."
				label="Your email address"
				size="62"
				placeholder="my@email.address"
				value={ userData?.email }
				onChange={ ( value ) => { console.log( value ); } }
			/>

			<p>
				<Button variant="primary" onClick={ updateEmail } disabled="disabled">
					Update Email Address
				</Button>
			</p>
		</>
	);
}

/**
 * Update the email.
 */
function updateEmail( event ) {
	console.log('save');
	// send rest api request
	// on success, update state to show that it's been saved
}