/**
 * WordPress dependencies
 */
import { useContext } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';

const actualUseContext = useContext.getMockImplementation();

/**
 * Make the mocked `useContext` return a value for the app's context only.
 *
 * WordPress packages read their own contexts through the same `useContext`, so those keep the real value.
 * Requires `@wordpress/element` to be mocked with `useContext: vi.fn( actual.useContext )`.
 *
 * @param value The value components should get from `GlobalContext`.
 */
export function mockGlobalContext( value ) {
	useContext.mockImplementation( ( context ) =>
		context === GlobalContext ? value : actualUseContext( context )
	);
}
