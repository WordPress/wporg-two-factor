/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { render } from '@wordpress/element';

window.addEventListener( 'DOMContentLoaded', renderSettings );

/**
 * Render the initial view into the DOM.
 */
function renderSettings() {
	const props = {};

	// todo might need to render different functions based on the current step
	// use history.pushstate to preserve deep urls
	render(
		<div { ...props }>
			<Main />
		</div>,
		document.querySelector( '.wp-block-wporg-two-factor-settings' )
	);
}

/**
 * Render an overview of all the Account settings.
 * todo update description if more logic is added to this
 */
function Main() {
	const enabled = false;
	// todo use core user meta data store? or create an upstream API endpoint for this?

	return (
		<>
			<EmailAddress />
			<Password />
			<Language />

			{ enabled && <TwoFactorStatus /> }
			{ ! enabled && <SetupTOTP /> }
		</>
	);
}

/**
 * Render the Email setting.
 */
function EmailAddress() {
	return (
		<p>
			Email:
			input field
		</p>
	);
}

/**
 * Render the Password setting.
 */
function Password() {
	return (
		<p>
			Password:
			Generate Password button
		</p>
	);
}

/**
 * Render the Language setting.
 */
function Language() {
	return (
		<p>
			Language:
			dropdown field
		</p>
	);
}

/**
 * Render the user's 2FA status.
 */
function TwoFactorStatus() {
	return(
		<>
			<p>
				"You've enabled TOTP..." +
				"button to disable"
			</p>

			<p>
				"backup codes let you..."
				type a backup code to verify
			</p>
		</>
	);
}

/**
 * Render the view for setting up TOTP.
 */
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

/**
 * Render the view for generating backup codes.
 */
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
