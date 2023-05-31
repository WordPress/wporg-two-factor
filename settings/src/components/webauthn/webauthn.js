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
	const [ step, setStep ] = useState( 'register' );
	// maybe rename to something more descripive, these aren't really steps, they're more like screens or subscreen or flows or something

	const enableProvider = useCallback( () => {
		// return early if already enabled
		//
		// call api to enable provider

		setStep( 'manage' );
	}, [] ); // todo any dependencies?

	const disableProvider = useCallback( () => {
		// return early if already disabled?
		//
		// call api to enable provider

		confirm(
			'TODO Modal H4 Disable Security Keys? p Are you sure you want to disable Security Keys? Button Cancel Button Disable'
		);
	}, [] ); // todo any dependencies?

	if ( 'register' === step ) {
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
				<Button variant="primary" onClick={ () => setStep( 'register' ) }>
					Register New Key
				</Button>

				<Button variant="secondary" onClick={ disableProvider }>
					Disable Security Keys
				</Button>
			</p>
		</>
	);
}
