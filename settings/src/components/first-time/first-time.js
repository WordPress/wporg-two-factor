/**
 * WordPress dependencies
 */
import { useContext } from '@wordpress/element';

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
import { GlobalContext } from '../../script';

/**
 * Render the correct component based on the URL.
 */
export default function FirstTime() {
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
			title: 'Set up an authenticator app',
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
			title: 'Generate backup codes',
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
				<SetupProgressBar
					currentStepIndex={ currentStepIndex }
					steps={ [ 'Select', 'Configure', 'Generate codes' ] }
				/>
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
		<div className="wporg-2fa__first-time">
			<div className={ `wporg-2fa__first-time__inner-content ${ screen }` }>
				{ currentScreenComponent }
			</div>
		</div>
	);
}
