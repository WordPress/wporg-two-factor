/**
 * WordPress dependencies
 */
import { useCallback, useContext, useEffect, useRef } from '@wordpress/element';
import { GlobalContext } from '../script';
import { Modal } from '@wordpress/components';
import { useMergeRefs, useFocusableIframe } from '@wordpress/compose';
import { refreshRecord } from '../utilities/common';

export default function RevalidateModal() {
	const { navigateToScreen } = useContext( GlobalContext );

	const goBack = useCallback(
		( event ) => {
			event.preventDefault();
			navigateToScreen( 'home' );
		},
		[ navigateToScreen ]
	);

	return (
		<Modal
			title="Two-Factor Authentication"
			onRequestClose={ goBack }
			className="wporg-2fa__revalidate-modal"
		>
			<p>To update your two-factor options, you must first revalidate your session.</p>

			<RevalidateIframe />
		</Modal>
	);
}

function RevalidateIframe() {
	const {
		user: { userRecord },
	} = useContext( GlobalContext );
	const { record } = userRecord;
	const ref = useRef();
	const userRecordRef = useRef( userRecord );
	const recordRef = useRef( record );
	userRecordRef.current = userRecord;
	recordRef.current = record;

	useEffect( () => {
		async function maybeRefreshUser( { data: { type } = {} } ) {
			if ( type !== 'reValidationComplete' ) {
				return;
			}

			// Pretend that the expires_at is in the future (+1hr), this provides a 'faster' UI.
			// This intentionally doesn't use `edit()` to prevent it attempting to update it on the server.
			recordRef.current[ '2fa_revalidation' ].expires_at = new Date().getTime() / 1000 + 3600;

			// Refresh the user record, to fetch the correct 2fa_revalidation data.
			try {
				await refreshRecord( userRecordRef.current );
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
