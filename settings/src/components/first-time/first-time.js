/**
 * WordPress dependencies
 */
import { useEffect, useContext, useRef } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { lock, edit, reusableBlock } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import ScreenNavigation from '../screen-navigation';
import TOTP from '../totp';
import WebAuthn from '../webauthn/webauthn';
import BackupCodes from '../backup-codes';
import SetupProgressBar from './setup-progress-bar';
import Home from './home';
import WordPressLogo from './wordpress-logo';
import { GlobalContext } from '../../script';

/**
 * Check if the URL is valid. Make sure it stays on wordpress.org.
 *
 * @param  url
 * @return {boolean} Whether it's a valid URL.
 */
const isValidUrl = ( url ) => {
	try {
		const { hostname } = new URL( url );
		return hostname.endsWith( 'wordpress.org' );
	} catch ( exception ) {
		return false;
	}
};

/**
 * Render the correct component based on the URL.
 */
export default function FirstTime() {
	const modalRef = useRef( null );
	const { navigateToScreen, screen } = useContext( GlobalContext );
	const steps = [
		{
			title: 'Choose an authentication method',
			label: 'Select',
			icon: edit,
		},
		{
			title: 'Set up your authentication method',
			label: 'Configure',
			icon: lock,
		},
		{
			title: 'Print Backup Codes',
			label: 'Print',
			icon: reusableBlock,
		},
	];

	// The index is the URL slug and the value is the React component.
	const screens = {
		home: {
			stepIndex: 0,
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
			component: (
				<div className="">
					<h3>Two-factor authentication setup is now complete! 🎉</h3>
					<p>
						To ensure the highest level of security for your account, please remember to
						keep your authentication methods up-to-date. We recommend configuring
						multiple authentication methods to guarantee you always have access to your
						account.
					</p>
					<div className="wporg-2fa__submit-actions">
						<Button
							onClick={ () => {
								const redirectTo = new URLSearchParams(
									window.location.search
								).get( 'redirect_to' );

								if ( redirectTo && isValidUrl( redirectTo ) ) {
									window.location.href = redirectTo;
								} else {
									window.location.href =
										'//profiles.wordpress.org/me/profile/edit/group/3';
								}
							} }
							isPrimary
						>
							Continue
						</Button>
					</div>
				</div>
			),
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
			<ScreenNavigation
				screen={ screen }
				title={ steps[ currentStepIndex ].title }
				canNavigate={ currentStepIndex !== 0 }
			>
				<SetupProgressBar currentStepIndex={ currentStepIndex } steps={ steps } />
				{ screens[ screen ].component }
			</ScreenNavigation>
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
