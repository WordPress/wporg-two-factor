/**
 * WordPress dependencies
 */
import { useContext, useEffect, useRef } from '@wordpress/element';
import { GlobalContext } from '../script';
import { Modal } from '@wordpress/components';
import { useMergeRefs, useFocusableIframe } from '@wordpress/compose';
import { refreshRecord } from '../utilities';

export default function RevalidateModal() {
	const { clickScreenLink } = useContext( GlobalContext );

	const goBack = ( event ) => clickScreenLink( event, 'account-status' );

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
		setGlobalNotice,
		user: { userRecord },
	} = useContext( GlobalContext );
	const { record } = userRecord;
	const ref = useRef();

	useEffect( () => {
		function maybeRefreshUser( { data: { type, message } = {} } ) {
			if ( type !== 'reValidationComplete' ) {
				return;
			}

			setGlobalNotice( message || 'Two-Factor confirmed' );

			// Pretend that the expires_at is in the future (+1hr), this provides a 'faster' UI.
			// This intentionally doesn't use `edit()` to prevent it attempting to update it on the server.
			record[ '2fa_revalidation' ].expires_at = new Date().getTime() / 1000 + 3600;

			// Refresh the user record, to fetch the correct 2fa_revalidation data.
			refreshRecord( userRecord );
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
