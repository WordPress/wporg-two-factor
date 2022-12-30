/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { StrictMode, useCallback, useState } from '@wordpress/element';
import { Icon, arrowLeft } from '@wordpress/icons';
import { Spinner } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
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

	// todo import from wp.element once https://github.com/WordPress/gutenberg/pull/46467 lands
	const root = ReactDOM.createRoot( wrapper );

	root.render(
	  <StrictMode>
		<Main userId={ parseInt( wrapper.dataset.userId ) } />
	  </StrictMode>
	);
}

/**
 * Render the correct component based on the URL.
 */
function Main( { userId } ) {
	const userRecord                              = getUserRecord( userId );
	const { record, edit, hasEdits, hasResolved } = userRecord;

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
	const clickScreenLink = useCallback( ( event, screen ) => {
		event.preventDefault();

		// Reset to initial after navigating away from a page.
		// @todo This no longer works, maybe `userRecord` is not passed by reference between screens?
		// Also, some screens will have additional state that should be reset, but this won't have any way of
		// knowing that. So maybe just remove this?
		if ( hasEdits ) {
			edit( record );
		}

		setScreen( screen );
	}, [] );

	if ( ! hasResolved ) {
		return <Spinner />;
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
				<CurrentScreen clickScreenLink={ clickScreenLink } userRecord={ userRecord } />
			</div>
		</>
	);
}

/**
 * Fetch the user record.
 */
function getUserRecord( userId ) {
	let userRecord = useEntityRecord( 'root', 'user', userId );

	// Polyfill in isSaving.
	if ( undefined === userRecord.isSaving ) {
		userRecord.isSaving = useSelect( ( select ) => select( coreDataStore ).isSavingEntityRecord( 'root', 'user', userId ) );
	}

	return userRecord;
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
