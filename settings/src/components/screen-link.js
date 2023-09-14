/**
 * WordPress dependencies
 */
import { useCallback, useContext, useState } from '@wordpress/element';
import { Spinner } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';
import { refreshRecord } from '../utilities/common';

export default function ScreenLink( { screen, anchorText, buttonStyle = false, ariaLabel } ) {
	const {
		user: { userRecord },
		navigateToScreen,
	} = useContext( GlobalContext );
	const classes = [];
	const screenUrl = new URL( document.location.href );
	const [ refreshing, setRefreshing ] = useState( false );

	screenUrl.searchParams.set( 'screen', screen );

	if ( 'primary' === buttonStyle ) {
		classes.push( 'components-button' );
		classes.push( 'is-primary' );
	} else if ( 'secondary' === buttonStyle ) {
		classes.push( 'components-button' );
		classes.push( 'is-secondary' );
	}

	const onClick = useCallback(
		async ( event ) => {
			event.preventDefault();

			if ( refreshing ) {
				return;
			}

			setRefreshing( true );

			// Sometimes the record will have been updated, and those changes need to be reflected on Account
			// Status, but it's not possible for the current screen to refresh the record. For example, Backup
			// Codes can't refresh it if the user generates codes but then clicks "Back" before clicking "All Finished".
			if ( 'account-status' === screen ) {
				await refreshRecord( userRecord );
			}

			navigateToScreen( screen );
		},
		[ navigateToScreen, userRecord, screen ]
	);

	return (
		<a
			href={ screenUrl.href }
			onClick={ onClick }
			className={ classes.join( ' ' ) }
			aria-label={ ariaLabel }
		>
			{ anchorText }

			{ refreshing && <Spinner /> }
		</a>
	);
}
