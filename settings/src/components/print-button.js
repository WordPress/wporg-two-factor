/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';
import { Button } from '@wordpress/components';

export default function PrintButton() {
	const onClick = useCallback( () => {
		window.print();
	}, [] );

	return (
		<Button onClick={ onClick } variant="secondary">
			Print
		</Button>
	);
}
