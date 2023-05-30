/**
 * WordPress dependencies
 */
import { Notice } from '@wordpress/components';
import { Icon, cancelCircleFilled } from '@wordpress/icons';
import { createRoot } from '@wordpress/element';

/**
 * Internal dependencies
 *
 * @param options
 * @param next
 */
import RevalidateModal from '../components/revalidate-modal';

export default async function ( options, next ) {
	try {
		return await next( options );
	} catch ( error ) {
		if ( 'revalidation_required' !== error.code ) {
			throw error;
		}

		const wrapper = document.querySelector( '.wp-block-wporg-two-factor-settings' );
		if ( ! wrapper ) {
			return;
		}

		const root = createRoot( wrapper );
		root.render(
			<>
				<RevalidateModal />
				<Notice status="error" isDismissible={ false }>
					<Icon icon={ cancelCircleFilled } />
					{ error.message }
				</Notice>
			</>
		);
	}
}
