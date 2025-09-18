/**
 * WordPress dependencies
 */
import { Flex, Snackbar } from '@wordpress/components';
import { check } from '@wordpress/icons';

export default function GlobalNotice( { notice, setNotice } ) {
	if ( ! notice ) {
		return;
	}

	return (
		<Flex justify="flex-end">
			<Snackbar
				className="wporg-2fa__global-notice"
				icon={ check }
				explicitDismiss
				onRemove={ () => setNotice( '' ) }
			>
				{ notice }
			</Snackbar>
		</Flex>
	);
}
