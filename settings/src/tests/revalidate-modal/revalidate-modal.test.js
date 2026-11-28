/* global jest, describe, beforeEach, afterEach, it, expect */

/**
 * External dependencies
 */
import { render, act } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import { useContext } from '@wordpress/element';

/**
 * Local dependencies
 */
import RevalidateModal from '../../components/revalidate-modal';

jest.mock( '@wordpress/element', () => ( {
	...jest.requireActual( '@wordpress/element' ),
	useContext: jest.fn(),
} ) );

jest.mock( '../../script', () => ( {
	GlobalContext: {},
} ) );

const createMockContext = ( save ) => ( {
	navigateToScreen: jest.fn(),
	user: {
		userRecord: {
			record: {
				id: 1,
				'2fa_revalidation': {
					expires_at: 0,
					revalidate_url: 'about:blank',
				},
			},
			edit: jest.fn(),
			save,
		},
	},
} );

const sendRevalidationComplete = async () => {
	await act( async () => {
		window.dispatchEvent(
			new MessageEvent( 'message', { data: { type: 'reValidationComplete' } } )
		);
	} );
};

// The modal renders in a portal, and the notice's screen reader announcement outlives each test.
const getErrorNotice = () => document.querySelector( '.components-notice.is-error' );

describe( 'RevalidateModal', () => {
	afterEach( () => {
		jest.clearAllMocks();
	} );

	describe( 'when refreshing the user record fails', () => {
		beforeEach( () => {
			useContext.mockReturnValue(
				createMockContext( jest.fn().mockRejectedValue( new Error( 'Network error' ) ) )
			);
		} );

		it( 'should show an error notice', async () => {
			render( <RevalidateModal /> );

			await sendRevalidationComplete();

			expect( getErrorNotice()?.textContent ).toMatch( /could not be refreshed/ );
		} );
	} );

	describe( 'when refreshing the user record succeeds', () => {
		beforeEach( () => {
			useContext.mockReturnValue( createMockContext( jest.fn().mockResolvedValue( true ) ) );
		} );

		it( 'should not show an error notice', async () => {
			render( <RevalidateModal /> );

			await sendRevalidationComplete();

			expect( getErrorNotice() ).toBeNull();
		} );
	} );
} );
