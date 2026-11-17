/**
 * WordPress dependencies
 */
import { useContext } from '@wordpress/element';
import { Notice } from '@wordpress/components';
import { Icon, check } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../../script';
import DesignatedContact from './designated-contact';

/**
 * Main recovery settings screen.
 */
export default function RecoverySettings() {
	const {
		user: {
			userRecord: { record },
			recoveryAvailable,
		},
	} = useContext( GlobalContext );

	const pendingRequest = record?.[ '2fa_recovery_pending_request' ] ?? null;
	const designatedFor = record?.[ '2fa_designated_for' ] ?? [];

	// Super admins / no recovery available.
	if ( ! recoveryAvailable ) {
		return (
			<div className="wporg-2fa__screen-intro">
				<p>
					Your account requires out-of-band recovery management. Please contact the
					systems team if you lose access to your two-factor device.
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="wporg-2fa__screen-intro">
				<p>
					Designate one or more Backup Buddies who can verify your identity and help you
					regain access to your account if you lose your two-factor device. Each contact
					must have two-factor authentication enabled.
				</p>
			</div>

			{ pendingRequest && (
				<Notice status="warning" isDismissible={ false }>
					A recovery request is currently pending (requested{ ' ' }
					{ new Date( pendingRequest.requested_at * 1000 ).toLocaleDateString() }).
				</Notice>
			) }

			<div className="wporg-2fa__recovery-section">
				<DesignatedContact />
			</div>

			{ designatedFor.length > 0 && (
				<div className="wporg-2fa__recovery-section">
					<h3>You are a Backup Buddy for</h3>
					<ul>
						{ designatedFor.map( ( user ) => (
							<li key={ user.id }>
								<Icon icon={ check } size={ 16 } /> { user.display_name } (
								{ user.login })
							</li>
						) ) }
					</ul>
				</div>
			) }
		</>
	);
}
