/**
 * WordPress dependencies
 */
import { Flex, Snackbar } from '@wordpress/components';
import { cancelCircleFilled, check } from '@wordpress/icons';

// Success notices are strings; errors are passed as `{ message, isError: true }`.
export default function GlobalNotice( { notice, setNotice } ) {
	if ( ! notice ) {
		return;
	}

	const isError = !! notice.isError;

	return (
		<Flex justify="flex-end">
			<Snackbar
				className={ 'wporg-2fa__global-notice' + ( isError ? ' is-error' : '' ) }
				icon={ isError ? cancelCircleFilled : check }
				explicitDismiss
				onRemove={ () => setNotice( '' ) }
			>
				{ isError ? notice.message : notice }
			</Snackbar>
		</Flex>
	);
}
