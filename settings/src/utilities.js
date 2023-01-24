import { useSelect } from '@wordpress/data';
import { store as coreDataStore, useEntityRecord } from '@wordpress/core-data';

/**
 * Fetch the user record.
 */
export function getUserRecord( userId ) {
	let userRecord = useEntityRecord( 'root', 'user', userId );

	// Polyfill in isSaving.
	if ( undefined === userRecord.isSaving ) {
		userRecord.isSaving = useSelect( ( select ) => select( coreDataStore ).isSavingEntityRecord( 'root', 'user', userId ) );
	}

	return userRecord;
}

