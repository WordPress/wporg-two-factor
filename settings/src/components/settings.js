/**
 * WordPress dependencies
 */
import { useContext } from '@wordpress/element';

/**
 * Internal dependencies
 */
import ScreenNavigation from './screen-navigation';
import AccountStatus from './account-status';
import Password from './password';
import EmailAddress from './email-address';
import TOTP from './totp';
import WebAuthn from './webauthn/webauthn';
import BackupCodes from './backup-codes';
import SVNPassword from './svn-password';

import { GlobalContext } from '../script';

/**
 * Render the correct component based on the URL.
 */
export default function Settings() {
	const { backupCodesEnabled, navigateToScreen, screen } = useContext( GlobalContext );

	// The index is the URL slug and the value is the React component.
	const components = {
		email: {
			title: 'Account email',
			component: <EmailAddress />,
		},
		password: {
			title: 'Password',
			component: <Password />,
		},
		totp: {
			title: 'Two-factor authentication',
			component: (
				<TOTP
					onSuccess={ () => {
						if ( ! backupCodesEnabled ) {
							navigateToScreen( 'backup-codes' );
						} else {
							navigateToScreen( 'home' );
						}
					} }
				/>
			),
		},
		'backup-codes': {
			title: 'Backup codes',
			component: <BackupCodes onSuccess={ () => navigateToScreen( 'home' ) } />,
		},
		webauthn: {
			title: 'Two-factor security key',
			component: (
				<WebAuthn
					onKeyAdd={ () => {
						if ( ! backupCodesEnabled ) {
							navigateToScreen( 'backup-codes' );
						}
					} }
				/>
			),
		},
		'svn-password': {
			title: 'SVN credentials',
			component: <SVNPassword />,
		},
	};

	const currentScreenComponent =
		'home' === screen ? (
			<AccountStatus />
		) : (
			<ScreenNavigation screen={ screen } title={ components[ screen ].title }>
				{ components[ screen ].component }
			</ScreenNavigation>
		);

	return currentScreenComponent;
}
