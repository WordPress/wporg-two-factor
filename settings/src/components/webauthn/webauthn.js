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
import ListKeys from './list-keys';

const confirm = window.confirm;

/**
 * Render the WebAuthn setting.
 */
export default function WebAuthn() {
	const {
		user: { userRecord },
	} = useContext( GlobalContext );
	const userKeys = userRecord.record[ '2fa_webauthn_keys' ];
	const backupCodesEnabled =
		userRecord.record[ '2fa_available_providers' ].includes( 'Two_Factor_Backup_Codes' );
	const [ step, setStep ] = useState( 'manage' );

	// todo this is just a placeholder. the real one would probably make an API request to save the new key,
	// and then replace userkeys with the value returned by the call
	// probably also refreshRecord( userRecord );
	const onRegisterSuccess = useCallback( () => {
		const newKeys = userRecord.record[ '2fa_webauthn_keys' ].push( {
			id: Math.random(),
			name: 'New Key',
		} );

		userRecord.edit( { '2fa_webauthn_keys': newKeys } );
		setStep( 'success' );

		if ( ! backupCodesEnabled ) {
			// todo redirect to backup codes
		}
	}, [ userRecord.record[ '2fa_webauthn_keys' ] ] );

	return (
		<>
			{ 'manage' === step && <Manage setStep={ setStep } userKeys={ userKeys } /> }

			{ 'register' === step && (
				<RegisterKey registerClickHandler={ () => setStep( 'waiting' ) } />
			) }

			{ 'waiting' === step && (
				<WaitingForSecurityKey onRegisterSuccess={ onRegisterSuccess } />
			) }

			{ 'success' === step && <Success newKeyName={ 'Test key' } setStep={ setStep } /> }
		</>
	);
}

/**
 * Render the Manage component.
 *
 * @param props
 * @param props.setStep
 * @param props.userKeys
 */
function Manage( { setStep, userKeys } ) {
	return (
		<>
			<p>
				A security key is a physical or software-based device that adds an extra layer of
				authentication and protection to online accounts. It generates unique codes or
				cryptographic signatures to verify the user&apos;s identity, offering stronger
				security than passwords alone.
			</p>

			<h4>Security Keys</h4>
			<ListKeys keys={ userKeys } />

			<p className="wporg-2fa__submit-actions">
				<Button variant="primary" onClick={ () => setStep( 'register' ) }>
					Register New Key
				</Button>

				<Button
					variant="secondary"
					onClick={ () =>
						confirm(
							'Modal H4 Disable Security Keys? p Are you sure you want to disable Security Keys? Button Cancel Button Disable'
						)
					}
				>
					Disable Security Keys
				</Button>
			</p>
		</>
	);
}

/**
 * Render the form to register new security keys.
 *
 * @param props
 * @param props.registerClickHandler
 */
function RegisterKey( { registerClickHandler } ) {
	return (
		<form>
			<TextControl label="Give the security key a name"></TextControl>

			<div className="wporg-2fa__submit-actions">
				<Button variant="primary" onClick={ registerClickHandler }>
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
 * @param props.onRegisterSuccess
 */
function WaitingForSecurityKey( { onRegisterSuccess } ) {
	// todo this is tmp placeholder to demonstrate the user activating their device
	setTimeout( () => {
		onRegisterSuccess();
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
 * @param props.setStep
 */
function Success( { newKeyName, setStep } ) {
	// todo this may actually be similar to how it's done permanently
	// need to sync this with the animation
	setTimeout( () => {
		setStep( 'manage' );
	}, 2000 );

	return (
		<>
			<p>Success! Your { newKeyName } is successfully registered.</p>

			{ /* todo replace w/ custom animation */ }
			<Icon icon={ check } />
		</>
	);
}
