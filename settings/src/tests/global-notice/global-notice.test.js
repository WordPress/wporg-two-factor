/* global describe, it, expect */

/**
 * External dependencies
 */
import { render } from '@testing-library/react';

/**
 * Local dependencies
 */
import GlobalNotice from '../../components/global-notice';

describe( 'GlobalNotice', () => {
	it( 'should show a success notice for a string', () => {
		const { container } = render( <GlobalNotice notice="Saved." setNotice={ () => {} } /> );

		expect( container.querySelector( '.wporg-2fa__global-notice' ).textContent ).toContain(
			'Saved.'
		);
		expect( container.querySelector( '.is-error' ) ).toBeNull();
	} );

	it( 'should show an error notice for an error object', () => {
		const { container } = render(
			<GlobalNotice notice={ { message: 'Failed.', isError: true } } setNotice={ () => {} } />
		);

		expect(
			container.querySelector( '.wporg-2fa__global-notice.is-error' )?.textContent
		).toContain( 'Failed.' );
	} );
} );
