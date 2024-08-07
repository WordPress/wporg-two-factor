/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, Spinner } from '@wordpress/components';
import { useCallback, useContext, useState } from '@wordpress/element';
import { Icon, check, copySmall } from '@wordpress/icons';
import { refreshRecord } from '../utilities/common';

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
		setGlobalNotice,
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

	const handleCopy = useCallback( () => {
		try {
			navigator.clipboard.writeText( generatedPassword );
			setGlobalNotice( 'Copied to clipboard' );
		} catch ( error ) {
			setGlobalNotice( "Couldn't write to clipboard" );
		}
	}, [ generatedPassword ] );

	return (
		<>
			<p>
				Your SVN password can be used to commit to WordPress.org SVN repositories, such as
				for a plugin or theme.
			</p>
			<p>
				If you forget your SVN password, you can generate a new one here. All previous SVN
				passwords will be invalidated.
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
					<Icon
						icon={ copySmall }
						onClick={ handleCopy }
						className="wporg-2fa__svn-copy-password"
						label="Copy to clipboard"
					/>
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
						<>
							Generate password
						</>
					) }
				</Button>
			</p>
		</>
	);
}
