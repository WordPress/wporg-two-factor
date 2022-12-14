/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { render, useState } from '@wordpress/element';

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
 * Render the correct component based on the URL.
 */
function Main() {
	// The index is the URL slug and the value is the React component.
	const components = {
		'account-status': AccountStatus,
		'email' : EmailAddress,
		'password': Password,
		'language': Language,
		'two-factor-status': TwoFactorStatus,
		'setup-totp': SetupTOTP,
		'backup-codes': GenerateBackupCodes,
	};

	let currentUrl    = new URL( document.location.href )
	let initialScreen = currentUrl.searchParams.get( 'screen' );

	if ( ! components[ initialScreen ] ) {
		initialScreen = 'account-status';
	}

	const [ screen, setScreen ] = useState( initialScreen );
	const CurrentScreen         = components[ screen ];

	currentUrl.searchParams.set( 'screen', screen );
	history.pushState( {}, '', currentUrl );

	return (
		<CurrentScreen />
	);
}

/**
 * Render the Account Status.
 */
function AccountStatus() {
	// todo need to update state when clicked, but bad practice to pass a setState() handler into a child?

	return (
		<>
			<p>
				<a href="?screen=password" onClick={ () => setCurrentScreen( 'password' ) }>
					Password
					You have a password configured, but can change it at any time.
				</a>
			</p>

			<p>
				<a href="?screen=email" onClick={ () => setCurrentScreen( 'email' ) }>
					Account Email
					Your account email address is foo@bar.com.
				</a>
			</p>

			<p>
				<a href="?screen=two-factor-status" onClick={ () => setCurrentScreen( 'two-factor-status' ) }>
					Two Factor Authentication
					You have two-factor authentication enabled using an app.
				</a>
			</p>

			<p>
				<a href="?screen=backup-codes" onClick={ () => setCurrentScreen( 'backup-codes' ) }>
					Two-Factor Backup Codes
					You have verified your backup codes for two-factor authentication.
				</a>
			</p>
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
	const totpEnabled = false;
	// todo use core user meta data store? or create an upstream API endpoint for this?

	//{ totpEnabled && <TwoFactorStatus /> }
	//{ ! totpEnabled && <SetupTOTP /> }

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
