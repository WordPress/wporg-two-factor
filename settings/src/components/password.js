/**
 * External dependencies
 *
 * window.zxcvbn is also used, but can't be enqueued via an `import` because the handle doesn't have a 'wp-'
 * prefix. Instead, it's enqueued via `block.json`. It also can't be declared/destructured here because it's
 * loaded asynchronously.
 */
import { pick } from 'lodash';
import { generatePassword } from '@automattic/generate-password';

/**
 * WordPress dependencies
 */
import { Button, Flex, Notice, TextControl } from '@wordpress/components';
import { useCallback, useContext, useEffect, useState } from '@wordpress/element';
import { Icon, cancelCircleFilled, check, seen, unseen } from '@wordpress/icons';
import apiFetch from '@wordpress/api-fetch';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';

/**
 * Render the Password setting.
 */
export default function Password() {
	const {
		setGlobalNotice,
		user: {
			userRecord: { hasEdits, editedRecord, record, edit, save },
			isSaving,
		},
	} = useContext( GlobalContext );
	const [ inputType, setInputType ] = useState( 'password' );
	const [ hasAttemptedSave, setHasAttemptedSave ] = useState( false );
	let passwordStrong = true; // Saved passwords have already passed the test.

	if ( hasEdits ) {
		passwordStrong = isPasswordStrong( editedRecord.password, record );
	}

	// Clear the "saved password" notice when password is being changed.
	useEffect( () => {
		if ( ! hasEdits ) {
			return;
		}

		setGlobalNotice( '' );
	}, [ hasEdits ] );

	/**
	 * Handle clicking the `Generate Password` button.
	 */
	const handlePasswordGenerate = useCallback( async () => {
		edit( { password: generatePassword( 24, true, true ) } );
		setInputType( 'text' );
	}, [] );

	// Handle form submission.
	const handleFormSubmit = useCallback(
		async ( event ) => {
			event.preventDefault();

			setHasAttemptedSave( true );

			if ( ! passwordStrong || isSaving ) {
				return;
			}

			await save();

			// Changing the password resets the nonce, which causes subsequent API requests to fail. `apiFetch()` will
			// retry them automatically, but that results in an extra XHR request and a console error.
			const response = await apiFetch( {
				url: apiFetch.nonceEndpoint,
				parse: false,
			} );
			apiFetch.nonceMiddleware.nonce = await response.text();

			setGlobalNotice( 'New password saved.' );
		},
		[ passwordStrong, isSaving ]
	);

	const handlePasswordChange = useCallback( ( password ) => edit( { password } ), [] );

	const handlePasswordToggle = useCallback(
		() => setInputType( inputType === 'password' ? 'text' : 'password' ),
		[ inputType ]
	);

	return (
		<form onSubmit={ handleFormSubmit }>
			<div className="wporg-2fa__screen-intro">
				<p>
					To update your password enter a new one below. Strong passwords are random, at
					least twenty characters long, and include uppercase letters and symbols.
				</p>

				<p>
					For convenience, use a password manager to store and automatically enter
					passwords. For more information, read about{ ' ' }
					<a href="https://wordpress.org/documentation/article/password-best-practices/">
						password best practices
					</a>
					.
				</p>
			</div>

			<Flex className="wporg-2fa__password_container">
				<TextControl
					type={ inputType }
					autoComplete="new-password"
					autoCapitalize="off"
					autoCorrect="off"
					help="The generate button will create a secure, random password."
					label="New Password"
					size="62"
					value={ editedRecord.password ?? '' }
					placeholder="Enter New Password..."
					onChange={ handlePasswordChange }
				/>
				<Button
					className="wporg-2fa__show-password"
					size={ 24 }
					onClick={ handlePasswordToggle }
					aria-label={ inputType === 'password' ? 'Show Password' : 'Hide Password' }
					title={ inputType === 'password' ? 'Show Password' : 'Hide Password' }
				>
					<Icon icon={ inputType === 'password' ? seen : unseen } />
				</Button>
			</Flex>

			{ hasEdits && passwordStrong && (
				<Notice status="success" isDismissible={ false }>
					<Icon icon={ check } />
					Your password is strong enough to be saved.
				</Notice>
			) }

			{ hasEdits && editedRecord.password && hasAttemptedSave && ! passwordStrong && (
				<Notice status="error" isDismissible={ false }>
					<Icon icon={ cancelCircleFilled } />
					That password is too easy to compromise. Please make it longer and/or add random
					numbers/symbols.
				</Notice>
			) }

			<p className="wporg-2fa__submit-actions">
				<Button isPrimary disabled={ ! editedRecord.password } type="submit">
					{ isSaving ? 'Saving...' : 'Save password' }
				</Button>

				{ window.crypto?.getRandomValues && (
					<Button isSecondary onClick={ handlePasswordGenerate }>
						Generate strong password
					</Button>
				) }
			</p>
		</form>
	);
}

/**
 * Determines if the password is strong.
 *
 * Validation is also done on the backend by `security-weak-passwords.php`.
 *
 * @param {string} password
 * @param {Object} userData
 * @return {boolean} true if the password is strong, false otherwise
 */
function isPasswordStrong( password, userData ) {
	const { zxcvbn } = window; // Done here because it's loaded asynchronously.

	if ( ! zxcvbn ) {
		return false; // Not loaded yet.
	}

	let blocklist = Object.values(
		pick( userData, [
			'email',
			'description',
			'first_name',
			'last_name',
			'name',
			'nickname',
			'slug',
			'username',
		] )
	);
	blocklist = blocklist.concat( [ 'wordpress', 'wporg', 'wordpressorg' ] );

	// `3` is "safely unguessable: moderate protection from offline slow-hash scenario. (guesses < 10^10)"
	// `4` is "very unguessable: strong protection from offline slow-hash scenario. (guesses >= 10^10)"
	const minimumScore = userData[ '2fa_required' ] ? 4 : 3;
	const strength = zxcvbn( password, blocklist );

	return strength.score >= minimumScore;
}
