/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { useContext, useState, useCallback } from '@wordpress/element';
import { Notice, ToggleControl } from '@wordpress/components';
import { Icon, check } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../../script';
import { refreshRecord } from '../../utilities/common';
import DesignatedContact from './designated-contact';

/**
 * Main recovery settings screen.
 */
export default function RecoverySettings() {
	const {
		setGlobalNotice,
		setError,
		user: {
			userRecord,
			userRecord: { record },
		},
	} = useContext( GlobalContext );

	const emailEnabled = record?.[ '2fa_recovery_email_enabled' ] ?? false;
	const allowedMethods = record?.[ '2fa_recovery_allowed_methods' ] ?? [];
	const recoveryDelay = record?.[ '2fa_recovery_delay' ] ?? 86400;
	const pendingRequest = record?.[ '2fa_recovery_pending_request' ] ?? null;
	const designatedFor = record?.[ '2fa_designated_for' ] ?? [];

	const [ isSaving, setIsSaving ] = useState( false );

	const canUseEmail = allowedMethods.includes( 'email' );
	const canUseContact = allowedMethods.includes( 'contact' );

	const delayText = formatDelay( recoveryDelay );

	const handleEmailToggle = useCallback(
		async ( enabled ) => {
			setIsSaving( true );
			try {
				await apiFetch( {
					path: `/wporg-two-factor/1.0/recovery/${
						enabled ? 'email-opt-in' : 'email-opt-out'
					}`,
					method: 'POST',
					data: { user_id: record.id },
				} );
				await refreshRecord( userRecord );
				setGlobalNotice(
					enabled
						? 'Email recovery has been enabled.'
						: 'Email recovery has been disabled.'
				);
			} catch ( err ) {
				setError( err );
			}
			setIsSaving( false );
		},
		[ record?.id, userRecord, setGlobalNotice, setError ]
	);

	// Super admins / no recovery available.
	if ( allowedMethods.length === 0 ) {
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
					Recovery options help you regain access to your account if you lose your
					two-factor authentication device. Configure at least one option below.
				</p>
			</div>

			{ pendingRequest && (
				<Notice status="warning" isDismissible={ false }>
					A { pendingRequest.type } recovery request is currently pending (requested{ ' ' }
					{ new Date( pendingRequest.requested_at * 1000 ).toLocaleDateString() }
					).
				</Notice>
			) }

			{ canUseEmail && (
				<div className="wporg-2fa__recovery-section">
					<h3>Email Recovery</h3>
					<p>
						If you lose access to your two-factor device, a recovery link will be sent
						to your account email after a { delayText } waiting period.
					</p>

					<ToggleControl
						label="Enable email recovery"
						checked={ emailEnabled }
						onChange={ handleEmailToggle }
						disabled={ isSaving }
					/>
				</div>
			) }

			{ canUseContact && (
				<div className="wporg-2fa__recovery-section">
					<h3>Designated Recovery Contact</h3>
					<p>
						Designate another WordPress.org user who can verify your identity and help
						you regain access to your account. The contact must have two-factor
						authentication enabled.
					</p>

					<DesignatedContact />
				</div>
			) }

			{ designatedFor.length > 0 && (
				<div className="wporg-2fa__recovery-section">
					<h3>You are a recovery contact for</h3>
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

/**
 * Format a delay in seconds to a human-readable string.
 *
 * @param {number} seconds
 * @return {string} Human-readable delay string.
 */
function formatDelay( seconds ) {
	const days = Math.floor( seconds / 86400 );
	if ( days >= 7 ) {
		return '7-day';
	}
	if ( days >= 3 ) {
		return '3-day';
	}
	return '24-hour';
}
