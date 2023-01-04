/**
 * WordPress dependencies
 */
import { Card, CardBody, CardHeader } from '@wordpress/components';
import { Icon, cancelCircleFilled, check, chevronRight, warning } from '@wordpress/icons';

/**
 * Render the Account Status.
 */
export default function AccountStatus( { clickScreenLink, userRecord } ) {
	const { record }        = userRecord;
	const emailStatus       = record.pending_email ? 'pending' : 'ok';
	const totpStatus        = Object.values( record['2fa_enabled_providers'] ).includes( 'Two_Factor_Totp' ) ? 'enabled' : 'disabled';
	const backupCodesStatus = Object.values( record['2fa_enabled_providers'] ).includes( 'Two_Factor_Backup_Codes' ) &&
								record['2fa_backup_codes_remaining'] > 0 ? 'enabled' : 'disabled';

	return (
		<>
			<SettingStatusCard
				screen="password"
				status="enabled"
				headerText="Password"
				bodyText="You have a password configured, but can change it at any time."
				clickScreenLink={ clickScreenLink }
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
				clickScreenLink={ clickScreenLink }
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
				clickScreenLink={ clickScreenLink }
			/>

			<SettingStatusCard
				screen="backup-codes"
				status={ backupCodesStatus }
				headerText="Two-Factor Backup Codes"
				bodyText={ `You have ${ 'enabled' === backupCodesStatus ? '' : 'not' } verified your backup codes for two-factor authentication.` }
				clickScreenLink={ clickScreenLink }
			/>
		</>
	);
}

/**
 * Render a card for the status of the given setting.
 */
function SettingStatusCard( { screen, status, headerText, bodyText, clickScreenLink } ) {
	// todo maybe use context for clickScreenLink instead of drilling

	let screenUrl = new URL( document.location.href );
	screenUrl.searchParams.set( 'screen', screen );

	return (
		<Card className={ 'wporg-2fa__status-card wporg-2fa__status-card-' + screen }>
			<a
				href={ screenUrl.href }
				onClick={ ( event ) => clickScreenLink( event, screen ) }
			>
				<CardHeader>
					<StatusIcon status={ status } />
					{ headerText }
				</CardHeader>

				<CardBody>
					<p>{ bodyText }</p>
					<Icon icon={ chevronRight } />
				</CardBody>
			</a>
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
			className={ 'wporg-2fa__status-icon is-' + status }
		/>
	);
}
