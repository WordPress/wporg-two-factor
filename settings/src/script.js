/**
 * WordPress dependencies
 */
import { render } from '@wordpress/element';

window.addEventListener( 'DOMContentLoaded', function() {
	const props = {};

	render(
		<div { ...props }>
			hello!
		</div>,
		document.querySelector( '.wp-block-wporg-two-factor-settings' )
	);
} );
