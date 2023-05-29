/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/components';

const confirm = window.confirm;

/**
 * Render the list of keys.
 *
 * @param props
 * @param props.keys
 */
export default function ListKeys( { keys } ) {
	return (
		<ul>
			{ keys.map( ( key ) => (
				<li key={ key.id }>
					{ key.name }

					{ /* todo add onclick handler that pops up a <Modal> to confirm. maybe pass in from parent? */ }
					<Button
						variant="link"
						data-id={ key.id }
						aria-label="Delete"
						onClick={ () =>
							confirm(
								'Modal H4 Remove Key? p Are you sure you want to remove the "" security key? Button Cancel Button Remove Key'
							)
						}
					>
						Delete
					</Button>
				</li>
			) ) }
		</ul>
	);
}
