/**
 * WordPress dependencies
 */
import { Icon, lock, reusableBlock } from '@wordpress/icons';

export default function SetupProgressBar( { step } ) {
	return (
		<div className="wporg-2fa__progress-bar">
			<ul className="wporg-2fa__setup-steps">
				<li className={ 'totp-intro' === step ? 'is-enabled' : 'is-disabled' }>
					<Icon icon={ lock } />
					<br />
					Introduction
				</li>

				<li className={ 'totp-verify' === step ? 'is-enabled' : 'is-disabled' }>
					<Icon icon={ lock } />
					<br />
					Verify Codes
				</li>

				<li className={ 'backup-codes' === step ? 'is-enabled' : 'is-disabled' }>
					<Icon icon={ reusableBlock } />
					<br />
					Backup Codes
				</li>
			</ul>

			<ul className="wporg-2fa__setup-step-separators">
				<li className="wporg-2fa__step-separator is-enabled" />

				<li className={
					'wporg-2fa__step-separator ' +
					( 'backup-codes' === step ? 'is-enabled' : 'is-disabled' )
				} />

				<li className="wporg-2fa__step-separator is-disabled" />
			</ul>
		</div>
	);
}
