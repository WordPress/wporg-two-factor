/**
 * WordPress dependencies
 */
import { useContext } from '@wordpress/element';
import { GlobalContext } from '../script';
import { Button, Modal, __experimentalHStack as HStack } from '@wordpress/components';

export default function RevalidateModal() {
	const { userRecord, clickScreenLink } = useContext( GlobalContext );

	const goBack = ( event ) => clickScreenLink( event, 'account-status' ); 
	const goRevalidate = () => {
		var url = new URL( userRecord.record[ '2fa_revalidation' ].revalidate_url );
		url.searchParams.set( 'redirect_to', encodeURI( window.location.href ) );

		window.location = url.href;
	};

	return (
		<Modal title="Confirm your Two Factor" onRequestClose={ goBack }>
			<p>
				Before you can update your Two Factor details, you first need to reconfirm your existing login.
			</p>
			<HStack justify="right">
				<Button variant="secondary" onClick={ goBack }>
					Cancel
				</Button>
				<Button variant="primary" onClick={ goRevalidate }>
					Continue
				</Button>
			</HStack>
		</Modal>
	);
}
