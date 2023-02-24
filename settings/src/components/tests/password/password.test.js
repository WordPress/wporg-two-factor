/**
 * External dependencies
 */
import { render, fireEvent, screen } from '@testing-library/react';

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
	},
	setGlobalNotice: jest.fn(),
};

describe( 'Password', () => {
	it( 'should display the weak password notice', () => {
		// State: he user has updated their password to something weak
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
			queryAllByText( /That password is too easy to compromise/i ).length
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
			queryAllByText( /Your password is strong enough to be saved./i )
				.length
		).toBeGreaterThanOrEqual( 1 );
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
		const password = 'this is a password';
		fireEvent.change( input, { target: { value: password } } );
		expect( mockContext.userRecord.edit ).toHaveBeenCalledWith( {
			password: password,
		} );
	} );
} );
