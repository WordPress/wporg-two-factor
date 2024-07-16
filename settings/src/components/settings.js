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

import { GlobalContext } from '../script';

/**
 * Render the correct component based on the URL.
 */
export default function Settings() {
	const { backupCodesEnabled, navigateToScreen, screen } = useContext( GlobalContext );

	// The index is the URL slug and the value is the React component.
	const components = {
		home: <AccountStatus />,
		email: <EmailAddress />,
		password: <Password />,
		totp: (
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
		'backup-codes': <BackupCodes />,
		webauthn: <WebAuthn />,
	};

	const currentScreenComponent =
		'home' === screen ? (
			components[ screen ]
		) : (
			<ScreenNavigation screen={ screen }>{ components[ screen ] }</ScreenNavigation>
		);

	return <>{ currentScreenComponent }</>;
}
