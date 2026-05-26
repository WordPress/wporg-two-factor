/**
 * WordPress dependencies
 */
import {
	StrictMode,
	createContext,
	useCallback,
	useEffect,
	useRef,
	useState,
	createRoot,
} from '@wordpress/element';
import { Spinner } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { useUser } from './hooks/useUser';
import GlobalNotice from './components/global-notice';
import RevalidateModal from './components/revalidate-modal';
import Settings from './components/settings';
import FirstTime from './components/first-time/first-time';

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
			<Main
				userId={ parseInt( wrapper.dataset.userId ) }
				isOnboarding={ wrapper.dataset.isOnboarding === 'true' }
			/>
		</StrictMode>
	);
}

/**
 * Render the correct component based on the URL.
 *
 * @param props
 * @param props.userId
 * @param props.isOnboarding
 */
function Main( { userId, isOnboarding } ) {
	const user = useUser( userId );
	const {
		userRecord: { record, edit, hasEdits, hasResolved },
		hasPrimaryProvider,
	} = user;
	const [ globalNotice, setGlobalNotice ] = useState( '' );
	const [ error, setError ] = useState( '' );
	const [ backupCodesVerified, setBackupCodesVerified ] = useState( true );

	const currentUrl = useRef( new URL( document.location.href ) );
	const initialScreen = currentUrl.current.searchParams.get( 'screen' );
	const [ screen, setScreen ] = useState( initialScreen === null ? 'home' : initialScreen );

	// The screens where a recent two factor challenge is required.
	const twoFactorRequiredScreens = [
		'webauthn',
		'totp',
		'backup-codes',
		'svn-password',
		'application-passwords',
	];

	// Trigger a re-render when the back/forward buttons are clicked.
	const handlePopState = useCallback( () => {
		currentUrl.current = new URL( document.location.href );
		const newScreen = currentUrl.current.searchParams.get( 'screen' );

		if ( newScreen ) {
			setScreen( newScreen );
		}
	}, [] );

	// Listen for back/forward button clicks.
	useEffect( () => {
		window.addEventListener( 'popstate', handlePopState );

		return () => {
			window.removeEventListener( 'popstate', handlePopState );
		};
	}, [ handlePopState ] );

	useEffect( () => {
		const currentScreen = currentUrl.current.searchParams.get( 'screen' );

		// Only update the URL if it is out of sync with the current screen,
		// and avoid adding a new history entry to prevent duplicates.
		if ( currentScreen !== screen ) {
			currentUrl.current.searchParams.set( 'screen', screen );
			window.history.replaceState( {}, '', currentUrl.current );
		}
	}, [ screen ] );

	/**
	 * Update the screen without refreshing the page.
	 *
	 * This is used in conjunction with real links in order to preserve deep linking and other foundational
	 * behaviors that are broken otherwise.
	 */
	const navigateToScreen = useCallback(
		( nextScreen ) => {
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

			currentUrl.current = new URL( document.location.href );
			currentUrl.current.searchParams.set( 'screen', nextScreen );
			window.history.pushState( {}, '', currentUrl.current );

			setError( '' );
			setGlobalNotice( '' );
			setScreen( nextScreen );
		},
		[ hasEdits, edit, record ]
	);

	if ( ! hasResolved ) {
		return (
			<div className="initial-load">
				<Spinner />
			</div>
		);
	}

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
				backupCodesVerified,
				setBackupCodesVerified,
				setScreen,
				screen,
			} }
		>
			<GlobalNotice notice={ globalNotice } setNotice={ setGlobalNotice } />
			{ isOnboarding ? <FirstTime /> : <Settings /> }
			{ shouldRevalidate && <RevalidateModal /> }
		</GlobalContext.Provider>
	);
}
