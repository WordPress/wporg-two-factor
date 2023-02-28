/**
 * External dependencies
 */
import { render, fireEvent } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import { useContext } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Local dependencies
 */
import { GlobalContext } from '../../../script';
import Password from '../../password';
import { mockPasswordEstimator } from './mocks';

// Mock the context
jest.mock( '@wordpress/element', () => ( {
	...jest.requireActual( '@wordpress/element' ),
	useContext: jest.fn(),
} ) );

// Mock the return value of any api calls
jest.mock( '@wordpress/api-fetch' );
apiFetch.mockReturnValueOnce(
	Promise.resolve( {
		text: jest.fn(),
	} )
);

// We set this after making a request.
apiFetch.nonceMiddleware = { nonce: '' };

// Default mock context
const mockContext = {
	userRecord: {
		editedRecord: {
			password: 'password',
		},
		edit: jest.fn(),
		save: jest.fn(),
		hasEdits: false,
		record: {
			'2fa_required': true,
		},
		isSaving: false,
	},
	setGlobalNotice: jest.fn(),
};

describe( 'Password', () => {
	afterEach( () => {
		mockContext.userRecord.edit.mockReset();
		mockContext.userRecord.save.mockReset();
		mockContext.setGlobalNotice.mockReset();
	} );

	describe( 'Messaging', () => {
		const weakPasswordRegex = /That password is too easy to compromise/i;
		const strongPasswordRegex =
			/Your password is strong enough to be saved./i;

		it( 'should not display any notice on load', () => {
			useContext.mockReturnValue( mockContext );

			const { queryAllByText } = render( <Password />, {
				wrapper: ( { children } ) => (
					<GlobalContext.Provider value={ mockContext }>
						{ children }
					</GlobalContext.Provider>
				),
			} );

			expect( queryAllByText( weakPasswordRegex ) ).toHaveLength( 0 );
			expect( queryAllByText( strongPasswordRegex ) ).toHaveLength( 0 );
		} );

		it( 'should display the weak password notice', () => {
			// State: the user has updated their password to something weak
			// although the strength is not tested here.
			mockContext.userRecord.editedRecord.password = 'weak';
			mockContext.userRecord.hasEdits = true;

			useContext.mockReturnValue( mockContext );

			// We'll mock the password estimator to return a score of 1.
			mockPasswordEstimator( 1 );

			const { queryAllByText } = render( <Password />, {
				wrapper: ( { children } ) => (
					<GlobalContext.Provider value={ mockContext }>
						{ children }
					</GlobalContext.Provider>
				),
			} );

			// We may have this message multiple times, because of 'speak'.
			expect(
				queryAllByText( weakPasswordRegex ).length
			).toBeGreaterThanOrEqual( 1 );
		} );

		it( 'should display the strong password notice', () => {
			// State: the user has updated their password to something strong
			// although the strength is not tested here.
			mockContext.userRecord.editedRecord.password = '@#4asdf34asdfasdf';
			mockContext.userRecord.hasEdits = true;

			useContext.mockReturnValue( mockContext );

			// We'll mock the password estimator to return a score of 10.
			mockPasswordEstimator( 10 );

			const { queryAllByText } = render( <Password />, {
				wrapper: ( { children } ) => (
					<GlobalContext.Provider value={ mockContext }>
						{ children }
					</GlobalContext.Provider>
				),
			} );

			// We may have this message multiple times, because of 'speak'.
			expect(
				queryAllByText( strongPasswordRegex ).length
			).toBeGreaterThanOrEqual( 1 );
		} );
	} );

	it( 'should update the user record password', () => {
		useContext.mockReturnValue( mockContext );

		const { getByLabelText } = render( <Password />, {
			wrapper: ( { children } ) => (
				<GlobalContext.Provider value={ mockContext }>
					{ children }
				</GlobalContext.Provider>
			),
		} );

		const input = getByLabelText( 'New Password' );
		const newPassword = 'this is a password';
		fireEvent.change( input, { target: { value: newPassword } } );
		expect( mockContext.userRecord.edit ).toHaveBeenCalledWith( {
			password: newPassword,
		} );
	} );

	it( 'should submit form on button press', () => {
		// State: the user has updated their password to something strong
		// although the strength is not tested here.
		mockContext.userRecord.editedRecord.password = '@#4asdf34asdfasdf';
		mockContext.userRecord.hasEdits = true;

		useContext.mockReturnValue( mockContext );

		// We'll mock the password estimator to return a score of 4.
		mockPasswordEstimator( 4 );

		const { getAllByRole } = render( <Password />, {
			wrapper: ( { children } ) => (
				<GlobalContext.Provider value={ mockContext }>
					{ children }
				</GlobalContext.Provider>
			),
		} );

		const buttons = getAllByRole( 'button' );
		const saveButton = buttons.filter(
			( button ) => button.type === 'submit'
		)[ 0 ];
		fireEvent.click( saveButton );

		expect( mockContext.userRecord.save ).toBeCalled();
	} );
} );
