import { useSelect } from '@wordpress/data';
import { store as coreDataStore, useEntityRecord } from '@wordpress/core-data';

/**
 * Get the user.
 *
 * @param userId
 */
export function useUser( userId ) {
	const userRecord = useEntityRecord( 'root', 'user', userId );
	const isSaving = useSelect( ( select ) =>
		select( coreDataStore ).isSavingEntityRecord( 'root', 'user', userId )
	);

	const availableProviders = userRecord.record?.[ '2fa_available_providers' ] ?? [];
	const primaryProvider = userRecord.record?.[ '2fa_primary_provider' ] ?? null;
	const backupCodesRemaining = userRecord.record?.[ '2fa_backup_codes_remaining' ] ?? 0;
	const totpEnabled = availableProviders.includes( 'Two_Factor_Totp' );
	const backupCodesEnabled = availableProviders.includes( 'Two_Factor_Backup_Codes' );
	const webAuthnEnabled = availableProviders.includes( 'TwoFactor_Provider_WebAuthn' );
	const hasPrimaryProvider = totpEnabled || webAuthnEnabled;

	return {
		userRecord: { ...userRecord },
		isSaving,
		hasPrimaryProvider,
		primaryProvider,
		totpEnabled,
		backupCodesEnabled,
		webAuthnEnabled,
		backupCodesRemaining,
	};
}
