/**
 * WordPress dependencies
 */
import { useContext, useEffect, useRef, useState } from '@wordpress/element';
import { GlobalContext } from '../script';
import { Button, Modal, __experimentalHStack as HStack } from '@wordpress/components';
import { useMergeRefs, useFocusableIframe } from '@wordpress/compose';
import { refreshRecord } from '../utilities'

export default function RevalidateModal( { screen } ) {
	const { userRecord, clickScreenLink } = useContext( GlobalContext );
	const [ showIframe, setIframe ] = useState( false );

	const goBack = ( event ) => clickScreenLink( event, 'account-status' ); 
	const showRevalidate = () => setIframe( true );

	if ( showIframe ) {
		return (
			<Modal title="Confirm your Two Factor" onRequestClose={ goBack }>
				<RevalidateIframe screen={ screen } />
			</Modal>
		);
	}

	return (
		<Modal title="Confirm your Two Factor" onRequestClose={ goBack }>
			<p>
				Before you can update your Two Factor details, you first need to reconfirm your existing login.
			</p>
			<HStack justify="right">
				<Button variant="secondary" onClick={ goBack }>
					Cancel
				</Button>
				<Button variant="primary" onClick={ showRevalidate }>
					Continue
				</Button>
			</HStack>
		</Modal>
	);
}

function RevalidateIframe( { screen } ) {
	const { setGlobalNotice, setScreen, userRecord } = useContext( GlobalContext );
	const ref = useRef();

	useEffect( () => {
		function maybeRefreshUser( { event, data: { type, message } = {} } ) {
			if ( type != 'reValidationComplete' ) {
				return;
			}

			refreshRecord( userRecord );
			setGlobalNotice( message || 'Two Factor confirmed' );
			setScreen( screen );
		}

		window.addEventListener( 'message', maybeRefreshUser );
		return () => {
			window.removeEventListener( 'message', maybeRefreshUser );
		};
	}, [] );

	return (
		<>
			<iframe
				ref={ useMergeRefs( [ ref, useFocusableIframe() ] ) }
				src={ userRecord.record[ '2fa_revalidation' ].revalidate_url }
				width="400px"
				height="400px"
			/>
		</>
	);
}