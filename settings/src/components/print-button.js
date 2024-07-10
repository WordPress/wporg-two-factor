/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';
import { Button, Dashicon } from '@wordpress/components';

export default function PrintButton() {
	const onClick = useCallback( () => {
		window.print();
	}, [] );

	return (
		<Button onClick={ onClick } variant="secondary">
			<Dashicon icon="printer" />
			<span className="screen-reader-text">Print</span>
		</Button>
	);
}
