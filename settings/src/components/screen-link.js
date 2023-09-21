/**
 * WordPress dependencies
 */
import { useCallback, useContext } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';

export default function ScreenLink( { screen, anchorText, buttonStyle = false, ariaLabel } ) {
	const { navigateToScreen, setBackupCodesVerified } = useContext( GlobalContext );
	const classes = [];
	const screenUrl = new URL( document.location.href );

	screenUrl.searchParams.set( 'screen', screen );

	if ( 'primary' === buttonStyle ) {
		classes.push( 'components-button' );
		classes.push( 'is-primary' );
	} else if ( 'secondary' === buttonStyle ) {
		classes.push( 'components-button' );
		classes.push( 'is-secondary' );
	}

	const onClick = useCallback(
		( event ) => {
			event.preventDefault();

			// When generating Backup Codes, they're automatically saved to the database, so clicking `Back` is
			// implicitly verifying them, or at least needs to be treated that way. This should be removed once
			// `two-factor/#507` is fixed, though.
			setBackupCodesVerified( true );

			navigateToScreen( screen );
		},
		[ navigateToScreen ]
	);

	return (
		<a
			href={ screenUrl.href }
			onClick={ onClick }
			className={ classes.join( ' ' ) }
			aria-label={ ariaLabel }
		>
			{ anchorText }
		</a>
	);
}
