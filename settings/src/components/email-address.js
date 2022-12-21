
/**
 * WordPress dependencies
 */
import { Button, TextControl } from '@wordpress/components';
import { useState } from '@wordpress/element';

/**
 * Render the Email setting.
 */
export default function EmailAddress( { userData } ) {
	const [ email, setEmail ] = useState( null );

	// TODO: This is only needed until the parent component waits for the userData to load before rendering.
	if ( null === email && userData && userData.email ) {
		setEmail( userData.email );
	}

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
				placeholder="my-email-address@example.org"
				value={ email || '' }
				onChange={ ( value ) => setEmail( value ) }
			/>

			<p>
				<Button variant="primary" onClick={ updateEmail } disabled={ email == userData?.email }>
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