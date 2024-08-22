/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, Spinner } from '@wordpress/components';
import { useCallback, useContext, useState } from '@wordpress/element';
import { Icon, check } from '@wordpress/icons';
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
				Your username for SVN is the same as your WordPress.org account login, but is
				case-sensitive. When using SVN you will need to use the username{ ' ' }
				<code>{ userRecord.record.username }</code>. For security, your WordPress.org
				account password cannot be used to commit to SVN, you must use a separate SVN
				password, which you can generate here.
			</p>

			<p>
				If you lose your SVN password, you can replace it by generating a new one at any
				time. All previous SVN passwords will be invalidated immediately.
			</p>

			{ generatedPassword && (
				<Notice
					status="success"
					isDismissible={ true }
					onRemove={ () => setGeneratedPassword( false ) }
				>
					<Icon icon={ check } />
					Your new SVN Password:{ ' ' }
					<code>{ isGenerating ? <Spinner /> : generatedPassword }</code>
					<CopyToClipboardButton codes={ generatedPassword } />
				</Notice>
			) }

			<p className="wporg-2fa__submit-actions">
				<Button variant="primary" onClick={ handleGenerate } disabled={ isGenerating }>
					{ isGenerating ? (
						<>
							<Spinner />
							Generating..
						</>
					) : (
						<>Generate password</>
					) }
				</Button>
			</p>
		</>
	);
}
