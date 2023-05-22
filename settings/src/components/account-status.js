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
	const {
		user: { userRecord, hasPrimaryProvider },
	} = useContext( GlobalContext );
	const {
		record: {
			'2fa_available_providers': availableProviders,
			email,
			pending_email: pendingEmail,
		},
	} = userRecord;
	const emailStatus = pendingEmail ? 'pending' : 'ok';
	const totpEnabled = availableProviders.includes( 'Two_Factor_Totp' );
	const backupCodesEnabled = availableProviders.includes( 'Two_Factor_Backup_Codes' );

	const backupBodyText =
		! backupCodesEnabled && ! hasPrimaryProvider
			? 'Please enable Two-Factor Authentication before enabling backup codes.'
			: `You have
				${ backupCodesEnabled ? '' : 'not' }
				verified your backup codes for two-factor authentication.`;

	return (
		<div className={ 'wporg-2fa__account-status' }>
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
					pendingEmail
						? `Your account email is pending a change to ${ pendingEmail }.`
						: `Your account email address is ${ email }.`
				}
			/>

			<SettingStatusCard
				screen="totp"
				status={ totpEnabled }
				headerText="Two-Factor Authentication"
				bodyText={
					totpEnabled
						? /* @todo update this when hardware tokens become an additional option. */
						  'You have two-factor authentication enabled using an app.'
						: 'You do not have two-factor authentication enabled.'
				}
			/>

			<SettingStatusCard
				screen="backup-codes"
				status={ backupCodesEnabled }
				headerText="Two-Factor Backup Codes"
				bodyText={ backupBodyText }
				disabled={ ! backupCodesEnabled }
			/>
		</div>
	);
}

/**
 * Render a card for the status of the given setting.
 *
 * @param props
 * @param props.screen
 * @param props.status
 * @param props.headerText
 * @param props.bodyText
 * @param props.disabled
 */
function SettingStatusCard( { screen, status, headerText, bodyText, disabled = false } ) {
	const cardContent = (
		<CardBody>
			<StatusIcon status={ status } />
			<h3 aria-label={ 'Click to enter the ' + headerText + ' setting page.' }>
				{ headerText }
			</h3>
			<p>{ bodyText }</p>
			<Icon icon={ chevronRight } size={ 26 } className="wporg-2fa__status-card-open" />
		</CardBody>
	);

	let classes = 'wporg-2fa__status-card wporg-2fa__status-card-' + screen;

	if ( disabled ) {
		classes += ' is-disabled';
	}

	return (
		<Card className={ classes }>
			{ disabled ? cardContent : <ScreenLink screen={ screen } anchorText={ cardContent } /> }
		</Card>
	);
}

/**
 * Render the icon for the given status
 *
 * @param props
 * @param props.status
 */
function StatusIcon( { status } ) {
	let icon;

	if ( 'boolean' === typeof status ) {
		status = status ? 'enabled' : 'disabled';
	}

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

	return <Icon icon={ icon } size={ 32 } className={ 'wporg-2fa__status-icon is-' + status } />;
}
