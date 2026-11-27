/* global jest, describe, afterEach, it, expect */

/**
 * External dependencies
 */
import { render } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import { useContext } from '@wordpress/element';
import { Icon, cancelCircleFilled, info } from '@wordpress/icons';

/**
 * Local dependencies
 */
import AccountStatus from '../../components/account-status';

jest.mock( '@wordpress/element', () => ( {
	...jest.requireActual( '@wordpress/element' ),
	useContext: jest.fn(),
} ) );

jest.mock( '../../script', () => ( { GlobalContext: {} } ) );
jest.mock(
	'../../components/screen-link',
	() =>
		( { anchorText } ) =>
			anchorText
);

const renderStatus = ( user ) => {
	useContext.mockReturnValue( {
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
		jest.clearAllMocks();
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
		expect( icon.querySelector( 'path' ).getAttribute( 'd' ) ).toBe(
			iconPath( cancelCircleFilled )
		);
	} );
} );
