
/**
 * WordPress dependencies
 */
import { Button, TextControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { saveUser, saveEntityRecord } from '@wordpress/core-data';

/**
 * Render the Email setting.
 */
export default function EmailAddress( { userData } ) {
	const [ email, setEmail ] = useState( null );

	// TODO: This is only needed until the parent component waits for the userData to load before rendering.
	if ( null === email && userData && userData.email ) {
		setEmail( userData.email );
	}

	/**
	 * Update the email.
	 */
	function updateEmail( event ) {
		// TODO: This doesn't cause the button to go back to a disabled state afterwards.

		// send rest api request
		// on success, update state to show that it's been saved

		wp.data.dispatch('core').saveEntityRecord( 'root', 'user', { id: userData.id, email: email }, { throwOnError: true /* required for reject */ } ).then(
			( response ) => {
				console.log( "Success ", response );
				userData = response;
				alert( "Email has been updated" );
			},
			( error ) => {
				console.log( "Error", error );
				alert( error.message );
			}
		);
/*
		// This is the same as above, except that upon failure it never rejects, as throwOnError isn't settable.
		wp.data.dispatch( 'core' ).saveUser( { id: userData.id, email: email } ).then(
			( response ) => {
				if ( ! response ) {
					// Error occured during the save... Response data unavailable.
					return;
				}

				console.log( "Success ", response );

				userData = response;
				alert( "Email has been updated" );
			},
			( error ) => {
				// Never called, the promise is always resolved as successful.
				console.log( "Error", error );
				alert( error.message );
			}
		);
*/
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