/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { Button } from '@wordpress/components';
import { useCallback, useContext, useState } from '@wordpress/element';
import { refreshRecord } from '../utilities/common';
import CopyToClipboardButton from './copy-to-clipboard-button';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';

/**
 * Render the Email setting.
 */
export default function SVNPassword() {
	const {
		user: { userRecord },
		setError,
	} = useContext( GlobalContext );

	const [ isGenerating, setGenerating ] = useState( false );
	const [ generatedPassword, setGeneratedPassword ] = useState( '' );

	// Generate a new SVN Password.
	const handleGenerate = useCallback( async () => {
		try {
			setGenerating( true );

			const response = await apiFetch( {
				path: '/wporg-two-factor/1.0/generate-svn-password',
				method: 'POST',
				data: {
					user_id: userRecord.record.id,
				},
			} );

			// Fill in the creation date in the user record, we'll refresh it for the actual data below.
			userRecord.record.svn_password_created = new Date().toISOString();

			setGeneratedPassword( response.svn_password );
			setGenerating( false );

			await refreshRecord( userRecord );
		} catch ( apiFetchError ) {
			setError( apiFetchError );
		}
	} );

	return (
		<>
			<p>
				WordPress.org uses Subversion (SVN) for version control, every Plugin and Theme
				hosted by WordPress.org has a access to a SVN repository that the author can commit
				to. For information on using SVN, please see the{ ' ' }
				<a href="https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/">
					WordPress.org Plugin Developer Handbook
				</a>
				.
			</p>

			<p>
				For security, your WordPress.org account password should not be used to commit to
				SVN, use a separate SVN password, which you can generate here.
			</p>

			<h3>Details</h3>
			<ul>
				<li>
					Username: <code>{ userRecord.record.username }</code>{ ' ' }
					{ userRecord.record.username.match( /[^a-z0-9]/ ) && <>(case-sensitive)</> }
				</li>
				<li>
					Password:{ ' ' }
					{ generatedPassword || userRecord.record.svn_password_created ? (
						<>
							<code>{ generatedPassword || 'svn_*****************' }</code>
							&nbsp;
							{ generatedPassword && (
								<CopyToClipboardButton variant="link" codes={ generatedPassword } />
							) }
							{ userRecord.record.svn_password_created && (
								<>
									<br />
									<em className="wporg-2fa__svn-password_generated">
										Generated on{ ' ' }
										{ new Date(
											userRecord.record.svn_password_created
										).toLocaleDateString() }
									</em>
								</>
							) }
						</>
					) : (
						<>
							<em>Not configured</em>
						</>
					) }
				</li>
			</ul>
			<div className="wporg-2fa__submit-actions">
				<Button
					variant="secondary"
					onClick={ handleGenerate }
					isBusy={ isGenerating }
					disabled={ isGenerating }
				>
					Regenerate Password
				</Button>
			</div>
		</>
	);
}
