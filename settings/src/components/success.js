/**
 * WordPress dependencies
 */
import { useState } from '@wordpress/element';
import { Icon, check } from '@wordpress/icons';

/**
 * Render the "Success" component.
 *
 * Shows a message and animation, then calls the `afterTimeout` callback
 *
 * @param props
 * @param props.afterTimeout
 * @param props.message
 */
export default function Success( { message, afterTimeout } ) {
	const [ hasTimer, setHasTimer ] = useState( false );

	if ( ! hasTimer ) {
		// Time matches the length of the CSS animation property on .wporg-2fa__success
		setTimeout( afterTimeout, 4000 );
		setHasTimer( true );
	}

	return (
		<>
			<p className="wporg-2fa__screen-intro">{ message }</p>

			<p className="wporg-2fa__webauthn-register-key-status" aria-hidden>
				<div className="wporg-2fa__success">
					<Icon icon={ check } />
				</div>
			</p>
		</>
	);
}
