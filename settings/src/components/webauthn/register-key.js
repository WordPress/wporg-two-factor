/**
 * WordPress dependencies
 */
import { Button, Spinner, TextControl } from '@wordpress/components';
import { useCallback, useContext, useState } from '@wordpress/element';
import { Icon, check } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../../script';

/**
 * Render the form to register new security keys.
 *
 * @param {Object}   props
 * @param {Function} props.onSuccess
 */
export default function RegisterKey( { onSuccess } ) {
	const {
		user: { userRecord },
	} = useContext( GlobalContext );

	const [ step, setStep ] = useState( 'input' );
	// have state for the key name etc?, and it gets passed down as props?

	const startRegistration = useCallback( () => {
		// call preprgister endpoint to get options and nonce
		// 	 why is this necessary? why not just ship it with the initial page build?
		// handle failure
		//
		// call navigator.credentials.create with options from previous step
		// handle failure
		//

		setStep( 'waiting' );
	}, [] );

	// TODO this is just a placeholder. the real one would probably make an API request to save the new key,
	// and then refreshRecord( userRecord );
	const onRegisterSuccess = useCallback( () => {
		const newKeys = userRecord.record[ '2fa_webauthn_keys' ].push( {
			id: Math.random(),
			name: 'New Key',
		} );

		userRecord.edit( { '2fa_webauthn_keys': newKeys } );

		setStep( 'success' );
	}, [ userRecord.record[ '2fa_webauthn_keys' ] ] );

	if ( 'waiting' === step ) {
		return <WaitingForSecurityKey onSuccess={ onRegisterSuccess } />;
	}

	if ( 'success' === step ) {
		return <Success newKeyName={ 'Test key' } onSuccess={ onSuccess } />;
	}

	return (
		<form>
			<TextControl label="Give the security key a name" />
			{ /* TODO add basic clientside validation
			what? lendth? chars?
			TextControl doesn't have anything special, just pass `maxlength`, `pattern`, etc
			*/ }

			<div className="wporg-2fa__submit-actions">
				<Button variant="primary" onClick={ startRegistration }>
					Register Key
				</Button>

				<Button variant="secondary">Cancel</Button>
			</div>
		</form>
	);
}

/**
 * Render the "waiting for security key" component.
 *
 * This is what the user sees while their browser is handling the authentication process.
 *
 * @param props
 * @param props.onSuccess
 */
function WaitingForSecurityKey( { onSuccess } ) {
	// TODO this is tmp placeholder to demonstrate the user activating their device
	setTimeout( () => {
		onSuccess();
	}, 1500 );

	return (
		<>
			<p>Waiting for security key. Connect and touch your security key to register it.</p>

			<Spinner />
		</>
	);
}

/**
 * Render the "Success" component.
 *
 * The user sees this once their security key has successfully been registered.
 *
 * @param props
 * @param props.newKeyName
 * @param props.onSuccess
 */
function Success( { newKeyName, onSuccess } ) {
	// TODO this may actually be similar to how it's done permanently
	// need to sync this with the animation
	setTimeout( () => {
		onSuccess();
	}, 2000 );

	return (
		<>
			<p>Success! Your { newKeyName } is successfully registered.</p>

			{ /* TODO replace w/ custom animation */ }
			<Icon icon={ check } />
		</>
	);
}
