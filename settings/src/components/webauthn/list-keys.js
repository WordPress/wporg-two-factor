/**
 * WordPress dependencies
 */
import { Button, Modal, Notice, Spinner } from '@wordpress/components';
import { useCallback, useContext, useState } from '@wordpress/element';
import { Icon, cancelCircleFilled } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../../script';
import { refreshRecord } from '../../utilities/common';

/**
 * Render the list of keys.
 */
export default function ListKeys() {
	const {
		user: { userRecord },
		setGlobalNotice,
	} = useContext( GlobalContext );
	const keys = userRecord.record[ '2fa_webauthn_keys' ];

	const [ modalKey, setModalKey ] = useState( null );
	const [ modalError, setModalError ] = useState( null );
	const [ deleting, setDeleting ] = useState( false );

	/**
	 * After the user confirms their intent, POST an AJAX request to remove a key.
	 */
	const onConfirmDelete = useCallback( async () => {
		setDeleting( true );

		try {
			await wp.ajax.post( 'webauthn_delete_key', {
				user_id: userRecord.record.id,
				handle: modalKey.credential_id,
				_ajax_nonce: modalKey.delete_nonce,
			} );

			setGlobalNotice( modalKey.name + ' has been deleted.' );
			setModalKey( null );
			await refreshRecord( userRecord );
		} catch ( error ) {
			// The endpoint returns some errors as a string, but others as an object.
			setModalError( error?.responseJSON?.data || error );
		} finally {
			setDeleting( false );
		}
	}, [ modalKey ] );

	return (
		<>
			<ul className="wporg-2fa__webauthn-keys-list">
				{ keys.map( ( key ) => (
					<li key={ key.id }>
						<div className="wporg-2fa__webauthn-key-name">{ key.name }</div>

						<Button
							variant="link"
							data-id={ key.id }
							aria-label="Delete"
							onClick={ () => setModalKey( key ) }
						>
							Delete
						</Button>
					</li>
				) ) }
			</ul>

			{ modalKey && (
				<ConfirmRemoveKey
					keyToRemove={ modalKey }
					error={ modalError }
					deleting={ deleting }
					onClose={ () => setModalKey( null ) }
					onConfirm={ onConfirmDelete }
				/>
			) }
		</>
	);
}

/**
 * Prompt the user to confirm they want to delete a key.
 *
 * @param {Object}   props
 * @param {Object}   props.keyToRemove
 * @param {Function} props.onConfirm
 * @param {Function} props.onClose
 * @param {boolean}  props.deleting
 * @param {string}   props.error
 */
function ConfirmRemoveKey( { keyToRemove, onConfirm, onClose, deleting, error } ) {
	return (
		<Modal
			title={ `Remove ${ keyToRemove.name }?` }
			className="wporg-2fa__confirm-delete-key"
			onRequestClose={ onClose }
		>
			<p className="wporg-2fa__screen-intro">
				Are you sure you want to remove the <code>{ keyToRemove.name }</code> security key?
			</p>

			<div className="wporg-2fa__submit-actions">
				<Button variant="primary" onClick={ onConfirm }>
					Remove { keyToRemove.name }
				</Button>

				<Button variant="secondary" onClick={ onClose }>
					Cancel
				</Button>
			</div>

			{ deleting && (
				<p className="wporg-2fa__webauthn-register-key-status">
					<Spinner />
				</p>
			) }

			{ error && (
				<Notice status="error" isDismissible={ false }>
					<Icon icon={ cancelCircleFilled } />
					{ error }
				</Notice>
			) }
		</Modal>
	);
}
