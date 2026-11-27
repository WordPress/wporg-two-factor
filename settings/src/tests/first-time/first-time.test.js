/* global jest, describe, afterEach, it, expect */

/**
 * External dependencies
 */
import { render } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import { useContext } from '@wordpress/element';

/**
 * Local dependencies
 */
import FirstTime from '../../components/first-time/first-time';

jest.mock( '@wordpress/element', () => ( {
	...jest.requireActual( '@wordpress/element' ),
	useContext: jest.fn(),
} ) );

jest.mock( '../../script', () => ( { GlobalContext: {} } ) );
jest.mock( '../../components/totp', () => () => null );
jest.mock( '../../components/webauthn/webauthn', () => () => null );
jest.mock( '../../components/backup-codes', () => () => null );
jest.mock( '../../components/first-time/home', () => () => null );
jest.mock( '../../components/first-time/congratulations', () => () => null );

const renderScreen = ( screen, hasPrimaryProvider, error = '' ) => {
	useContext.mockReturnValue( {
		navigateToScreen: jest.fn(),
		screen,
		user: { hasPrimaryProvider },
		error,
	} );

	return render( <FirstTime /> );
};

describe( 'FirstTime', () => {
	afterEach( () => {
		jest.clearAllMocks();
	} );

	it( 'should not offer Back on backup codes once a primary method is set up', () => {
		const { queryByText } = renderScreen( 'backup-codes', true );

		expect( queryByText( 'Back' ) ).toBeNull();
	} );

	it( 'should offer Back on backup codes if generating the codes failed', () => {
		const { queryByText } = renderScreen( 'backup-codes', true, { message: 'Error' } );

		expect( queryByText( 'Back' ) ).not.toBeNull();
	} );

	it( 'should offer Back on backup codes before a primary method is set up', () => {
		const { queryByText } = renderScreen( 'backup-codes', false );

		expect( queryByText( 'Back' ) ).not.toBeNull();
	} );

	it( 'should offer Back on the configure step', () => {
		const { queryByText } = renderScreen( 'webauthn', true );

		expect( queryByText( 'Back' ) ).not.toBeNull();
	} );
} );
