/**
 * WordPress dependencies
 */
import { Card, CardBody, CardHeader } from '@wordpress/components';
import { Icon, cancelCircleFilled, check, chevronRight, warning } from '@wordpress/icons';

/**
 * Render the Account Status.
 */
export default function AccountStatus( { clickScreenLink, userData } ) {
	const emailStatus = userData?.pending_email ? 'pending' : 'ok';
	const totpStatus  = 'disabled';
	// todo make dynamic

	return (
		<>
			<SettingStatusCard
				screen="password"
				status="enabled"
				headerText="Password"
				bodyText="You have a password configured, but can change it at any time"
				clickScreenLink={ clickScreenLink }
			/>

			<SettingStatusCard
				screen="email"
				status={ emailStatus }
				headerText="Account Email"
				bodyText={
					userData?.pending_email ?
					"Your account email is pending a change to " + userData?.pending_email + "." :
					"Your account email address is " + userData?.email + "."
				}
				clickScreenLink={ clickScreenLink }
			/>

			<SettingStatusCard
				screen="two-factor-status"
				status={ totpStatus }
				headerText="Two Factor Authentication"
				bodyText="You have two-factor authentication enabled using an app."
				clickScreenLink={ clickScreenLink }
			/>

			<SettingStatusCard
				screen="backup-codes"
				status={ emailStatus }
				headerText="Two-Factor Backup Codes"
				bodyText="You have verified your backup codes for two-factor authentication."
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
