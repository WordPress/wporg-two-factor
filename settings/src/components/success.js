/**
 * WordPress dependencies
 */
import { Flex } from '@wordpress/components';
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
		setTimeout( afterTimeout, 5000 );
		setHasTimer( true );
	}

	return (
		<Flex className="wporg-2fa__success" direction="column">
			<p>{ message }</p>

			<div className="wporg-2fa__status-icon" aria-hidden>
				<div className="wporg-2fa__success-animation">
					<Icon icon={ check } />
				</div>
			</div>
		</Flex>
	);
}
