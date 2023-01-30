/**
 * WordPress dependencies
 */
import { Card, CardBody } from '@wordpress/components';
import { useContext } from '@wordpress/element';
import { Icon, cancelCircleFilled, check, chevronRight, warning } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';
import ScreenLink from './screen-link';

/**
 * Render the Account Status.
 */
export default function AccountStatus() {
	const { userRecord }    = useContext( GlobalContext );
	const { record }        = userRecord;
	const emailStatus       = record.pending_email ? 'pending' : 'ok';
	const totpStatus        = record[ '2fa_available_providers' ].includes( 'Two_Factor_Totp' ) ? 'enabled' : 'disabled';
	const backupCodesStatus = record[ '2fa_available_providers' ].includes( 'Two_Factor_Backup_Codes' ) ? 'enabled' : 'disabled';

	return (
		<>
			<SettingStatusCard
				screen="password"
				status="enabled"
				headerText="Password"
				bodyText="You have a password configured, but can change it at any time."
			/>

			<SettingStatusCard
				screen="email"
				status={ emailStatus }
				headerText="Account Email"
				bodyText={
					record.pending_email ?
					`Your account email is pending a change to ${ record.pending_email }.` :
					`Your account email address is ${ record.email }.`
				}
			/>

			<SettingStatusCard
				screen="totp"
				status={ totpStatus }
				headerText="Two Factor Authentication"
				bodyText={ 'enabled' === totpStatus ?
					/* @todo update this when hardware tokens become an additional option. */
					'You have two-factor authentication enabled using an app.' :
					'You do not have two-factor authentication enabled.'
				}
			/>

			<SettingStatusCard
				screen="backup-codes"
				status={ backupCodesStatus }
				headerText="Two-Factor Backup Codes"
				bodyText={ `You have ${ 'enabled' === backupCodesStatus ? '' : 'not' } verified your backup codes for two-factor authentication.` }
			/>
		</>
	);
}

/**
 * Render a card for the status of the given setting.
 */
function SettingStatusCard( { screen, status, headerText, bodyText } ) {
	return (
		<Card className={ 'wporg-2fa__status-card wporg-2fa__status-card-' + screen }>
			<ScreenLink
				screen={ screen }
				anchorText={
					<CardBody>
						<StatusIcon status={ status } />
						<h3>{ headerText }</h3>
						<p>{ bodyText }</p>
						<Icon icon={ chevronRight } size={ 26 } className="wporg-2fa__status-card-open" />
					</CardBody>
				}
			/>
		</Card>
	);
}

/**
 * Render the icon for the given status
 */
function StatusIcon( { status } ) {
	let icon;

	switch ( status ) {
		case 'ok':
		case 'enabled':
			icon = check;
			break;

		case 'pending':
			icon = warning;
			break;

		case 'error':
		case 'disabled':
		default:
			icon = cancelCircleFilled;
	}

	return (
		<Icon
			icon={ icon }
			size={ 32 }
			className={ 'wporg-2fa__status-icon is-' + status }
		/>
	);
}
