/**
 * External dependencies
 */
import { render } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import { Icon, close, info } from '@wordpress/icons';

/**
 * Local dependencies
 */
import { mockGlobalContext } from '../mock-global-context';
import AccountStatus from '../../components/account-status';

vi.mock( '@wordpress/element', async () => {
	const actual = await vi.importActual( '@wordpress/element' );

	return { ...actual, useContext: vi.fn( actual.useContext ) };
} );

vi.mock( '../../script', () => ( { GlobalContext: {} } ) );
vi.mock( '../../components/screen-link', () => ( { default: ( { anchorText } ) => anchorText } ) );

const renderStatus = ( user ) => {
	mockGlobalContext( {
		user: {
			userRecord: { record: { email: 'user@example.org' } },
			hasPrimaryProvider: false,
			primaryProvider: null,
			totpEnabled: false,
			backupCodesEnabled: false,
			webAuthnEnabled: false,
			applicationPasswords: [],
			...user,
		},
	} );

	return render( <AccountStatus /> );
};

const iconPath = ( icon ) =>
	render( <Icon icon={ icon } /> )
		.container.querySelector( 'path' )
		.getAttribute( 'd' );

const statusIcon = ( container, screen ) =>
	container.querySelector( `.wporg-2fa__status-card-${ screen } .wporg-2fa__status-icon` );

describe( 'AccountStatus', () => {
	afterEach( () => {
		vi.clearAllMocks();
	} );

	it( 'should show an info icon, not an error icon, for an optional method that is not set up', () => {
		const { container } = renderStatus( {
			hasPrimaryProvider: true,
			primaryProvider: 'Two_Factor_Totp',
			totpEnabled: true,
			backupCodesEnabled: true,
		} );
		const icon = statusIcon( container, 'webauthn' );

		expect( icon.classList.contains( 'is-info' ) ).toBe( true );
		expect( icon.querySelector( 'path' ).getAttribute( 'd' ) ).toBe( iconPath( info ) );
	} );

	it( 'should keep the error icon for two-factor methods when none is set up', () => {
		const { container } = renderStatus();
		const icon = statusIcon( container, 'webauthn' );

		expect( icon.classList.contains( 'is-disabled' ) ).toBe( true );
		expect( icon.querySelector( 'path' ).getAttribute( 'd' ) ).toBe( iconPath( close ) );
	} );
} );
