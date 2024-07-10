/**
 * WordPress dependencies
 */
import { useCallback, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { Button, Dashicon } from '@wordpress/components';

export default function CopyToClipboardButton( { codes } ) {
	const [ copied, setCopied ] = useState( false );

	const onClick = useCallback( () => {
		navigator.clipboard.writeText( codes ).then( () => {
			setCopied( true );
			setTimeout( () => setCopied( false ), 2000 );
		} );
	}, [ codes ] );

	return (
		<Button variant="secondary" onClick={ onClick }>
			{ copied ? (
				<>
					<Dashicon icon="yes" />
					<span>Copied!</span>
				</>
			) : (
				<>
					<Dashicon icon="clipboard" />
					<span className="screen-reader-text">Print</span>
				</>
			) }
		</Button>
	);
}
