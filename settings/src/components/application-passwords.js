/**
 * WordPress dependencies
 */
import { Button, Modal, Notice } from '@wordpress/components';
import { useCallback, useContext, useState } from '@wordpress/element';
import { Icon, cancelCircleFilled } from '@wordpress/icons';
import apiFetch from '@wordpress/api-fetch';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';
import { refreshRecord } from '../utilities/common';

/**
 * Render the Application Passwords setting.
 */
export default function ApplicationPasswords() {
	const {
		user: { userRecord, applicationPasswords },
		setGlobalNotice,
	} = useContext( GlobalContext );

	const [ revokeTarget, setRevokeTarget ] = useState( null );
	const [ showRevokeAll, setShowRevokeAll ] = useState( false );
	const [ revoking, setRevoking ] = useState( false );
	const [ revokeError, setRevokeError ] = useState( '' );

	const handleRevoke = useCallback(
		async ( path, successMessage, closeModal ) => {
			setRevoking( true );
			setRevokeError( '' );

			try {
				await apiFetch( { path, method: 'DELETE' } );
			} catch ( error ) {
				setRevokeError(
					error?.message ||
						error?.responseJSON?.data ||
						'An unexpected error occurred. Please try again.'
				);
				setRevoking( false );
				return;
			}

			setGlobalNotice( successMessage );
			closeModal();
			setRevoking( false );

			try {
				await refreshRecord( userRecord );
			} catch {
				// Revoke succeeded but data refresh failed — a page reload will fix the stale table.
			}
		},
		[ userRecord, setGlobalNotice ]
	);

	const onConfirmRevoke = useCallback( () => {
		handleRevoke(
			`/wp/v2/users/${ userRecord.record.id }/application-passwords/${ revokeTarget.uuid }`,
			`The application password "${ revokeTarget.name }" has been revoked.`,
			() => setRevokeTarget( null )
		);
	}, [ handleRevoke, revokeTarget, userRecord ] );

	const onConfirmRevokeAll = useCallback( () => {
		handleRevoke(
			`/wp/v2/users/${ userRecord.record.id }/application-passwords`,
			'All application passwords have been revoked.',
			() => setShowRevokeAll( false )
		);
	}, [ handleRevoke, userRecord ] );

	if ( applicationPasswords.length === 0 ) {
		return (
			<p className="wporg-2fa__screen-intro">
				You don&apos;t have any application passwords.
			</p>
		);
	}

	return (
		<>
			<p className="wporg-2fa__screen-intro">
				These passwords let external applications access your account. If you revoke one,
				the application that uses it will lose access.
			</p>

			<table className="wporg-2fa__application-passwords-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Created</th>
						<th>Last used</th>
						<th>
							<span className="screen-reader-text">Actions</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{ applicationPasswords.map( ( appPassword ) => (
						<tr key={ appPassword.uuid }>
							<td className="wporg-2fa__app-password-name">{ appPassword.name }</td>
							<td>{ new Date( appPassword.created ).toLocaleDateString() }</td>
							<td>
								{ appPassword.last_used
									? new Date( appPassword.last_used ).toLocaleDateString()
									: 'Never used' }
							</td>
							<td className="wporg-2fa__app-password-actions">
								<Button
									variant="link"
									isDestructive
									aria-label={ `Revoke ${ appPassword.name }` }
									onClick={ () => {
										setRevokeError( '' );
										setRevokeTarget( appPassword );
									} }
								>
									Revoke
								</Button>
							</td>
						</tr>
					) ) }
				</tbody>
			</table>

			<div className="wporg-2fa__submit-actions">
				<Button
					variant="secondary"
					isDestructive
					onClick={ () => {
						setRevokeError( '' );
						setShowRevokeAll( true );
					} }
				>
					Revoke all application passwords
				</Button>
			</div>

			{ revokeTarget && (
				<ConfirmRevoke
					appPassword={ revokeTarget }
					revoking={ revoking }
					error={ revokeError }
					onClose={ () => setRevokeTarget( null ) }
					onConfirm={ onConfirmRevoke }
				/>
			) }

			{ showRevokeAll && (
				<ConfirmRevoke
					revoking={ revoking }
					error={ revokeError }
					onClose={ () => setShowRevokeAll( false ) }
					onConfirm={ onConfirmRevokeAll }
				/>
			) }
		</>
	);
}

/**
 * Prompt the user to confirm they want to revoke application password(s).
 *
 * When `appPassword` is provided, confirms revoking that single password.
 * Otherwise, confirms revoking all passwords.
 *
 * @param {Object}   props
 * @param {Object}   [props.appPassword] The application password to revoke. Omit for all.
 * @param {boolean}  props.revoking      Whether a revoke request is in progress.
 * @param {string}   props.error         Error message from a failed revoke attempt.
 * @param {Function} props.onClose       Callback to close the modal without revoking.
 * @param {Function} props.onConfirm     Callback to confirm and execute the revoke.
 */
function ConfirmRevoke( { appPassword, revoking, error, onClose, onConfirm } ) {
	const isSingle = !! appPassword;

	return (
		<Modal
			title={ isSingle ? 'Revoke application password' : 'Revoke all application passwords' }
			className="wporg-2fa__confirm-revoke-app-password"
			onRequestClose={ onClose }
		>
			<p className="wporg-2fa__screen-intro">
				{ isSingle ? (
					<>
						Are you sure you want to revoke the application password &ldquo;
						{ appPassword.name }&rdquo;? Any application using it will no longer be able
						to access your account.
					</>
				) : (
					'Are you sure you want to revoke all application passwords? Any applications using them will no longer be able to access your account.'
				) }
			</p>

			<div className="wporg-2fa__submit-actions">
				<Button
					variant="primary"
					isDestructive
					isBusy={ revoking }
					disabled={ revoking }
					onClick={ onConfirm }
				>
					{ isSingle ? 'Revoke password' : 'Revoke all passwords' }
				</Button>

				<Button variant="secondary" onClick={ onClose }>
					Cancel
				</Button>
			</div>

			{ error && (
				<Notice status="error" isDismissible={ false }>
					<Icon icon={ cancelCircleFilled } />
					{ error }
				</Notice>
			) }
		</Modal>
	);
}
