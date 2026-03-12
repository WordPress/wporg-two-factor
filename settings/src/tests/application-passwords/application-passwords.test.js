/* global jest, describe, beforeEach, afterEach, it, expect */

/**
 * External dependencies
 */
import { render, fireEvent, waitFor } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import { useContext } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Local dependencies
 */
import ApplicationPasswords from '../../components/application-passwords';

jest.mock( '@wordpress/element', () => ( {
	...jest.requireActual( '@wordpress/element' ),
	useContext: jest.fn(),
} ) );

jest.mock( '@wordpress/api-fetch' );

const mockAppPasswords = [
	{
		uuid: 'uuid-1',
		name: 'WordPress MCP',
		created: '2026-01-15T10:30:00+00:00',
		last_used: '2026-03-10T14:22:00+00:00',
		last_ip: '192.168.1.1',
	},
	{
		uuid: 'uuid-2',
		name: 'Jetpack',
		created: '2026-02-20T08:00:00+00:00',
		last_used: null,
		last_ip: null,
	},
];

const createMockContext = ( appPasswords = mockAppPasswords ) => ( {
	user: {
		userRecord: {
			record: { id: 1 },
			edit: jest.fn(),
			save: jest.fn().mockResolvedValue( true ),
		},
		applicationPasswords: appPasswords,
	},
	setGlobalNotice: jest.fn(),
} );

describe( 'ApplicationPasswords', () => {
	let mockContext;

	beforeEach( () => {
		mockContext = createMockContext();
		useContext.mockReturnValue( mockContext );
		apiFetch.mockResolvedValue( {} );
	} );

	afterEach( () => {
		jest.clearAllMocks();
	} );

	describe( 'Empty state', () => {
		it( 'should show empty message when no application passwords exist', () => {
			mockContext = createMockContext( [] );
			useContext.mockReturnValue( mockContext );

			const { getByText } = render( <ApplicationPasswords /> );

			expect( getByText( /don't have any application passwords/ ) ).toBeTruthy();
		} );

		it( 'should not render a table when no application passwords exist', () => {
			mockContext = createMockContext( [] );
			useContext.mockReturnValue( mockContext );

			const { queryByRole } = render( <ApplicationPasswords /> );

			expect( queryByRole( 'table' ) ).toBeNull();
		} );
	} );

	describe( 'Table display', () => {
		it( 'should render a table with application passwords', () => {
			const { getByRole } = render( <ApplicationPasswords /> );

			expect( getByRole( 'table' ) ).toBeTruthy();
		} );

		it( 'should display application password names', () => {
			const { getByText } = render( <ApplicationPasswords /> );

			expect( getByText( 'WordPress MCP' ) ).toBeTruthy();
			expect( getByText( 'Jetpack' ) ).toBeTruthy();
		} );

		it( 'should display "Never used" for passwords that have not been used', () => {
			const { getByText } = render( <ApplicationPasswords /> );

			expect( getByText( 'Never used' ) ).toBeTruthy();
		} );

		it( 'should render a revoke button for each password', () => {
			const { getAllByText } = render( <ApplicationPasswords /> );

			expect( getAllByText( 'Revoke' ) ).toHaveLength( 2 );
		} );

		it( 'should render the revoke all button', () => {
			const { getByText } = render( <ApplicationPasswords /> );

			expect( getByText( 'Revoke all application passwords' ) ).toBeTruthy();
		} );
	} );

	describe( 'Revoke single', () => {
		it( 'should show confirmation modal when clicking revoke', () => {
			const { getAllByText, getByText } = render( <ApplicationPasswords /> );

			fireEvent.click( getAllByText( 'Revoke' )[ 0 ] );

			expect( getByText( 'Revoke password' ) ).toBeTruthy();
			expect( getByText( /Are you sure you want to revoke/ ) ).toBeTruthy();
		} );

		it( 'should call the correct API endpoint when confirming revoke', async () => {
			const { getAllByText, getByText } = render( <ApplicationPasswords /> );

			fireEvent.click( getAllByText( 'Revoke' )[ 0 ] );
			fireEvent.click( getByText( 'Revoke password' ) );

			await waitFor( () => {
				expect( apiFetch ).toHaveBeenCalledWith( {
					path: '/wp/v2/users/1/application-passwords/uuid-1',
					method: 'DELETE',
				} );
			} );
		} );

		it( 'should show success notice after revoking', async () => {
			const { getAllByText, getByText } = render( <ApplicationPasswords /> );

			fireEvent.click( getAllByText( 'Revoke' )[ 0 ] );
			fireEvent.click( getByText( 'Revoke password' ) );

			await waitFor( () => {
				expect( mockContext.setGlobalNotice ).toHaveBeenCalledWith(
					'The application password "WordPress MCP" has been revoked.'
				);
			} );
		} );

		it( 'should close modal when clicking cancel', () => {
			const { getAllByText, getByText, queryByText } = render( <ApplicationPasswords /> );

			fireEvent.click( getAllByText( 'Revoke' )[ 0 ] );
			expect( getByText( 'Revoke password' ) ).toBeTruthy();

			fireEvent.click( getByText( 'Cancel' ) );
			expect( queryByText( 'Revoke password' ) ).toBeNull();
		} );
	} );

	describe( 'Revoke all', () => {
		it( 'should show confirmation modal when clicking revoke all', () => {
			const { getByText } = render( <ApplicationPasswords /> );

			fireEvent.click( getByText( 'Revoke all application passwords' ) );

			expect( getByText( /revoke all application passwords\?/i ) ).toBeTruthy();
			expect( getByText( 'Revoke all passwords' ) ).toBeTruthy();
		} );

		it( 'should call the correct API endpoint when confirming revoke all', async () => {
			const { getByText } = render( <ApplicationPasswords /> );

			fireEvent.click( getByText( 'Revoke all application passwords' ) );
			fireEvent.click( getByText( 'Revoke all passwords' ) );

			await waitFor( () => {
				expect( apiFetch ).toHaveBeenCalledWith( {
					path: '/wp/v2/users/1/application-passwords',
					method: 'DELETE',
				} );
			} );
		} );

		it( 'should show success notice after revoking all', async () => {
			const { getByText } = render( <ApplicationPasswords /> );

			fireEvent.click( getByText( 'Revoke all application passwords' ) );
			fireEvent.click( getByText( 'Revoke all passwords' ) );

			await waitFor( () => {
				expect( mockContext.setGlobalNotice ).toHaveBeenCalledWith(
					'All application passwords have been revoked.'
				);
			} );
		} );
	} );

	describe( 'Error handling', () => {
		it( 'should display error in modal when revoke fails', async () => {
			apiFetch.mockRejectedValue( { message: 'Something went wrong' } );

			const { getAllByText, getByText, queryAllByText } = render( <ApplicationPasswords /> );

			fireEvent.click( getAllByText( 'Revoke' )[ 0 ] );
			fireEvent.click( getByText( 'Revoke password' ) );

			await waitFor( () => {
				expect( queryAllByText( 'Something went wrong' ).length ).toBeGreaterThanOrEqual(
					1
				);
			} );
		} );
	} );
} );
