/**
 * WordPress dependencies
 */
import { Flex, Snackbar } from '@wordpress/components';
import { check } from '@wordpress/icons';

export default function GlobalNotice( { notice } ) {
	if ( ! notice ) {
		return;
	}

	return (
		<Flex justify="flex-end">
			<Snackbar className="wporg-2fa__global-notice" icon={ check }>
				{ notice }
			</Snackbar>
		</Flex>
	);
}
