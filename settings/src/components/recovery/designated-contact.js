/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { useContext, useState, useCallback } from '@wordpress/element';
import { Button, TextControl, Notice, Spinner } from '@wordpress/components';
import { Icon, check, cancelCircleFilled, trash } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../../script';
import { refreshRecord } from '../../utilities/common';

/**
 * Designated contact management supporting multiple contacts.
 */
export default function DesignatedContact() {
	const {
		setGlobalNotice,
		setError,
		user: {
			userRecord,
			userRecord: { record },
			recoveryContacts,
			recoveryContactsPending,
		},
	} = useContext( GlobalContext );

	const [ contactLogin, setContactLogin ] = useState( '' );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ removingId, setRemovingId ] = useState( null );
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
			setGlobalNotice(
				'A designation request has been sent to ' + contactLogin.trim() + '.'
			);
			setContactLogin( '' );
		} catch ( err ) {
			setLocalError( err.message || 'Failed to designate contact.' );
		}

		setIsSaving( false );
	}, [ contactLogin, record?.id, userRecord, setGlobalNotice ] );

	const handleRemove = useCallback( async ( contactId ) => {
		setRemovingId( contactId );
		try {
			await apiFetch( {
				path: '/wporg-two-factor/1.0/recovery/remove-contact',
				method: 'POST',
				data: {
					user_id: record.id,
					contact_id: contactId,
				},
			} );
			await refreshRecord( userRecord );
			setGlobalNotice( 'Recovery contact has been removed.' );
		} catch ( err ) {
			setError( err );
		}
		setRemovingId( null );
	}, [ record?.id, userRecord, setGlobalNotice, setError ] );

	return (
		<div className="wporg-2fa__designated-contact">
			{ /* Confirmed contacts */ }
			{ recoveryContacts.length > 0 && (
				<ul className="wporg-2fa__contact-list">
					{ recoveryContacts.map( ( contact ) => (
						<li key={ contact.id } className="wporg-2fa__contact-item">
							<span>
								<Icon icon={ check } size={ 16 } />
								{ ' ' }
								<strong>{ contact.display_name }</strong> ({ contact.login })
							</span>
							<Button
								isDestructive
								isSmall
								icon={ trash }
								label={ 'Remove ' + contact.display_name }
								onClick={ () => handleRemove( contact.id ) }
								disabled={ removingId === contact.id }
							>
								{ removingId === contact.id ? <Spinner /> : 'Remove' }
							</Button>
						</li>
					) ) }
				</ul>
			) }

			{ /* Pending designations */ }
			{ recoveryContactsPending.length > 0 && (
				<div className="wporg-2fa__contact-pending">
					{ recoveryContactsPending.map( ( pending ) => (
						<Notice key={ pending.contact_id } status="info" isDismissible={ false }>
							Waiting for <strong>{ pending.contact_login }</strong> to accept.
							<Button
								isDestructive
								isSmall
								onClick={ () => handleRemove( pending.contact_id ) }
								disabled={ removingId === pending.contact_id }
							>
								Cancel
							</Button>
						</Notice>
					) ) }
				</div>
			) }

			{ /* Add new contact form */ }
			{ localError && (
				<Notice status="error" isDismissible={ false }>
					<Icon icon={ cancelCircleFilled } />
					{ localError }
				</Notice>
			) }

			<TextControl
				label="Add a recovery contact"
				value={ contactLogin }
				onChange={ setContactLogin }
				placeholder="WordPress.org username"
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
