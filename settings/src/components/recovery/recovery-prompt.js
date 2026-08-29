/**
 * WordPress dependencies
 */
import { useContext } from '@wordpress/element';
import { Notice } from '@wordpress/components';
import { Icon, warning } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../../script';
import ScreenLink from '../screen-link';

/**
 * Nudge shown on the account-status home screen when user has 2FA enabled but no recovery options.
 */
export default function RecoveryPrompt() {
	const {
		user: { recoveryPromptNeeded },
	} = useContext( GlobalContext );

	if ( ! recoveryPromptNeeded ) {
		return null;
	}

	return (
		<Notice status="warning" isDismissible={ false } className="wporg-2fa__recovery-prompt">
			<Icon icon={ warning } />
			<div>
				You have not set up any account recovery options. If you lose access to your
				two-factor device, you may be locked out of your account.{ ' ' }
				<ScreenLink screen="recovery" anchorText="Set up recovery options" />
			</div>
		</Notice>
	);
}
