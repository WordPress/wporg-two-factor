/**
 * WordPress dependencies
 */
import { useCallback, useContext, useEffect, useRef, useState } from '@wordpress/element';
import { GlobalContext } from '../script';
import { Modal, Notice } from '@wordpress/components';
import { useMergeRefs, useFocusableIframe } from '@wordpress/compose';
import { refreshRecord } from '../utilities/common';

export default function RevalidateModal() {
	const { navigateToScreen } = useContext( GlobalContext );
	const [ error, setError ] = useState( '' );

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
			// Temporary workaround until https://github.com/WordPress/gutenberg/issues/40912 is fixed.
			// Without this the modal immediately closes in Firefox, see https://github.com/WordPress/wporg-two-factor/issues/180
			shouldCloseOnClickOutside={ false }
		>
			<p>To update your two-factor options, you must first revalidate your session.</p>

			{ error && (
				<Notice status="error" isDismissible={ false }>
					{ error }
				</Notice>
			) }

			<RevalidateIframe setError={ setError } />
		</Modal>
	);
}

function RevalidateIframe( { setError } ) {
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
			setError( '' );
			try {
				await refreshRecord( userRecordRef.current );
			} catch {
				setError(
					'Your session was revalidated, but your account details could not be refreshed. Please reload the page and try again.'
				);
			}
		}

		window.addEventListener( 'message', maybeRefreshUser );

		return () => {
			window.removeEventListener( 'message', maybeRefreshUser );
		};
	}, [ setError ] );

	return (
		<iframe
			title="Two-Factor Revalidation"
			ref={ useMergeRefs( [ ref, useFocusableIframe() ] ) }
			src={ record[ '2fa_revalidation' ].revalidate_url }
		/>
	);
}
