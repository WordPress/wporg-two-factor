/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/components';
import { useCallback, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import ListKeys from './list-keys';
import RegisterKey from './register-key';

/**
 * Global dependencies
 */
const confirm = window.confirm;

/**
 * Render the WebAuthn setting.
 */
export default function WebAuthn() {
	const [ flow, setFlow ] = useState( 'manage' );

	/**
	 * Enable the WebAuthn provider.
	 */
	const enableProvider = useCallback( () => {
		// return early if already enabled
		//
		// call api to enable provider
		// handle failure

		setFlow( 'manage' );
	}, [] ); // todo any dependencies?

	/**
	 * Disable the WebAuthn provider.
	 */
	const disableProvider = useCallback( () => {
		// return early if already disabled?
		// this shouldn't be called in the first place if that's the case, maybe the button should be disabled or not even shown
		//
		// call api to enable provider
		// handle failure

		confirm(
			'TODO Modal H4 Disable Security Keys? p Are you sure you want to disable Security Keys? Button Cancel Button Disable'
		);

		// refresuserRecord should result in this screen re-rendering with the enable button visible instead of the disable button
	}, [] ); // todo any dependencies?

	if ( 'register' === flow ) {
		return <RegisterKey onSuccess={ enableProvider } />;
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
