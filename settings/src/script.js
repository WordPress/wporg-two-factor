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
import { Spinner } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { useUser } from './utilities';
import ScreenNavigation from './components/screen-navigation';
import AccountStatus from './components/account-status';
import Password from './components/password';
import EmailAddress from './components/email-address';
import TOTP from './components/totp';
import WebAuthn from './components/webauthn/webauthn';
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
	const user = useUser( userId );
	const {
		userRecord: { record, edit, hasEdits, hasResolved },
		hasPrimaryProvider,
		hasBackupCodesPrinted,
		setHasBackupCodesPrinted,
	} = user;
	const [ globalNotice, setGlobalNotice ] = useState( '' );
	const [ error, setError ] = useState( '' );

	let currentUrl = new URL( document.location.href );
	let initialScreen = currentUrl.searchParams.get( 'screen' );
	const [ screen, setScreen ] = useState( initialScreen );

	// The index is the URL slug and the value is the React component.
	const components = {
		'account-status': <AccountStatus />,
		email: <EmailAddress />,
		password: <Password />,
		totp: <TOTP />,
		'backup-codes': <BackupCodes setScreen={ setScreen } />,
	};

	// TODO: Only enable WebAuthn UI in development, until it's finished.
	if ( 'development' === process.env.NODE_ENV ) {
		components.webauthn = <WebAuthn />;
	}

	// The screens where a recent two factor challenge is required.
	const twoFactorRequiredScreens = [ 'webauthn', 'totp', 'backup-codes' ];

	if ( ! components[ initialScreen ] ) {
		initialScreen = 'account-status';
		currentUrl.searchParams.set( 'screen', initialScreen );
		window.history.pushState( {}, '', currentUrl );
	}

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
	 *
	 * @param currentScreen Optional. Only needed when you'd like to do some processing on the current screen before navigating away.
	 * @param nextScreen    Next screen you're navigating to
	 */
	const navigateToScreen = useCallback(
		( { currentScreen, nextScreen } ) => {
			if ( 'backup-codes' === currentScreen && ! hasBackupCodesPrinted ) {
				setError( {
					code: 'checkbox_confirmation_required',
					message: 'Confirmation is required. Please check the checkbox to continue.',
				} );
				return;
			}

			// Reset to initial after navigating away from a page.
			// Note: password was initially not in record, this would prevent incomplete state
			// from resetting when leaving the password setting page.
			// See https://github.com/WordPress/wporg-two-factor/issues/117#issuecomment-1515693367.
			if ( hasEdits ) {
				edit( {
					...record,
					password: undefined,
				} );
			}

			currentUrl = new URL( document.location.href );
			currentUrl.searchParams.set( 'screen', nextScreen );
			window.history.pushState( {}, '', currentUrl );

			setError( '' );
			setGlobalNotice( '' );
			setScreen( nextScreen );
		},
		[ hasEdits, hasBackupCodesPrinted ]
	);

	if ( ! hasResolved ) {
		return <Spinner />;
	}

	const currentScreenComponent =
		'account-status' === screen ? (
			components[ screen ]
		) : (
			<ScreenNavigation screen={ screen }>{ components[ screen ] }</ScreenNavigation>
		);

	const isRevalidationExpired =
		twoFactorRequiredScreens.includes( screen ) &&
		hasPrimaryProvider &&
		record[ '2fa_revalidation' ]?.expires_at <= new Date().getTime() / 1000;

	const shouldRevalidate = 'revalidation_required' === error.code || isRevalidationExpired;

	return (
		<GlobalContext.Provider
			value={ {
				navigateToScreen,
				user,
				setGlobalNotice,
				setError,
				error,
				hasBackupCodesPrinted,
				setHasBackupCodesPrinted,
			} }
		>
			<GlobalNotice notice={ globalNotice } setNotice={ setGlobalNotice } />
			{ currentScreenComponent }
			{ shouldRevalidate && <RevalidateModal /> }
		</GlobalContext.Provider>
	);
}
