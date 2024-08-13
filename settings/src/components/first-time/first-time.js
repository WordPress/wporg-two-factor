/**
 * WordPress dependencies
 */
import { useEffect, useContext, useRef } from '@wordpress/element';
import { Button } from '@wordpress/components';

/**
 * Internal dependencies
 */
import ScreenNavigation from '../screen-navigation';
import TOTP from '../totp';
import WebAuthn from '../webauthn/webauthn';
import BackupCodes from '../backup-codes';
import SetupProgressBar from './setup-progress-bar';
import Home from './home';
import Congratulations from './congratulations';
import WordPressLogo from './wordpress-logo';
import { GlobalContext } from '../../script';

/**
 * Render the correct component based on the URL.
 */
export default function FirstTime() {
	const modalRef = useRef( null );
	const { navigateToScreen, screen } = useContext( GlobalContext );

	// The index is the URL slug and the value is the React component.
	const screens = {
		home: {
			stepIndex: 0,
			title: 'Set up two-factor authentication',
			component: (
				<Home
					onSelect={ ( val ) => {
						navigateToScreen( val );
					} }
				/>
			),
		},
		totp: {
			stepIndex: 1,
			title: 'Set up one-time password',
			component: (
				<TOTP
					onSuccess={ () => {
						navigateToScreen( 'backup-codes' );
					} }
				/>
			),
		},
		webauthn: {
			stepIndex: 1,
			title: 'Set up security key',
			component: (
				<WebAuthn
					onKeyAdd={ () => {
						navigateToScreen( 'backup-codes' );
					} }
				/>
			),
		},
		'backup-codes': {
			stepIndex: 2,
			title: 'Print backup codes',
			component: (
				<BackupCodes
					onSuccess={ () => {
						navigateToScreen( 'congratulations' );
					} }
				/>
			),
		},
		congratulations: {
			stepIndex: 3,
			component: <Congratulations />,
		},
	};

	// Lock the scroll when the modal is open, and trap tab navigation.
	useEffect( () => {
		const modal = modalRef.current;
		const focusableElements = modal.querySelectorAll(
			'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
		);
		const firstFocusableElement = focusableElements[ 0 ];
		const lastFocusableElement = focusableElements[ focusableElements.length - 1 ];

		const trapFocus = ( event ) => {
			const isTabPressed = event.key === 'Tab' || event.keyCode === 9;
			if ( ! isTabPressed ) {
				return;
			}

			if ( event.shiftKey ) {
				// eslint-disable-next-line @wordpress/no-global-active-element
				if ( document.activeElement === firstFocusableElement ) {
					lastFocusableElement.focus();
					event.preventDefault();
				}
				return;
			}

			// eslint-disable-next-line @wordpress/no-global-active-element
			if ( document.activeElement === lastFocusableElement ) {
				firstFocusableElement.focus();
				event.preventDefault();
			}
		};

		modal.addEventListener( 'keydown', trapFocus );

		document.querySelector( 'html' ).style.overflow = 'hidden';

		// Focus the first focusable element in the modal when it opens
		firstFocusableElement.focus();

		return () => {
			modal.removeEventListener( 'keydown', trapFocus );
			document.querySelector( 'html' ).style.overflow = 'initial';
		};
	}, [ screen ] );

	const currentStepIndex = screens[ screen ].stepIndex;
	let currentScreenComponent = null;

	if ( 'congratulations' === screen ) {
		currentScreenComponent = (
			<ScreenNavigation screen={ screen } title={ 'Setup complete' } canNavigate={ false }>
				{ screens[ screen ].component }
			</ScreenNavigation>
		);
	} else {
		currentScreenComponent = (
			<>
				<SetupProgressBar currentStepIndex={ currentStepIndex } stepCount={ 3 } />
				<ScreenNavigation
					screen={ screen }
					title={ screens[ screen ].title }
					canNavigate={ currentStepIndex !== 0 }
				>
					{ screens[ screen ].component }
				</ScreenNavigation>
			</>
		);
	}

	return (
		<div className="wporg-2fa__first-time" ref={ modalRef }>
			<div className="wporg-2fa__first-time__inner">
				<div className="wporg-2fa__first-time__inner-content">
					<WordPressLogo />
					{ currentScreenComponent }
				</div>
			</div>
		</div>
	);
}
