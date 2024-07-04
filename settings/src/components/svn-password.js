/**
 * WordPress dependencies
 */
import { Button, TextControl, Notice, Spinner } from '@wordpress/components';
import { useCallback, useContext, useState } from '@wordpress/element';
import { Icon, check, copySmall } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';

/**
 * Render the Email setting.
 */
export default function SVNPassword() {
	const {
		user: {
			userRecord: {
				record: { svn_password },
				edit,
				save
			},
			isSaving,
		},
	} = useContext( GlobalContext );

	const handleGenerate = useCallback( async () => {
		try {
			await edit( { svn_password: 'regenerate' } );
			await save();
		} catch ( error ) {
			let message = error.message;

			console.log( error );
		}
	}, [] );

	const handleCopy = useCallback( () => {
		navigator.clipboard.writeText( svn_password );
		alert( "Copied to clipboard" );
	}, [ ] );

	return (
		<>
			<p>
				Your SVN password can be used to commit to WordPress.org SVN repositories, such as for a plugin or theme.
			</p>
			<p>
				If you forget your SVN password, you can generate a new one here. Never share your SVN password with anyone.
			</p>

			{ ( svn_password && 'string' == typeof svn_password ) && (
				<Notice status="success" isDismissible={ true }>
					<Icon icon={ check } />
					New Password generated: <code>{ svn_password }</code>
					<Icon  icon={ copySmall } onClick={ handleCopy } className="wporg-2fa__svn-copy-password" label="Copy to clipboard" />
				</Notice>
			) }

			<p className="wporg-2fa__submit-actions">
				<Button
					variant="primary"
					onClick={ handleGenerate }
					disabled={ isSaving }
				>
					{ isSaving ? (
						<>
							<Spinner />
							Requesting..
						</>
					) : (
						svn_password ? 'Regenerate password' : 'Request password'
					) }
				</Button>
			</p>
		</>
	);
}
