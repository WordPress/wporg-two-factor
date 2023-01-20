/**
 * WordPress dependencies
 */
import { Icon, lock, reusableBlock } from '@wordpress/icons';

export default function SetupProgressBar( { step } ) {
	return (
		<ul className="wporg-2fa__setup-steps">
			<li className={ 'totp' === step ? 'is-enabled' : 'is-disabled' }>
				<Icon icon={ lock } />
				Verify Codes
			</li>

			<li className={ 'backup-codes' === step ? 'is-enabled' : 'is-disabled' }>
				<Icon icon={ reusableBlock } />
				Backup Codes
			</li>
		</ul>
	);
}
