/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { reactDOM, StrictMode, useState, useEffect } from '@wordpress/element';
import { Icon, arrowLeft } from '@wordpress/icons';
import { Spinner } from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as coreDataStore, useEntityRecord } from '@wordpress/core-data';

/**
 * Internal dependencies
 */
import AccountStatus from './components/account-status';
import Password from './components/password';
import EmailAddress from './components/email-address';

window.addEventListener( 'DOMContentLoaded', renderSettings );

/**
 * Render the initial view into the DOM.
 */
function renderSettings() {
	const wrapper = document.querySelector( '.wp-block-wporg-two-factor-settings' );
	if ( ! wrapper ) {
		return;
	}

	const root = ReactDOM.createRoot( wrapper );

	root.render(
	  <StrictMode>
		<Main userId={ wrapper.dataset.userid } />
	  </StrictMode>
	);
}

/**
 * Render the correct component based on the URL.
 */
function Main( { userId } ) {
	const { record: userData, edit: editUserData, hasEdits: userDataNeedsReset } = useEntityRecord( 'root', 'user', userId );

	// The index is the URL slug and the value is the React component.
	const components = {
		'account-status':    AccountStatus,
		'email':             EmailAddress,
		'password':          Password,
		'two-factor-status': TwoFactorStatus,
		'setup-totp':        SetupTOTP,
		'backup-codes':      GenerateBackupCodes,
	};

	let currentUrl    = new URL( document.location.href );
	let initialScreen = currentUrl.searchParams.get( 'screen' );

	if ( ! components[ initialScreen ] ) {
		initialScreen = 'account-status';
	}

	const [ screen, setScreen ] = useState( initialScreen );
	const CurrentScreen         = components[ screen ];

	currentUrl.searchParams.set( 'screen', screen );
	history.pushState( {}, '', currentUrl );

	/**
	 * Update the screen without refreshing the page.
	 *
	 * This is used in conjunction with real links in order to preserve deep linking and other foundational
	 * behaviors that are broken otherwise.
	 */
	function clickScreenLink( event, screen ) {
		event.preventDefault();

		// Reset to initial after navigating away from a page.
		if ( userDataNeedsReset ) {
			editUserData( userData );
		}

		setScreen( screen );
	}

	if ( ! userData ) {
		return <Spinner />
	}

	return (
		<>
			{ 'account-status' !== screen &&
				<div className="wporg-2fa__navigation">
					<a href="?screen=account-status" onClick={ ( event ) => clickScreenLink( event, 'account-status' ) }>
						<Icon icon={ arrowLeft } />
						Back
					</a>
				</div>
			}

			<div className={ 'wporg-2fa__' + screen }>
				<CurrentScreen clickScreenLink={ clickScreenLink } userId={ userId } userData={ userData } />
			</div>
		</>
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
