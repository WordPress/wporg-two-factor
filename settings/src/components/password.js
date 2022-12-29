/**
 * External dependencies
 */
import { pick } from 'lodash';
// window.zxcvbn is also used, but can't be declared here because it's loaded asyncronously.

/**
 * WordPress dependencies
 */
import { Button, Flex, Notice, TextControl }     from '@wordpress/components';
import { useCallback, useEffect, useState }      from '@wordpress/element';
import { Icon, cancelCircleFilled, check, seen } from '@wordpress/icons';

import {} from '@wordpress/util'; // Enqueue via asset.php.
const { post } = wp.ajax;

/**
 * Render the Password setting.
 */
export default function Password( { userRecord, userRequires2fa } ) {
	const [ passwordStrong, setPasswordStrong ] = useState( false );
	const [ saved, setSaved ]                   = useState( false );
	const [ generating, setGenerating ]         = useState( false );
	const [ inputType, setInputType ]           = useState( 'password' );

	useEffect( () => {
		if ( ! userRecord.editedRecord.password ) {
			return;
		}

		setSaved( false );
		setPasswordStrong( isPasswordStrong( userRecord.editedRecord.password, userRecord.record, userRequires2fa ) );
	}, [ userRecord.editedRecord.password ] );

	/**
	 * @todo When starting from a fresh page load, theres a flash of the red "too easy" notice before it shows
	 * the success notice. It happens between the time when `edit()` is called and the `useEffect` callback fires
	 * to update the `passwordStrong` state. Is there a way to tell React to wait until both are done to re-render?
	 * Or maybe the condition that renders the notice can include something like `hasResolved`?
	 */
	const generatePassword = useCallback( async () => {
		setGenerating( true );
		const password = await post( 'generate-password' );

		userRecord.edit( { password } );
		setInputType( 'text' );
		setGenerating( false );
	}, [] );

	/**
	 * @todo This works the first time it's called, but subsequent calls result in a `403` error. That might be
	 * because changing the password resets the auth cookies. The failed request is automatically repeated by
	 * `useEntityRecord.save()`, though, and that request succeeds. The only tangible problem here is the console
	 * error, but it'd be nice to fix that.
	 */
	const savePassword = useCallback( async () => {
		await userRecord.save();
		setSaved( true );
	}, [] );

	return (
		<>
			{ saved &&
				<Notice status="success" isDismissible={ false }>
					<Icon icon={ check } />
					New password saved.
				</Notice>
			}

			<p>
				To update your password enter a new one below.
				Strong passwords are random, at least twenty characters long, and include uppercase letters and symbols.
			</p>

			<p>
				For convenience, use a password manager to store and automatically enter passwords.
				For more information, read about <a href="https://wordpress.org/support/article/password-best-practices/">password best practices</a>.
			</p>

			<Flex>
				<TextControl
					type={ inputType }
					autoComplete="new-password"
					autoCapitalize="off"
					autoCorrect="off"
					help="The generate button will create a secure, random password."
					label="New Password"
					size="62"
					value={ userRecord.editedRecord.password ?? '' }
					placeholder="Q1jtBPRmROv51KOtbZ5aIKrc"
					onChange={ ( password ) => userRecord.edit( { password } ) }
				/>

				<Button onClick={ () => setInputType( inputType === 'password' ? 'text' : 'password' ) }>
					{/* @todo style closer to mockup */ }
					<Icon icon={ seen } />
				</Button>
			</Flex>

			{ userRecord.hasEdits && passwordStrong &&
				<Notice status="success" isDismissible={ false }>
					<Icon icon={ check } />
					Your password is strong enough to be saved.
				</Notice>
			}

			{ userRecord.hasEdits && ! passwordStrong &&
				<Notice status="error" isDismissible={ false }>
					<Icon icon={ cancelCircleFilled } />
					That password is too easy to compromise. Please make it longer and/or add random numbers/symbols.
				</Notice>
			}

			<p>
				<Button
					variant="primary"
					disabled={ passwordStrong && ! userRecord.isSaving ? '' : 'disabled' }
					onClick={ savePassword }
				>
					{ userRecord.isSaving ? 'Saving...' : 'Save password' }
				</Button>

				<Button
					variant="secondary"
					onClick={ generatePassword }
				>
					{ generating ? 'Generating...' : 'Generate strong password' }
				</Button>
			</p>
		</>
	);
}

/**
 * Determines if the password is strong.
 *
 * @todo maybe have a Context for the user params so don't have to drill down to here?
 */
function isPasswordStrong( password, userRecord, userRequires2fa ) {
	const { zxcvbn } = window; // Done here because it's loaded asyncronously.

	if ( ! zxcvbn ) {
		return false; // Not loaded yet.
	}

	let blocklist = Object.values( pick(
		userRecord,
		[ 'email', 'description', 'first_name', 'last_name', 'name', 'nickname', 'slug', 'username' ]
	) );
	blocklist = blocklist.concat( [ 'wordpress', 'wporg', 'wordpressorg' ] );

	const minimumScore = userRequires2fa ? 4 : 3;
	const strength     = zxcvbn( password, blocklist );

	return strength.score >= minimumScore;
}
