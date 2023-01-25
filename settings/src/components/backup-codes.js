/**
 * WordPress dependencies
 */
import { useContext } from '@wordpress/element';
import { Button, CheckboxControl } from '@wordpress/components';
import { Icon, warning } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';
import SetupProgressBar from './setup-progress-bar';

//
export default function TOTP() {
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
	const hasPrinted = false; /* make state */

	return (
		<>
			<SetupProgressBar step="backup-codes" />

			<p>
				Backup codes let you access your account if your primary two-factor authentication method is unavailable, like if your phone is lost or stolen.
				Each code can only be used once.
			</p>

			<p>Please print the codes and keep them in a safe place.</p>

			<CodeList />

			<p>
				<Icon icon={ warning } className="wporg-2fa__print-codes-warning" />
				Without access to the one-time password app or a backup code, you will lose access to your account.
				Once you navigate away from this page, you will not be able to view these codes again.
			</p>

			<CheckboxControl
				label="I have printed or saved these codes"
				checked={ hasPrinted }
				onChange={ console.log( 'todo update state' ) }
			/>

			<p>
				<Button
					isPrimary
					disabled={ ! hasPrinted }
					onClick={ console.log( 'todo save the codes to usermeta' ) }
				>
					All Finished
				</Button>
			</p>
		</>
	);
}

/**
 * Fetch and display a list of backup codes
 */
function CodeList() {
	const codes = [
		53532411, 69155486, 84512889, 87518529, 71203631,
		26050601, 78319488, 36118778, 89935526, 86454379
	];
	// fetch via xhr. maybe need to do this as useeffect in Setup so that the save function has access to the codes
	// if so update jsdoc to reflect that not fetching, and add param to accept codes. empty array for loading

	return (
		<code className="wporg-2fa__backup-codes-list">
			{ ! codes &&
				<p>Loading...</p>
				/* test this */
			}

			{ codes &&
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
		</code>
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
