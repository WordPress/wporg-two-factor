/**
 * WordPress dependencies
 */
import { useCallback, useContext } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';

export default function ScreenLink( { screen, anchorText, buttonStyle = false, ariaLabel } ) {
	const { navigateToScreen } = useContext( GlobalContext );
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
