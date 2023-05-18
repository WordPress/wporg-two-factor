/**
 * WordPress dependencies
 */
import {
	StrictMode,
	createContext,
	useCallback,
	useEffect,
	useState,
	createRoot,
} from '@wordpress/element';
import { Icon, chevronLeft } from '@wordpress/icons';
import { Card, CardHeader, CardBody, Spinner } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { useGetUserRecord } from './utilities';
import ScreenLink from './components/screen-link';
import AccountStatus from './components/account-status';
import Password from './components/password';
import EmailAddress from './components/email-address';
import TOTP from './components/totp';
import BackupCodes from './components/backup-codes';
import GlobalNotice from './components/global-notice';
import RevalidateModal from './components/revalidate-modal';

export const GlobalContext = createContext( null );

window.addEventListener( 'DOMContentLoaded', renderSettings );

/**
 * Render the initial view into the DOM.
 */
function renderSettings() {
	const wrapper = document.querySelector( '.wp-block-wporg-two-factor-settings' );
	if ( ! wrapper ) {
		return;
	}

	const root = createRoot( wrapper );

	root.render(
		<StrictMode>
			<Main userId={ parseInt( wrapper.dataset.userId ) } />
		</StrictMode>
	);
}

/**
 * Render the correct component based on the URL.
 *
 * @param props
 * @param props.userId
 */
function Main( { userId } ) {
	const userRecord = useGetUserRecord( userId );
	const { record, edit, hasEdits, hasResolved } = userRecord;
	const [ globalNotice, setGlobalNotice ] = useState( '' );
	let currentUrl = new URL( document.location.href );

	// The index is the URL slug and the value is the React component.
	const components = {
		'account-status': AccountStatus,
		email: EmailAddress,
		password: Password,
		totp: TOTP,
		'backup-codes': BackupCodes,
	};

	// The screens where a recent two factor challenge is required.
	const twoFactorRequiredScreens = [ 'totp', 'backup-codes' ];

	let initialScreen = currentUrl.searchParams.get( 'screen' );

	if ( ! components[ initialScreen ] ) {
		initialScreen = 'account-status';
		currentUrl.searchParams.set( 'screen', initialScreen );
		window.history.pushState( {}, '', currentUrl );
	}

	const [ screen, setScreen ] = useState( initialScreen );
	const CurrentScreen = components[ screen ];

	// Listen for back/forward button clicks.
	useEffect( () => {
		window.addEventListener( 'popstate', handlePopState );

		return () => {
			window.removeEventListener( 'popstate', handlePopState );
		};
	}, [] );

	// Trigger a re-render when the back/forward buttons are clicked.
	const handlePopState = useCallback( () => {
		currentUrl = new URL( document.location.href );
		const newScreen = currentUrl.searchParams.get( 'screen' );

		if ( newScreen ) {
			setScreen( newScreen );
		}
	}, [] );

	/**
	 * Update the screen without refreshing the page.
	 *
	 * This is used in conjunction with real links in order to preserve deep linking and other foundational
	 * behaviors that are broken otherwise.
	 */
	const clickScreenLink = useCallback(
		( event, nextScreen ) => {
			event.preventDefault();

			// Reset to initial after navigating away from a page.
			if ( hasEdits ) {
				edit( record );
			}

			currentUrl = new URL( document.location.href );
			currentUrl.searchParams.set( 'screen', nextScreen );
			window.history.pushState( {}, '', currentUrl );

			setGlobalNotice( '' );
			setScreen( nextScreen );
		},
		[ hasEdits ]
	);

	if ( ! hasResolved ) {
		return <Spinner />;
	}

	const { '2fa_available_providers': availableProviders, '2fa_revalidation': revalidation } =
		record;
	// Check that there are providers, and that there isn't only backup codes.
	const hasPrimaryProvider =
		!! availableProviders.length &&
		! (
			availableProviders.length === 1 && availableProviders[ 0 ] === 'Two_Factor_Backup_Codes'
		);

	let screenContent = (
		<Card>
			<CardHeader className="wporg-2fa__navigation" size="xSmall">
				<ScreenLink
					screen="account-status"
					ariaLabel="Back to the account status page"
					anchorText={
						<>
							<Icon icon={ chevronLeft } />
							Back
						</>
					}
				/>

				<h3>
					{ screen.replace( '-', ' ' ).replace( 'totp', 'Two-Factor Authentication' ) }
				</h3>
			</CardHeader>

			<CardBody className={ 'wporg-2fa__' + screen }>
				<CurrentScreen />
			</CardBody>
		</Card>
	);

	if ( 'account-status' === screen ) {
		screenContent = <AccountStatus />;
	} else if (
		twoFactorRequiredScreens.includes( screen ) &&
		hasPrimaryProvider &&
		revalidation?.expires_at <= new Date().getTime() / 1000
	) {
		screenContent = (
			<>
				<AccountStatus />
				<RevalidateModal />
			</>
		);
	}

	return (
		<GlobalContext.Provider value={ { clickScreenLink, userRecord, setGlobalNotice } }>
			<GlobalNotice notice={ globalNotice } setNotice={ setGlobalNotice } />
			{ screenContent }
		</GlobalContext.Provider>
	);
}
