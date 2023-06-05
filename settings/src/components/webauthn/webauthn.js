/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/components';
import { useCallback, useContext, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../../script';
import ListKeys from './list-keys';
import RegisterKey from './register-key';

/**
 * Global dependencies
 */
const confirm = window.confirm;
const alert = window.alert;

/**
 * Render the WebAuthn setting.
 */
export default function WebAuthn() {
	const { webAuthnEnabled, backupCodesEnabled } = useContext( GlobalContext );
	const [ flow, setFlow ] = useState( 'manage' );

	/**
	 * Handle post-registration prcessing.
	 */
	const onRegisterSuccess = useCallback( () => {
		if ( ! webAuthnEnabled ) {
			enableProvider();
		}

		if ( ! backupCodesEnabled ) {
			// TODO maybe redirect to backup codes, pending discussion.
			alert( 'redirect to backup codes' );
		} else {
			setFlow( 'manage' );
		}
	}, [ backupCodesEnabled ] );

	/**
	 * Enable the WebAuthn provider.
	 */
	const enableProvider = useCallback( () => {
		// TODO this will be done in a separate PR
		// maybe merge this into onRegisterSuccess() if it's small enough
		// call api to enable provider
		// 		have to write one? yes. neither the webauthn plugin nor the upstream plugin have one
		// 		eventually calls twofaccor::enable_provider_for_user()
		// handle failure
	}, [] ); // todo any dependencies?

	/**
	 * Disable the WebAuthn provider.
	 */
	const disableProvider = useCallback( () => {
		// TODO this will be done in a separate PR
		// Also pending outcome of https://github.com/WordPress/wporg-two-factor/issues/194#issuecomment-1564930700

		// return early if already disabled?
		// this shouldn't be called in the first place if that's the case, maybe the button should be disabled or not even shown
		//
		// call api to disable provider
		// handle failure

		confirm(
			'TODO Modal H4 Disable Security Keys? p Are you sure you want to disable Security Keys? Button Cancel Button Disable'
		);

		// refresuserRecord should result in this screen re-rendering with the enable button visible instead of the disable button
	}, [] ); // todo any dependencies?

	if ( 'register' === flow ) {
		return (
			<RegisterKey onSuccess={ onRegisterSuccess } onCancel={ () => setFlow( 'manage' ) } />
		);
	}

	return (
		<>
			<p>
				A security key is a physical or software-based device that adds an extra layer of
				authentication and protection to online accounts. It generates unique codes or
				cryptographic signatures to verify the user&apos;s identity, offering stronger
				security than passwords alone.
			</p>

			<h4>Security Keys</h4>

			<ListKeys />

			<p className="wporg-2fa__submit-actions">
				<Button variant="primary" onClick={ () => setFlow( 'register' ) }>
					Register New Key
				</Button>

				<Button variant="secondary" onClick={ disableProvider }>
					Disable Security Keys
					{ /* TODO change this to Enable if the provider is disabled? */ }
				</Button>
			</p>
		</>
	);
}
