/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { useContext, useState, useCallback } from '@wordpress/element';
import { Button, Notice, ToggleControl, TextControl, Spinner } from '@wordpress/components';
import { Icon, warning } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../../script';
import { refreshRecord } from '../../utilities/common';

/**
 * Recovery setup step during onboarding.
 *
 * @param {Object}   props
 * @param {Function} props.onSuccess Called when the user continues past this step.
 */
export default function RecoverySetup( { onSuccess } ) {
	const {
		setGlobalNotice,
		user: {
			userRecord,
			userRecord: { record },
			recoveryAllowedMethods,
		},
	} = useContext( GlobalContext );

	const recoveryDelay = record?.[ '2fa_recovery_delay' ] ?? 86400;
	const canUseEmail = recoveryAllowedMethods.includes( 'email' );
	const canUseContact = recoveryAllowedMethods.includes( 'contact' );

	const [ emailEnabled, setEmailEnabled ] = useState( false );
	const [ contactLogin, setContactLogin ] = useState( '' );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ error, setError ] = useState( '' );

	const delayText = formatDelay( recoveryDelay );

	const handleContinue = useCallback( async () => {
		setIsSaving( true );
		setError( '' );

		try {
			// Enable email recovery if selected.
			if ( emailEnabled && canUseEmail ) {
				await apiFetch( {
					path: '/wporg-two-factor/1.0/recovery/email-opt-in',
					method: 'POST',
					data: { user_id: record.id },
				} );
			}

			// Send contact designation if entered.
			if ( contactLogin.trim() && canUseContact ) {
				await apiFetch( {
					path: '/wporg-two-factor/1.0/recovery/designate-contact',
					method: 'POST',
					data: {
						user_id: record.id,
						contact_login: contactLogin.trim(),
					},
				} );
			}

			await refreshRecord( userRecord );

			if ( emailEnabled || contactLogin.trim() ) {
				setGlobalNotice( 'Recovery options have been configured.' );
			}
		} catch ( err ) {
			setError( err.message || 'Failed to configure recovery options.' );
			setIsSaving( false );
			return;
		}

		setIsSaving( false );
		onSuccess();
	}, [
		emailEnabled,
		contactLogin,
		record?.id,
		canUseEmail,
		canUseContact,
		onSuccess,
		setGlobalNotice,
		userRecord,
	] );

	// No recovery methods available (super admins).
	if ( recoveryAllowedMethods.length === 0 ) {
		return (
			<>
				<div className="wporg-2fa__screen-intro">
					<p>
						Your account requires out-of-band recovery management. Please contact the
						systems team if you ever lose access to your two-factor device.
					</p>
				</div>
				<Button isPrimary onClick={ onSuccess }>
					Continue
				</Button>
			</>
		);
	}

	return (
		<>
			<div className="wporg-2fa__screen-intro">
				<p>
					Set up recovery options so you can regain access to your account if you lose
					your two-factor authentication device. This is optional but strongly
					recommended.
				</p>

				<Notice status="warning" isDismissible={ false }>
					<Icon icon={ warning } className="wporg-2fa__recovery-warning" />
					Without a recovery option, you may be permanently locked out of your account if
					you lose access to your two-factor device and backup codes.
				</Notice>
			</div>

			{ error && (
				<Notice status="error" isDismissible={ false }>
					{ error }
				</Notice>
			) }

			{ canUseEmail && (
				<div className="wporg-2fa__recovery-section">
					<ToggleControl
						label={ `Enable email recovery (${ delayText } waiting period)` }
						help="A recovery link will be sent to your account email after a waiting period."
						checked={ emailEnabled }
						onChange={ setEmailEnabled }
						disabled={ isSaving }
					/>
				</div>
			) }

			{ canUseContact && (
				<div className="wporg-2fa__recovery-section">
					<TextControl
						label="Designated recovery contact (optional)"
						help="Enter the WordPress.org username of someone who can verify your identity."
						value={ contactLogin }
						onChange={ setContactLogin }
						placeholder="WordPress.org username"
						disabled={ isSaving }
					/>
				</div>
			) }

			<div className="wporg-2fa__submit-actions">
				<Button isPrimary onClick={ handleContinue } disabled={ isSaving }>
					{ isSaving ? <Spinner /> : 'Continue' }
				</Button>
				<Button isSecondary onClick={ onSuccess } disabled={ isSaving }>
					Skip
				</Button>
			</div>
		</>
	);
}

/**
 * Format a delay in seconds to a human-readable string.
 *
 * @param {number} seconds The delay in seconds.
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
