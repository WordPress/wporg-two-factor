/**
 * WordPress dependencies
 */
import { useCallback, useState } from '@wordpress/element';
import { Button } from '@wordpress/components';

export default function CopyToClipboardButton( { contents, variant = 'secondary' } ) {
	const [ copied, setCopied ] = useState( false );

	const onClick = useCallback( () => {
		navigator.clipboard.writeText( contents ).then( () => {
			setCopied( true );
			setTimeout( () => setCopied( false ), 2000 );
		} );
	}, [ contents ] );

	return (
		<Button variant={ variant } onClick={ onClick }>
			{ copied ? 'Copied!' : 'Copy' }
		</Button>
	);
}
