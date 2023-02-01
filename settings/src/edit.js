/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import { Placeholder } from '@wordpress/components';

/**
 * Render in editor
 */
export default function Edit() {
	return (
		<div { ...useBlockProps() } >
			<Placeholder
				instructions={ __( 'Not rendered in editor.', 'wporg' ) }
				label={ __( 'Two-Factor Authentication', 'wporg' ) }
			> </Placeholder>
		</div>
	);
}
