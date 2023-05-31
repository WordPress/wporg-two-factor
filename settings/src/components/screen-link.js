/**
 * WordPress dependencies
 */
import { useCallback, useContext } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';

/**
 *
 * @param props
 * @param props.currentScreen
 * @param props.nextScreen
 * @param props.anchorText
 * @param props.buttonStyle
 * @param props.ariaLabel
 */
export default function ScreenLink( {
	currentScreen = '',
	nextScreen,
	anchorText,
	buttonStyle = false,
	ariaLabel,
} ) {
	const { navigateToScreen } = useContext( GlobalContext );
	const classes = [];
	const screenUrl = new URL( document.location.href );

	screenUrl.searchParams.set( 'screen', nextScreen );

	if ( 'primary' === buttonStyle ) {
		classes.push( 'components-button' );
		classes.push( 'is-primary' );
	} else if ( 'secondary' === buttonStyle ) {
		classes.push( 'components-button' );
		classes.push( 'is-secondary' );
	}

	const onClick = useCallback( ( event ) => {
		event.preventDefault();
		navigateToScreen( { currentScreen, nextScreen } );
	}, [] );

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
