/**
 * External dependencies
 *
 * window.zxcvbn is also used, but can't be enqueued via an `import` because the handle doesn't have a 'wp-'
 * prefix. Instead, it's enqueued via `block.json`. It also can't be declared/destructured here because it's
 * loaded asyncronously.
 */
import { pick } from 'lodash';
import { generatePassword } from '@automattic/generate-password';

/**
 * WordPress dependencies
 */
import { Button, Flex, Notice, TextControl }            from '@wordpress/components';
import { useCallback, useContext, useEffect, useState } from '@wordpress/element';
import { Icon, cancelCircleFilled, check, seen }        from '@wordpress/icons';
import apiFetch                                         from '@wordpress/api-fetch';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';

/**
 * Render the Password setting.
 */
export default function Password() {
	const { setGlobalNotice, userRecord }       = useContext( GlobalContext );
	const [ passwordStrong, setPasswordStrong ] = useState( false );
	const [ inputType, setInputType ]           = useState( 'password' );

	// Check strength every time the password changes.
	useEffect( () => {
		if ( ! userRecord.editedRecord.password ) {
			return;
		}

		setGlobalNotice( '' );
		setPasswordStrong( isPasswordStrong( userRecord.editedRecord.password, userRecord.record ) );
	}, [ userRecord.editedRecord.password ] );

	/**
	 * Handle clicking the `Generate Password` button.
	 *
	 * @todo When starting from a fresh page load, there's a flash of the red "too easy" notice before it shows
	 * the success notice. It happens between the time when `edit()` is called and the `useEffect` callback fires
	 * to update the `passwordStrong` state. Is there a way to tell React to wait until both are done to re-render?
	 * Or maybe the condition that renders the notice can include something like `hasResolved`?
	 */
	const generatePasswordHandler = useCallback( async () => {
		userRecord.edit( { password: generatePassword( 24, true, true ) } );
		setInputType( 'text' );
	}, [] );

	// Handle clicking the `Save Password` button.
	const savePasswordHandler = useCallback( async () => {
		await userRecord.save();

		// Changing the password resets the nonce, which causes subsequent API requests to fail. `apiFetch()` will
		// retry them automatically, but that results in an extra XHR request and a console error.
		const response = await apiFetch( {
			url:   apiFetch.nonceEndpoint,
			parse: false
		} );
		apiFetch.nonceMiddleware.nonce = await response.text();

		setGlobalNotice( 'New password saved.' );
	}, [] );

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
					{/* @todo style closer to mockup.
					 todo shrinks too small on mobile */ }
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
					isPrimary
					disabled={ passwordStrong && ! userRecord.isSaving ? '' : 'disabled' }
					onClick={ savePasswordHandler }
				>
					{ userRecord.isSaving ? 'Saving...' : 'Save password' }
				</Button>

				{ window.crypto?.getRandomValues &&
					<Button
						isSecondary
						onClick={ generatePasswordHandler }
					>
						Generate strong password
					</Button>
				}
			</p>
		</>
	);
}

/**
 * Determines if the password is strong.
 *
 * Validation is also done on the backend by `security-weak-passwords.php`.
 *
 * @returns {boolean}
 */
function isPasswordStrong( password, userData ) {
	const { zxcvbn } = window; // Done here because it's loaded asyncronously.

	if ( ! zxcvbn ) {
		return false; // Not loaded yet.
	}

	let blocklist = Object.values( pick(
		userData,
		[ 'email', 'description', 'first_name', 'last_name', 'name', 'nickname', 'slug', 'username' ]
	) );
	blocklist = blocklist.concat( [ 'wordpress', 'wporg', 'wordpressorg' ] );

	// `3` is "safely unguessable: moderate protection from offline slow-hash scenario. (guesses < 10^10)"
	// `4` is "very unguessable: strong protection from offline slow-hash scenario. (guesses >= 10^10)"
	const minimumScore = userData['2fa_required'] ? 4 : 3;
	const strength     = zxcvbn( password, blocklist );

	return strength.score >= minimumScore;
}
