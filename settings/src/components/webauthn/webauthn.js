/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/components';
import { useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import ListKeys from './list-keys';
import { RegisterKey, WaitingForSecurityKey, Success } from './register';

/**
 * Global dependencies
 */
const confirm = window.confirm;

/**
 * Render the WebAuthn setting.
 */
export default function WebAuthn() {
	const [ step, setStep ] = useState( 'manage' );

	return (
		<>
			{ 'manage' === step && <Manage setStep={ setStep } /> }

			{ 'register' === step && (
				<RegisterKey registerClickHandler={ () => setStep( 'waiting' ) } />
				// convert to named func that makes api call to register key
				// handle failure
			) }

			{ 'waiting' === step && <WaitingForSecurityKey /> }

			{ 'success' === step && <Success newKeyName={ 'Test key' } setStep={ setStep } /> }
		</>
	);
}

/**
 * Render the Manage component.
 *
 * @param props
 * @param props.setStep
 */
function Manage( { setStep } ) {
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
