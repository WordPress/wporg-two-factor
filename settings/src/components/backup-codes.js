//
export default function TOTP( { userRecord } ) {
	const enabledProviders  = Object.values( userRecord.record[ '2fa_enabled_providers' ] );
	const backupCodesStatus = enabledProviders.includes( 'Two_Factor_Backup_Codes' ) &&
	record[ '2fa_backup_codes_remaining' ] > 0 ? 'enabled' : 'disabled';

	return (
		<>
			{ 'disabled' === backupCodesStatus && <Setup /> }
			{ 'enabled' === backupCodesStatus && <Manage /> }
		</>
	);
}

//
function Setup() {
	return (
		<>
			<p>
				Backup codes let you access your account if your phone is lost, stolen, or if you run it through the washing machine and the bag of rice trick doesn't work.
				We ask that you print this list of ten unique, one-time-use backup codes and keep the list in a safe place.
			</p>

			<p>
				Backup codes let you access your account if your phone is lost or stolen, or even just accidentally run through the washing machine!

			</p>

			<code>
				backup codes
			</code>

			<p>
				red exclamation mark icon
				Without access to the app, your phone, or a backup code, you will lose access to your account.


				check box
				I have printed or saved these codes

				all finished primary button

				copy icon button
				print icon button
				download icon button
			</p>
		</>
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
