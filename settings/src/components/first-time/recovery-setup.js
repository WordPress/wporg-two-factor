/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { useContext, useState, useCallback } from '@wordpress/element';
import { Button, Notice, TextControl, Spinner } from '@wordpress/components';
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
			recoveryAvailable,
		},
	} = useContext( GlobalContext );

	const [ contactLogin, setContactLogin ] = useState( '' );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ error, setError ] = useState( '' );

	const handleContinue = useCallback( async () => {
		setIsSaving( true );
		setError( '' );

		try {
			if ( contactLogin.trim() ) {
				await apiFetch( {
					path: '/wporg-two-factor/1.0/recovery/designate-contact',
					method: 'POST',
					data: {
						user_id: record.id,
						contact_login: contactLogin.trim(),
					},
				} );

				await refreshRecord( userRecord );
				setGlobalNotice( 'Backup Buddy designation request sent.' );
			}
		} catch ( err ) {
			setError( err.message || 'Failed to designate recovery contact.' );
			setIsSaving( false );
			return;
		}

		setIsSaving( false );
		onSuccess();
	}, [ contactLogin, record?.id, onSuccess, setGlobalNotice, userRecord ] );

	// No recovery available (super admins).
	if ( ! recoveryAvailable ) {
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
					Add a Backup Buddy who can verify your identity and help you regain access if
					you lose your two-factor device. This is optional but strongly recommended.
				</p>

				<Notice status="warning" isDismissible={ false }>
					<Icon icon={ warning } className="wporg-2fa__recovery-warning" />
					Without a Backup Buddy, you may be permanently locked out of your account if you
					lose access to your two-factor device and backup codes.
				</Notice>
			</div>

			{ error && (
				<Notice status="error" isDismissible={ false }>
					{ error }
				</Notice>
			) }

			<div className="wporg-2fa__recovery-section">
				<TextControl
					label="Backup Buddy (optional)"
					help="Enter the WordPress.org username of someone who can verify your identity."
					value={ contactLogin }
					onChange={ setContactLogin }
					placeholder="WordPress.org username"
					disabled={ isSaving }
				/>
			</div>

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
