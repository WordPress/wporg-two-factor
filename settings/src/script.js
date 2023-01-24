/**
 * WordPress dependencies
 */
import { StrictMode, createContext, useCallback, useState } from '@wordpress/element';
import { Icon, arrowLeft } from '@wordpress/icons';
import { Card, CardHeader, CardBody, Flex, Spinner } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { getUserRecord } from './utilities';
import AccountStatus from './components/account-status';
import Password from './components/password';
import EmailAddress from './components/email-address';
import TOTP from './components/totp';
import BackupCodes from './components/backup-codes';
import GlobalNotice from './components/global-notice';

export const GlobalContext = createContext( null );
// todo change all components to use this instead of being passed userrecord etc

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
	const [ globalNotice, setGlobalNotice ]       = useState( '' );

	// The index is the URL slug and the value is the React component.
	const components = {
		'account-status': AccountStatus,
		'email':          EmailAddress,
		'password':       Password,
		'totp':           TOTP,
		'backup-codes':   BackupCodes,
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

		setGlobalNotice( '' );
		setScreen( screen );
	}, [] );

	if ( ! hasResolved ) {
		return <Spinner />;
	}

	let screenContent;

	if ( 'account-status' === screen ) {
		screenContent = (
			<div className={ 'wporg-2fa__' + screen }>
				<AccountStatus clickScreenLink={ clickScreenLink } userRecord={ userRecord } />
			</div>
		);

	} else {
		screenContent = (
			<Card>
				<CardHeader className="wporg-2fa__navigation" size="xSmall">
					<Flex>
						<a
							href="?screen=account-status"
							onClick={ ( event ) => clickScreenLink( event, 'account-status' ) }
						>
							<Icon icon={ arrowLeft } />
							Back
						</a>

						<h3>{ screen.replace( '-', ' ' ).replace( 'totp', 'One Time Passwords' ) }</h3>
					</Flex>
				</CardHeader>

				<CardBody className={ 'wporg-2fa__' + screen }>
					<CurrentScreen clickScreenLink={ clickScreenLink } userRecord={ userRecord } />
				</CardBody>
			</Card>
		);
	}

	return (
		<GlobalContext.Provider value={ { clickScreenLink, userRecord, setGlobalNotice } }>
			<GlobalNotice notice={ globalNotice } />
			{ screenContent }
		</GlobalContext.Provider>
	);
}
