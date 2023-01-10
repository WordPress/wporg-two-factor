// todo probably delete this, just use straightforward approach like db584537ae1d919c552425c557c88360c65d8682.

/**
 * WordPress dependencies
 */
import { Card, CardBody, CardHeader } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { BackupCodes } from './backup-codes';


/**
 * Render the user's 2FA status.
 */
export default function TwoFactorStatus( { userRecord } ) {
	const emailStatus       = record.pending_email ? 'pending' : 'ok';
	const totpStatus        = Object.keys( record[ '2fa_enabled_providers' ] ).length ? 'enabled' : 'disabled';
	const backupCodesStatus = record['2fa_backup_codes_remaining'] > 0 ? 'enabled' : 'disabled';


	return(
		<>
			<Card>
				"You've enabled two-factor authenticaton  on your account — smart move! ..." +
				"button to disable"
			</Card>

			<Card>
				backup codes
				genertate new backup codes button

				<BackupCodes />
			</Card>
		</>
	);
}
