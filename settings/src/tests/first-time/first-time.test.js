/**
 * External dependencies
 */
import { render } from '@testing-library/react';

/**
 * Local dependencies
 */
import FirstTime from '../../components/first-time/first-time';
import { mockGlobalContext } from '../mock-global-context';

vi.mock( '@wordpress/element', async () => {
	const actual = await vi.importActual( '@wordpress/element' );

	return { ...actual, useContext: vi.fn( actual.useContext ) };
} );

vi.mock( '../../script', () => ( { GlobalContext: {} } ) );
vi.mock( '../../components/totp', () => ( { default: () => null } ) );
vi.mock( '../../components/webauthn/webauthn', () => ( { default: () => null } ) );
vi.mock( '../../components/backup-codes', () => ( { default: () => null } ) );
vi.mock( '../../components/first-time/home', () => ( { default: () => null } ) );
vi.mock( '../../components/first-time/congratulations', () => ( { default: () => null } ) );

const renderScreen = ( screen, hasPrimaryProvider, error = '' ) => {
	mockGlobalContext( {
		navigateToScreen: vi.fn(),
		screen,
		user: { hasPrimaryProvider },
		error,
	} );

	return render( <FirstTime /> );
};

describe( 'FirstTime', () => {
	afterEach( () => {
		vi.clearAllMocks();
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
