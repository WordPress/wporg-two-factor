/**
 * WordPress dependencies
 */
import { Button, Notice, Spinner, TextControl } from '@wordpress/components';
import { useCallback, useContext, useState } from '@wordpress/element';
import { Icon, cancelCircleFilled } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../../script';
import { refreshRecord } from '../../utilities/common';
import {
	preparePublicKeyCreationOptions,
	preparePublicKeyCredential,
} from '../../utilities/webauthn';
import Success from '../success';

/**
 * Render the form to register new security keys.
 *
 * @param {Object}   props
 * @param {Function} props.onCancel
 * @param {Function} props.onSuccess
 */
export default function RegisterKey( { onSuccess, onCancel } ) {
	const {
		user: { userRecord },
	} = useContext( GlobalContext );
	const record = userRecord.record;
	const [ error, setError ] = useState( false );
	const [ keyName, setKeyName ] = useState( '' );
	const [ step, setStep ] = useState( 'input' );
	const [ registerCeremonyActive, setRegisterCeremonyActive ] = useState( false );

	const onRegister = useCallback(
		async ( event ) => {
			try {
				event.preventDefault();
				setRegisterCeremonyActive( true );

				const nonce = record[ '2fa_webauthn_register_nonce' ];
				const preRegisterResponse = await wp.ajax.post( 'webauthn_preregister', {
					user_id: record.id,
					_ajax_nonce: nonce,
				} );
				const publicKey = preparePublicKeyCreationOptions( preRegisterResponse.options );

				setStep( 'waiting' );

				const credential = await navigator.credentials.create( { publicKey } );

				/**
				 * The navigator.credentials.create returns null if a Credential cannot be created.
				 *
				 * Since this is an interface we won't be able to predict the reason for the failure.
				 * For now, we'll just throw an error and let the user try again.
				 *
				 * See: https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer
				 */
				if ( null === credential ) {
					throw new Error( 'Unable to create a security key.' );
				}

				await wp.ajax.post( 'webauthn_register', {
					user_id: record.id,
					_ajax_nonce: nonce,
					name: keyName,
					credential: JSON.stringify( preparePublicKeyCredential( credential ) ),
				} );

				await refreshRecord( userRecord );
				setStep( 'success' );
			} catch ( exception ) {
				// Ignore exceptions thrown by the browser when the user cancels adding the key
				if ( 'NotAllowedError' !== exception?.name ) {
					setError( exception?.message || exception?.responseJSON?.data || exception );
				}
				setStep( 'input' );
			} finally {
				setRegisterCeremonyActive( false );
			}
		},
		[ keyName ]
	);

	if ( 'waiting' === step ) {
		return <WaitingForSecurityKey />;
	}

	if ( 'success' === step ) {
		return (
			<Success
				message={ `Success! Your ${ keyName } is successfully registered.` }
				afterTimeout={ onSuccess }
			/>
		);
	}

	return registerCeremonyActive ? (
		<>
			<p>Connecting...</p>

			<div className="wporg-2fa__process-status">
				<Spinner />
			</div>
		</>
	) : (
		<form onSubmit={ onRegister }>
			<p className="wporg-2fa__screen-intro">Give the security key a name.</p>

			<TextControl
				label="Name"
				onChange={ ( name ) => setKeyName( name ) }
				value={ keyName }
				required
				data-1p-ignore // Prevent 1Password from showing up
			/>

			<p className="wporg-2fa__submit-actions">
				<Button type="submit" variant="primary" disabled={ registerCeremonyActive }>
					Register
				</Button>

				<Button variant="tertiary" onClick={ onCancel }>
					Cancel
				</Button>
			</p>

			{ error && (
				<Notice status="error" isDismissible={ false }>
					<Icon icon={ cancelCircleFilled } />
					{ error }
				</Notice>
			) }
		</form>
	);
}

/**
 * Render the "waiting for security key" component.
 *
 * This is what the user sees while their browser is handling the registration ceremony.
 *
 * @see https://www.w3.org/TR/webauthn-2/#registration-ceremony
 */
function WaitingForSecurityKey() {
	return (
		<>
			<p>Waiting for security key. Connect and touch your security key to register it.</p>

			<div className="wporg-2fa__process-status">
				<Spinner />
			</div>
		</>
	);
}
