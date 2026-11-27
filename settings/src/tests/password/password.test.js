/**
 * External dependencies
 */
import { render, fireEvent } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';

/**
 * Local dependencies
 */
import { mockGlobalContext } from '../mock-global-context';
import { GlobalContext } from '../../script';
import Password from '../../components/password';
import { mockPasswordEstimator } from './mocks';

// Mock the context
vi.mock( '@wordpress/element', async () => {
	const actual = await vi.importActual( '@wordpress/element' );

	return { ...actual, useContext: vi.fn( actual.useContext ) };
} );

// Mock the return value of any api calls
vi.mock( '@wordpress/api-fetch' );

// We set this after making a request.
apiFetch.nonceMiddleware = { nonce: '' };

// Default mock context
const mockContext = {
	user: {
		userRecord: {
			editedRecord: {
				password: 'password',
			},
			edit: vi.fn(),
			save: vi.fn(),
			hasEdits: false,
			record: {
				'2fa_required': true,
			},
		},
		isSaving: false,
	},
	setGlobalNotice: vi.fn(),
};

describe( 'Password', () => {
	beforeAll( () => {
		apiFetch.mockReturnValue(
			Promise.resolve( {
				text: vi.fn(),
			} )
		);
	} );

	afterEach( () => {
		mockContext.user.userRecord.edit.mockReset();
		mockContext.user.userRecord.save.mockReset();
		mockContext.setGlobalNotice.mockReset();
	} );

	describe( 'Messaging', () => {
		const weakPasswordRegex = /That password is too easy to compromise/i;
		const strongPasswordRegex = /Your password is strong enough to be saved./i;

		it( 'should not display any notice on load', () => {
			mockGlobalContext( mockContext );

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

		it( 'should display the weak password notice after submitting', () => {
			// State: the user has updated their password to something weak
			// although the strength is not tested here.
			mockContext.user.userRecord.editedRecord.password = 'weak';
			mockContext.user.userRecord.hasEdits = true;

			mockGlobalContext( mockContext );

			// We'll mock the password estimator to return a score of 1.
			mockPasswordEstimator( 1 );

			const { queryAllByText, getAllByRole } = render( <Password />, {
				wrapper: ( { children } ) => (
					<GlobalContext.Provider value={ mockContext }>
						{ children }
					</GlobalContext.Provider>
				),
			} );

			// Find the submit button and click it.
			const buttons = getAllByRole( 'button' );
			const saveButton = buttons.filter( ( button ) => button.type === 'submit' )[ 0 ];
			fireEvent.click( saveButton );

			// We may have this message multiple times, because of 'speak'.
			expect( queryAllByText( weakPasswordRegex ).length ).toBeGreaterThanOrEqual( 1 );
		} );

		it( 'should display the strong password notice', () => {
			// State: the user has updated their password to something strong
			// although the strength is not tested here.
			mockContext.user.userRecord.editedRecord.password = '@#4asdf34asdfasdf';
			mockContext.user.userRecord.hasEdits = true;

			mockGlobalContext( mockContext );

			// We'll mock the password estimator to return a score of 4.
			mockPasswordEstimator( 4 );

			const { queryAllByText } = render( <Password />, {
				wrapper: ( { children } ) => (
					<GlobalContext.Provider value={ mockContext }>
						{ children }
					</GlobalContext.Provider>
				),
			} );

			// We may have this message multiple times, because of 'speak'.
			expect( queryAllByText( strongPasswordRegex ).length ).toBeGreaterThanOrEqual( 1 );
		} );
	} );

	it( 'should update the user record password', () => {
		mockGlobalContext( mockContext );

		const { getByLabelText } = render( <Password />, {
			wrapper: ( { children } ) => (
				<GlobalContext.Provider value={ mockContext }>{ children }</GlobalContext.Provider>
			),
		} );

		const input = getByLabelText( 'New Password' );
		const newPassword = 'this is a password';
		fireEvent.change( input, { target: { value: newPassword } } );
		expect( mockContext.user.userRecord.edit ).toHaveBeenCalledWith( {
			password: newPassword,
		} );
	} );

	it( 'should submit form on button press', () => {
		// State: the user has updated their password to something strong
		// although the strength is not tested here.
		mockContext.user.userRecord.editedRecord.password = '@#4asdf34asdfasdf';
		mockContext.user.userRecord.hasEdits = true;

		mockGlobalContext( mockContext );

		// We'll mock the password estimator to return a score of 4.
		mockPasswordEstimator( 4 );

		const { getAllByRole } = render( <Password />, {
			wrapper: ( { children } ) => (
				<GlobalContext.Provider value={ mockContext }>{ children }</GlobalContext.Provider>
			),
		} );

		const buttons = getAllByRole( 'button' );
		const saveButton = buttons.filter( ( button ) => button.type === 'submit' )[ 0 ];
		fireEvent.click( saveButton );

		expect( mockContext.user.userRecord.save ).toHaveBeenCalled();
	} );

	it( 'should submit form on enter', () => {
		mockGlobalContext( mockContext );

		const { getByLabelText } = render( <Password />, {
			wrapper: ( { children } ) => (
				<GlobalContext.Provider value={ mockContext }>{ children }</GlobalContext.Provider>
			),
		} );

		const input = getByLabelText( 'New Password' );
		fireEvent.submit( input );

		expect( mockContext.user.userRecord.save ).toHaveBeenCalled();
	} );
} );
