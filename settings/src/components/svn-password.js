/**
 * WordPress dependencies
 */
import { Button, Notice, Spinner } from '@wordpress/components';
import { useCallback, useContext } from '@wordpress/element';
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
				record: { svn_password: svnPassword },
				edit,
				save,
			},
			isSaving,
		},
		setGlobalNotice,
	} = useContext( GlobalContext );

	const handleGenerate = useCallback( async () => {
		try {
			await edit( { svn_password: 'regenerate' } );
			await save();
		} catch ( error ) {
			setGlobalNotice( error.message );
		}
	}, [ edit, save ] );

	const handleCopy = useCallback( () => {
		try {
			navigator.clipboard.writeText( svnPassword );
			setGlobalNotice( 'Copied to clipboard' );
		} catch ( error ) {
			setGlobalNotice( "Couldn't write to clipboard" );
		}
	}, [ svnPassword ] );

	// TODO: Trigger this on navigate away.
	const hidePassword = useCallback( () => {
		// TODO use record[ 'svn_password' ] = true such that it doesn't attempt to save it.
		edit( { svn_password: true } );
	}, [] );

	// TODO: This also requires 2FA verification prior to changing password.

	return (
		<>
			<p>
				Your SVN password can be used to commit to WordPress.org SVN repositories, such as
				for a plugin or theme.
			</p>
			<p>
				If you forget your SVN password, you can generate a new one here. Never share your
				SVN password with anyone.
			</p>

			{ svnPassword && 'string' === typeof svnPassword && (
				<Notice status="success" isDismissible={ true } onRemove={ hidePassword }>
					<Icon icon={ check } />
					New Password generated: <code>{ svnPassword }</code>
					<Icon
						icon={ copySmall }
						onClick={ handleCopy }
						className="wporg-2fa__svn-copy-password"
						label="Copy to clipboard"
					/>
				</Notice>
			) }

			<p className="wporg-2fa__submit-actions">
				<Button variant="primary" onClick={ handleGenerate } disabled={ isSaving }>
					{ isSaving ? (
						<>
							<Spinner />
							Requesting..
						</>
					) : svnPassword ? (
						'Regenerate password'
					) : (
						'Request password'
					) }
				</Button>
			</p>
		</>
	);
}
