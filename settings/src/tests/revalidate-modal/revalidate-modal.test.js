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
	setGlobalNotice: jest.fn(),
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

describe( 'RevalidateModal', () => {
	afterEach( () => {
		jest.clearAllMocks();
	} );

	describe( 'when refreshing the user record fails', () => {
		let context;

		beforeEach( () => {
			jest.spyOn( console, 'error' ).mockImplementation( () => {} );
			context = createMockContext(
				jest.fn().mockRejectedValue( new Error( 'Network error' ) )
			);
			useContext.mockReturnValue( context );
		} );

		it( 'should show the error in the global notice after the modal closes', async () => {
			const { unmount } = render( <RevalidateModal /> );

			// In the app, the edit marks the session as valid, which unmounts the modal before the save fails.
			context.user.userRecord.edit.mockImplementation( unmount );

			await sendRevalidationComplete();

			expect( context.setGlobalNotice ).toHaveBeenCalledWith( {
				message: expect.stringMatching( /could not be refreshed/ ),
				isError: true,
			} );
		} );

		it( 'should show the error in the modal when it stays open', async () => {
			render( <RevalidateModal /> );

			await sendRevalidationComplete();

			// The modal renders in a portal, so query the whole document.
			expect( document.querySelector( '.components-notice.is-error' )?.textContent ).toMatch(
				/could not be refreshed/
			);
		} );
	} );

	describe( 'when refreshing the user record succeeds', () => {
		let context;

		beforeEach( () => {
			context = createMockContext( jest.fn().mockResolvedValue( true ) );
			useContext.mockReturnValue( context );
		} );

		it( 'should not show an error notice', async () => {
			render( <RevalidateModal /> );

			await sendRevalidationComplete();

			expect( context.setGlobalNotice ).not.toHaveBeenCalled();
		} );
	} );
} );
