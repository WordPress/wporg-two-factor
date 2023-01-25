/**
 * WordPress dependencies
 */
import apiFetch                                         from '@wordpress/api-fetch';
import { useContext, useCallback, useEffect, useState } from '@wordpress/element';
import { Button, CheckboxControl, Spinner }             from '@wordpress/components';
import { Icon, warning }                                from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';
import { refreshRecord } from '../utilities';
import SetupProgressBar  from './setup-progress-bar';


//
export default function BackupCodes() {
	const { userRecord }    = useContext( GlobalContext );
	const backupCodesStatus = userRecord.record[ '2fa_available_providers' ].includes( 'Two_Factor_Backup_Codes' ) ? 'enabled' : 'disabled';

	if ( 'enabled' === backupCodesStatus ) {
		return <Manage />;
	} else {
		return <Setup />;
	}
}

//
function Setup() {
	const { setGlobalNotice, userRecord } = useContext( GlobalContext );
	const [ backupCodes, setBackupCodes ] = useState( [] );
	const [ hasPrinted, setHasPrinted ]   = useState( false );

	// Generate new backup codes and save them in usermeta.
	useEffect( () => {
		// useEffect callbacks can't be async directly, because that'd return the promise as a "cleanup" function.
		const generateCodes = async () => {
			// This will save the backup codes and enable the provider, which isn't really what we want, but that
			// mimics the upstream plugin. It's probably better to fix it there first, and then update this, to
			// make sure we stay in sync with upstream.
			// See https://github.com/WordPress/two-factor/issues/507
			const response = await apiFetch( {
				path: '/two-factor/1.0/generate-backup-codes',
				method: 'POST',
				data: {
					user_id: userRecord.record.id,
					method: 'replace',
					number: 10
				}
			} );

			setBackupCodes( response.codes );
		};

		generateCodes();
	}, [] );

	// Finish the setup process.
	const handleFinished = useCallback( () => {
		// The codes have already been saved to usermeta, see `generateCodes()` above.
		refreshRecord( userRecord ); // This will redirect to the Manage screen.
		setGlobalNotice( 'Backup codes have been enabled.' );
	} );

	return (
		<>
			<SetupProgressBar step="backup-codes" />

			<p>
				Backup codes let you access your account if your primary two-factor authentication method is unavailable, like if your phone is lost or stolen.
				Each code can only be used once.
			</p>

			<p>Please print the codes and keep them in a safe place.</p>

			<CodeList codes={ backupCodes } />

			<p>
				<Icon icon={ warning } className="wporg-2fa__print-codes-warning" />
				Without access to the one-time password app or a backup code, you will lose access to your account.
				Once you navigate away from this page, you will not be able to view these codes again.
			</p>

			<CheckboxControl
				label="I have printed or saved these codes"
				checked={ hasPrinted }
				onChange={ setHasPrinted }
			/>

			<p>
				<Button
					isPrimary
					disabled={ ! hasPrinted }
					onClick={ handleFinished }
				>
					All Finished
				</Button>

				{/* maybe need a cancel button here that deletes the codes?
				i don't really wanna save them until they click 'all finished'
				even if have cancel could still have problem if they just click back or close the page. they won't expect that simply
				*/}
			</p>
		</>
	);
}

/**
 * Display a list of backup codes
 */
function CodeList( { codes } ) {
	return (
		<div className="wporg-2fa__backup-codes-list">
			{ ! codes.length &&
				<p>
					Generating backup codes...
					<Spinner />
				</p>
				/* test this */
			}

			{ codes.length > 0 &&
				<ol>
					{ codes.map( ( code ) => {
						return (
							 <li key={ code }>
								 { code }
							 </li>
						)
					} ) }
				</ol>
			}
		</div>
	);
}

//
function Manage() {
	//make this DRY with the setup screen - modularize Setup so that this can call indivitual components

	return (
		<>
			Generate new backup codes button - on click populates area below with new codes

			<p>
				Backup codes let you access your account if your phone is lost or stolen, or even just accidentally run through the washing machine!
			</p>

			<p>
				red exclamation mark icon
				Backup codes have not been verified.
			</p>

			<p>
				Type a Backup Code to Verify
				input field with placeholder "e.g. 12345678"
			</p>

			Verify button
		</>
	);
}
