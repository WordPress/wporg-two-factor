/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { useContext, useState, useCallback } from '@wordpress/element';
import { Button, TextControl, Notice, Spinner } from '@wordpress/components';
import { Icon, check, cancelCircleFilled } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../../script';
import { refreshRecord } from '../../utilities/common';

/**
 * Designated contact management.
 */
export default function DesignatedContact() {
	const {
		setGlobalNotice,
		setError,
		user: {
			userRecord,
			userRecord: { record },
		},
	} = useContext( GlobalContext );

	const contact = record?.[ '2fa_recovery_contact' ] ?? null;
	const pendingContact = record?.[ '2fa_recovery_contact_pending' ] ?? null;

	const [ contactLogin, setContactLogin ] = useState( '' );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ localError, setLocalError ] = useState( '' );

	const handleDesignate = useCallback( async () => {
		if ( ! contactLogin.trim() ) {
			setLocalError( 'Please enter a WordPress.org username.' );
			return;
		}

		setIsSaving( true );
		setLocalError( '' );

		try {
			await apiFetch( {
				path: '/wporg-two-factor/1.0/recovery/designate-contact',
				method: 'POST',
				data: {
					user_id: record.id,
					contact_login: contactLogin.trim(),
				},
			} );
			await refreshRecord( userRecord );
			setGlobalNotice( 'A designation request has been sent to ' + contactLogin.trim() + '.' );
			setContactLogin( '' );
		} catch ( err ) {
			setLocalError( err.message || 'Failed to designate contact.' );
		}

		setIsSaving( false );
	}, [ contactLogin, record?.id ] );

	const handleRemove = useCallback( async () => {
		setIsSaving( true );
		try {
			await apiFetch( {
				path: '/wporg-two-factor/1.0/recovery/remove-contact',
				method: 'POST',
				data: { user_id: record.id },
			} );
			await refreshRecord( userRecord );
			setGlobalNotice( 'Recovery contact has been removed.' );
		} catch ( err ) {
			setError( err );
		}
		setIsSaving( false );
	}, [ record?.id ] );

	// Show confirmed contact.
	if ( contact ) {
		return (
			<div className="wporg-2fa__designated-contact">
				<p>
					<Icon icon={ check } size={ 16 } />
					{ ' ' }
					Your designated recovery contact is{ ' ' }
					<strong>{ contact.display_name }</strong> ({ contact.login }).
				</p>
				<Button
					isDestructive
					isSecondary
					onClick={ handleRemove }
					disabled={ isSaving }
				>
					{ isSaving ? <Spinner /> : 'Remove contact' }
				</Button>
			</div>
		);
	}

	// Show pending designation.
	if ( pendingContact ) {
		return (
			<div className="wporg-2fa__designated-contact">
				<Notice status="info" isDismissible={ false }>
					A designation request has been sent to <strong>{ pendingContact.contact_login }</strong>.
					Waiting for them to accept.
				</Notice>
				<Button
					isDestructive
					isSecondary
					onClick={ handleRemove }
					disabled={ isSaving }
				>
					{ isSaving ? <Spinner /> : 'Cancel request' }
				</Button>
			</div>
		);
	}

	// Show designation form.
	return (
		<div className="wporg-2fa__designated-contact">
			{ localError && (
				<Notice status="error" isDismissible={ false }>
					<Icon icon={ cancelCircleFilled } />
					{ localError }
				</Notice>
			) }

			<TextControl
				label="WordPress.org username"
				value={ contactLogin }
				onChange={ setContactLogin }
				placeholder="Enter username"
				disabled={ isSaving }
			/>

			<Button
				isPrimary
				onClick={ handleDesignate }
				disabled={ isSaving || ! contactLogin.trim() }
			>
				{ isSaving ? <Spinner /> : 'Send designation request' }
			</Button>
		</div>
	);
}
