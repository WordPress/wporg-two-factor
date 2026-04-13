/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { useContext, useState, useCallback } from '@wordpress/element';
import { Button, Notice, Spinner } from '@wordpress/components';
import { Icon, check, cancelCircleFilled } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../../script';
import { refreshRecord } from '../../utilities/common';

/**
 * Screen shown to a user who has been designated as someone's recovery contact.
 * Accessed via email link with ?screen=contact-approval&token=...&user_id=...
 */
export default function ContactApproval() {
	const {
		setGlobalNotice,
		navigateToScreen,
		user: {
			userRecord,
			userRecord: { record },
		},
	} = useContext( GlobalContext );

	const [ isSaving, setIsSaving ] = useState( false );
	const [ result, setResult ] = useState( null );
	const [ error, setError ] = useState( '' );

	const params = new URL( document.location.href ).searchParams;
	const token = params.get( 'token' );
	const userId = parseInt( params.get( 'user_id' ), 10 );
	const contactId = record?.id;

	const handleAccept = useCallback( async () => {
		setIsSaving( true );
		setError( '' );
		try {
			await apiFetch( {
				path: '/wporg-two-factor/1.0/recovery/accept-designation',
				method: 'POST',
				data: {
					contact_id: contactId,
					user_id: userId,
					token,
				},
			} );
			await refreshRecord( userRecord );
			setResult( 'accepted' );
			setGlobalNotice( 'You have accepted the recovery contact designation.' );
		} catch ( err ) {
			setError( err.message || 'Failed to accept designation.' );
		}
		setIsSaving( false );
	}, [ contactId, userId, token, userRecord, setGlobalNotice ] );

	const handleDecline = useCallback( async () => {
		setIsSaving( true );
		setError( '' );
		try {
			await apiFetch( {
				path: '/wporg-two-factor/1.0/recovery/decline-designation',
				method: 'POST',
				data: {
					contact_id: contactId,
					user_id: userId,
					token,
				},
			} );
			await refreshRecord( userRecord );
			setResult( 'declined' );
			setGlobalNotice( 'You have declined the recovery contact designation.' );
		} catch ( err ) {
			setError( err.message || 'Failed to decline designation.' );
		}
		setIsSaving( false );
	}, [ contactId, userId, token, userRecord, setGlobalNotice ] );

	if ( ! token || ! userId ) {
		return (
			<Notice status="error" isDismissible={ false }>
				<Icon icon={ cancelCircleFilled } />
				Invalid approval link. Please check the link in your email.
			</Notice>
		);
	}

	if ( result === 'accepted' ) {
		return (
			<div className="wporg-2fa__screen-intro">
				<Notice status="success" isDismissible={ false }>
					<Icon icon={ check } />
					You have accepted the recovery contact designation. If the user ever loses
					access to their two-factor device, you may be asked to verify their identity.
				</Notice>
				<Button isSecondary onClick={ () => navigateToScreen( 'home' ) }>
					Back to settings
				</Button>
			</div>
		);
	}

	if ( result === 'declined' ) {
		return (
			<div className="wporg-2fa__screen-intro">
				<Notice status="info" isDismissible={ false }>
					You have declined the recovery contact designation.
				</Notice>
				<Button isSecondary onClick={ () => navigateToScreen( 'home' ) }>
					Back to settings
				</Button>
			</div>
		);
	}

	return (
		<div className="wporg-2fa__screen-intro">
			<p>
				A WordPress.org user has designated you as their two-factor authentication
				recovery contact. If they ever lose access to their two-factor device, you may
				be contacted to verify their identity and help them regain access.
			</p>

			<p>
				By accepting, you agree to verify the identity of the user through out-of-band
				means (such as in person, phone call, or video chat) before confirming any
				recovery requests.
			</p>

			{ error && (
				<Notice status="error" isDismissible={ false }>
					<Icon icon={ cancelCircleFilled } />
					{ error }
				</Notice>
			) }

			<div className="wporg-2fa__submit-actions">
				<Button isPrimary onClick={ handleAccept } disabled={ isSaving }>
					{ isSaving ? <Spinner /> : 'Accept' }
				</Button>
				<Button isSecondary isDestructive onClick={ handleDecline } disabled={ isSaving }>
					Decline
				</Button>
			</div>
		</div>
	);
}
