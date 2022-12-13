/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
import './style.scss';

registerBlockType(
	metadata.name,
	{
		edit: Edit,
	}
);
// todo prevent block from being inserted in editor
// or maybe don't make it a block at all?
// really just using this to get the react tooling setup quickly. there might be a better way
