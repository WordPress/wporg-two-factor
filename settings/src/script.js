/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { render } from '@wordpress/element';


// This is required for HMR to work, because we're using WP to serve the HTML instead of Webpack's localhost server.
if ( import.meta.hot ) {
	// todo replace w/ https://github.com/vitejs/vite/discussions/3143#discussioncomment-1717076 ?
	import.meta.hot.accept();
}


window.addEventListener( 'DOMContentLoaded', renderSettings );

function renderSettings() {
	const props = {};

	// todo set this to pick which function to render based on the current step
	render(
		<div { ...props }>
			<Main />
		</div>,
		document.querySelector( '.wp-block-wporg-two-factor-settings' )
	);
}

function Main() {
	const enabled = false;

	if ( enabled ) {
		return (
			"You've enabled two step..." +
			"button to disable"
		);
	}

	return(
		'You do not have two-factor auth enabled. button to enable'
	);
}

function SetupTOTP() {
	return (
		<div>
			<p>
				Two-factor auth adds an extra layer of security... once enabled...
			</p>

			<p>
				{ __( 'Scan this QR code with the authenticator app on your mobile device.', 'wporg' ) }

				<a href="">
					{ __( "Can't scan the code?", 'wporg' ) }
				</a>
			</p>

			<p>
				qr image
			</p>

			<p>
				{ __( 'Then enter the six digit code provided by the app:', 'wporg' ) }
			</p>

			<p>
				input field w/ placeholder text
			</p>

			<p>
				{ __( 'Not sure what this screen means? You may need to download Authy or Google Authenticator for your phone', 'wporg' ) }
				{/* add links to those. maybe pick different ones> */}
			</p>

			<p>
				enable button
				cancel button
			</p>
		</div>
	);
}

function GenerateBackupCodes() {
	return (
		<div>
			backup codes let you...

			we ask that you...

			list of codes in a pre/code block

			danger icon
			without access...

			checkbox
			i have printed...

			all finished button
			copy button
			print button
			download button
		</div>
	);
}
