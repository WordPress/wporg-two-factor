/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';
import { Button } from '@wordpress/components';

export default function DownloadTxtButton( { codes, fileName = 'backup-codes.txt' } ) {
	const downloadTxtFile = useCallback( () => {
		const element = document.createElement( 'a' );
		const file = new Blob( [ codes ], { type: 'text/plain' } );
		element.href = URL.createObjectURL( file );
		element.download = fileName;
		document.body.appendChild( element ); // Required for Firefox
		element.click();
		document.body.removeChild( element );
	}, [ codes, fileName ] );

	return (
		<Button variant="secondary" onClick={ downloadTxtFile }>
			Download
		</Button>
	);
}
