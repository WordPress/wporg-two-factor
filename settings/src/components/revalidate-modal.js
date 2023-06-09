/**
 * WordPress dependencies
 */
import { useCallback, useContext, useEffect, useRef } from '@wordpress/element';
import { GlobalContext } from '../script';
import { Modal } from '@wordpress/components';
import { useMergeRefs, useFocusableIframe } from '@wordpress/compose';
import { refreshRecord } from '../utilities';

export default function RevalidateModal() {
	const { navigateToScreen } = useContext( GlobalContext );

	const goBack = useCallback( ( event ) => {
		event.preventDefault();
		navigateToScreen( 'account-status' );
	}, [] );

	return (
		<Modal
			title="Two-Factor Authentication"
			onRequestClose={ goBack }
			className="wporg-2fa__revalidate-modal"
			// Temporary workaround until https://github.com/WordPress/gutenberg/issues/40912 is fixed.
			// Without this the modal immediately closes in Firefox, see https://github.com/WordPress/wporg-two-factor/issues/180
			shouldCloseOnClickOutside={ false }
		>
			<p>To update your two-factor options, you must first revalidate your session.</p>

			<RevalidateIframe />
		</Modal>
	);
}

function RevalidateIframe() {
	const {
		setGlobalNotice,
		user: { userRecord },
	} = useContext( GlobalContext );
	const { record } = userRecord;
	const ref = useRef();

	useEffect( () => {
		async function maybeRefreshUser( { data: { type, message } = {} } ) {
			if ( type !== 'reValidationComplete' ) {
				return;
			}

			setGlobalNotice( message || 'Two-Factor confirmed' );

			// Pretend that the expires_at is in the future (+1hr), this provides a 'faster' UI.
			// This intentionally doesn't use `edit()` to prevent it attempting to update it on the server.
			record[ '2fa_revalidation' ].expires_at = new Date().getTime() / 1000 + 3600;

			// Refresh the user record, to fetch the correct 2fa_revalidation data.
			try {
				await refreshRecord( userRecord );
			} catch ( error ) {
				// TODO: handle error more properly here, likely by showing a error notice
				// eslint-disable-next-line no-console
				console.error( 'Failed to refresh user record:', error );
			}
		}

		window.addEventListener( 'message', maybeRefreshUser );

		return () => {
			window.removeEventListener( 'message', maybeRefreshUser );
		};
	}, [] );

	return (
		<iframe
			title="Two-Factor Revalidation"
			ref={ useMergeRefs( [ ref, useFocusableIframe() ] ) }
			src={ record[ '2fa_revalidation' ].revalidate_url }
		/>
	);
}
