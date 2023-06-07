/**
 * WordPress dependencies
 */
import { Button, Notice, Spinner, TextControl } from '@wordpress/components';
import { useCallback, useContext, useState } from '@wordpress/element';
import { Icon, check, cancelCircleFilled } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../../script';
import { refreshRecord } from '../../utilities';
import {
	preparePublicKeyCreationOptions,
	preparePublicKeyCredential,
} from '../../utilities/webauthn';

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

				await wp.ajax.post( 'webauthn_register', {
					user_id: record.id,
					_ajax_nonce: nonce,
					name: keyName,
					credential: JSON.stringify( preparePublicKeyCredential( credential ) ),
				} );

				await refreshRecord( userRecord );
				setStep( 'success' );
			} catch ( exception ) {
				setError( exception?.message || exception?.responseJSON?.data || exception );
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
		return <Success newKeyName={ keyName } afterTimeout={ onSuccess } />;
	}

	return (
		<form onSubmit={ onRegister }>
			<TextControl
				label="Give the security key a name"
				onChange={ ( name ) => setKeyName( name ) }
				value={ keyName }
				required
			/>

			<div className="wporg-2fa__submit-actions">
				<Button type="submit" variant="primary" disabled={ registerCeremonyActive }>
					Register Key
				</Button>

				<Button variant="secondary" onClick={ onCancel }>
					Cancel
				</Button>
			</div>

			{ registerCeremonyActive && (
				<p>
					<Spinner />
				</p>
			) }

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

			<p>
				<Spinner />
			</p>
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
 * @param props.afterTimeout
 */
function Success( { newKeyName, afterTimeout } ) {
	const [ hasTimer, setHasTimer ] = useState( false );

	if ( ! hasTimer ) {
		// TODO need to sync this timing with the animation below
		setTimeout( afterTimeout, 2000 );
		setHasTimer( true );
	}

	return (
		<>
			<p>Success! Your { newKeyName } is successfully registered.</p>

			{ /* TODO replace w/ custom animation */ }
			<Icon icon={ check } />
		</>
	);
}
