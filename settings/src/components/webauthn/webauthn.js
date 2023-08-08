/**
 * WordPress dependencies
 */
import { Button, Notice, Spinner } from '@wordpress/components';
import { useCallback, useContext, useState } from '@wordpress/element';
import { Icon, cancelCircleFilled } from '@wordpress/icons';
import apiFetch from '@wordpress/api-fetch';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../../script';
import { refreshRecord } from '../../utilities/common';
import ListKeys from './list-keys';
import RegisterKey from './register-key';

/**
 * Global dependencies
 */
const confirm = window.confirm;
const alert = window.alert;

/**
 * Render the WebAuthn setting.
 */
export default function WebAuthn() {
	const {
		user: {
			userRecord,
			userRecord: { record },
			webAuthnEnabled,
			backupCodesEnabled,
		},
		setGlobalNotice,
	} = useContext( GlobalContext );
	const keys = userRecord.record[ '2fa_webauthn_keys' ];
	const [ flow, setFlow ] = useState( 'manage' );
	const [ statusError, setStatusError ] = useState( '' );
	const [ statusWaiting, setStatusWaiting ] = useState( false );

	/**
	 * Handle post-registration prcessing.
	 */
	const onRegisterSuccess = useCallback( async () => {
		if ( ! webAuthnEnabled ) {
			await enableProvider();
		}

		if ( ! backupCodesEnabled ) {
			// TODO maybe redirect to backup codes, pending discussion.
			alert( 'redirect to backup codes' );
		} else {
			setFlow( 'manage' );
		}
	}, [ webAuthnEnabled, backupCodesEnabled ] );

	/**
	 * Enable the WebAuthn provider.
	 */
	const enableProvider = useCallback( async () => {
		try {
			setStatusError( '' );
			setStatusWaiting( true );

			await apiFetch( {
				path: '/wporg-two-factor/1.0/provider-status',
				method: 'POST',
				data: {
					user_id: record.id,
					provider: 'TwoFactor_Provider_WebAuthn',
					status: 'enable',
				},
			} );

			await refreshRecord( userRecord );
			setGlobalNotice( 'Successfully enabled Security Keys.' );
		} catch ( error ) {
			setStatusError( error?.message || error?.responseJSON?.data || error );
		} finally {
			setStatusWaiting( false );
		}
	}, [] );

	/**
	 * Disable the WebAuthn provider.
	 */
	const disableProvider = useCallback( () => {
		// TODO this will be done in a separate PR
		// Also pending outcome of https://github.com/WordPress/wporg-two-factor/issues/194#issuecomment-1564930700

		// return early if already disabled?
		// this shouldn't be called in the first place if that's the case, maybe the button should be disabled or not even shown
		//
		// call api to disable provider
		// handle failure

		confirm(
			'TODO Modal H4 Disable Security Keys? p Are you sure you want to disable Security Keys? Button Cancel Button Disable'
		);

		// refresuserRecord should result in this screen re-rendering with the enable button visible instead of the disable button

		// maybe refactor to use some of enableProvider() b/c they're calling the same endpoint, just with a different `status` value
	}, [] ); // todo any dependencies?

	if ( 'register' === flow ) {
		return (
			<RegisterKey onSuccess={ onRegisterSuccess } onCancel={ () => setFlow( 'manage' ) } />
		);
	}

	return (
		<>
			<p className="wporg-2fa__screen-intro">
				A security key is a physical or software-based device that adds an extra layer of
				authentication and protection to online accounts. It generates unique codes or
				cryptographic signatures to verify the user&apos;s identity, offering stronger
				security than passwords alone.
			</p>

			{ keys.length > 0 && (
				<>
					<h4>Security Keys</h4>

					<ListKeys />
				</>
			) }

			<p className="wporg-2fa__submit-actions">
				<Button variant="primary" onClick={ () => setFlow( 'register' ) }>
					Register new key
				</Button>

				{ keys.length > 0 && (
					<Button
						variant="secondary"
						onClick={ webAuthnEnabled ? disableProvider : enableProvider }
						disabled={ statusWaiting }
					>
						{ webAuthnEnabled ? 'Disable security keys' : 'Enable security keys' }
					</Button>
				) }

				{ statusWaiting && (
					<p className="wporg-2fa__webauthn-register-key-status">
						<Spinner />
					</p>
				) }
			</p>

			{ statusError && (
				<Notice status="error" isDismissible={ false }>
					<Icon icon={ cancelCircleFilled } />
					{ statusError }
				</Notice>
			) }
		</>
	);
}
