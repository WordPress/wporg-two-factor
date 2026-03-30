/* global jest, describe, beforeEach, afterEach, it, expect */

/**
 * External dependencies
 */
import { render, act, waitFor } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import { useContext } from '@wordpress/element';

/**
 * Local dependencies
 */
import RevalidateModal from '../../components/revalidate-modal';
import { refreshRecord } from '../../utilities/common';

jest.mock( '@wordpress/element', () => ( {
	...jest.requireActual( '@wordpress/element' ),
	useContext: jest.fn(),
} ) );

jest.mock( '@wordpress/compose', () => ( {
	...jest.requireActual( '@wordpress/compose' ),
	useMergeRefs: ( refs ) => refs[ 0 ],
	useFocusableIframe: () => null,
} ) );

jest.mock( '../../utilities/common', () => ( {
	refreshRecord: jest.fn(),
} ) );

const createMockContext = () => ( {
	navigateToScreen: jest.fn(),
	user: {
		userRecord: {
			record: {
				'2fa_revalidation': {
					expires_at: new Date().getTime() / 1000 + 3600,
					revalidate_url: 'http://example.com/revalidate',
				},
			},
			edit: jest.fn(),
			save: jest.fn(),
		},
	},
} );

describe( 'RevalidateModal', () => {
	let mockContext;

	beforeEach( () => {
		mockContext = createMockContext();
		useContext.mockReturnValue( mockContext );
		refreshRecord.mockResolvedValue( undefined );
	} );

	afterEach( () => {
		jest.clearAllMocks();
	} );

	it( 'should render the modal with the revalidation description', () => {
		const { getByText } = render( <RevalidateModal /> );

		expect( getByText( /revalidate your session/i ) ).toBeTruthy();
	} );

	it( 'should not show an error notice initially', () => {
		const { queryByRole } = render( <RevalidateModal /> );

		expect( queryByRole( 'alert' ) ).toBeNull();
	} );

	it( 'should show an error notice when refreshRecord fails after revalidation', async () => {
		refreshRecord.mockRejectedValue( new Error( 'Network error' ) );

		render( <RevalidateModal /> );

		await act( async () => {
			window.dispatchEvent(
				new MessageEvent( 'message', {
					data: { type: 'reValidationComplete' },
				} )
			);
		} );

		await waitFor( () => {
			expect( document.querySelector( '.wporg-2fa__revalidate-modal-error' ) ).toBeTruthy();
		} );
	} );

	it( 'should show the correct error message text when refreshRecord fails', async () => {
		refreshRecord.mockRejectedValue( new Error( 'Network error' ) );

		render( <RevalidateModal /> );

		await act( async () => {
			window.dispatchEvent(
				new MessageEvent( 'message', {
					data: { type: 'reValidationComplete' },
				} )
			);
		} );

		await waitFor( () => {
			const noticeEl = document.querySelector( '.wporg-2fa__revalidate-modal-error' );
			expect( noticeEl ).toBeTruthy();
			expect( noticeEl.textContent ).toMatch( /error revalidating your session/i );
		} );
	} );

	it( 'should not show an error notice when refreshRecord succeeds', async () => {
		refreshRecord.mockResolvedValue( undefined );

		render( <RevalidateModal /> );

		await act( async () => {
			window.dispatchEvent(
				new MessageEvent( 'message', {
					data: { type: 'reValidationComplete' },
				} )
			);
		} );

		await waitFor( () => {
			expect( document.querySelector( '.wporg-2fa__revalidate-modal-error' ) ).toBeNull();
		} );
	} );

	it( 'should not trigger a refresh for unrelated message types', async () => {
		render( <RevalidateModal /> );

		await act( async () => {
			window.dispatchEvent(
				new MessageEvent( 'message', {
					data: { type: 'someOtherEvent' },
				} )
			);
		} );

		expect( refreshRecord ).not.toHaveBeenCalled();
	} );
} );
