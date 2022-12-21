/**
 * WordPress dependencies
 */
import { Button, TextControl } from '@wordpress/components';

/**
 * Render the Password setting.
 */
export default function Password() {
	// todo
	// use same generator as core, do server side?
	// strength meter
	// warn when weak
	// automatically generate placeholder?
	// how to get empty value so placeholder shows up?

	return (
		<>
			<p>
				To update your password enter a new one below.
				Strong passwords are random, at least twenty characters long, and include uppercase letters and symbols.
			</p>

			<p>
				For convenience, use a password manager to store and automatically enter passwords.
				For more information, read about <a href="https://wordpress.org/support/article/password-best-practices/">password best practices</a>.
			</p>

			<TextControl
				type="password"
				help="The generate button will create a secure, random password."
				label="New password"
				size="62"
				placeholder="E&cCHunA,fG]jqC(,ckM"
				onChange={ () => { console.log('change') } }
			/>

			<p>
				<Button variant="primary" onClick={ savePassword }>
					Save password
				</Button>

				<Button variant="secondary" onClick={ generatePassword }>
					Generate strong password
				</Button>
			</p>
		</>
	);
}

/**
 * Save the new password.
 */
function savePassword( event ) {
	console.log('save');
	// send rest api request
	// on success, update state to show that it's been saved
}

/**
 * Generate a secure, random password.
 */
function generatePassword( event ) {
	// maybe bind this to the Password func so it can directly access
	console.log('generate');
}
