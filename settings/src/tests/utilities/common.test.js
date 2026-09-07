/* global jest, it, describe, beforeEach, expect, afterEach */

/**
 * Local dependencies
 */
import { refreshRecord, getWordPressOrgUrl, getScreenFromUrl } from '../../utilities/common';

describe( 'refreshRecord', () => {
	let mockRecord;

	beforeEach( () => {
		mockRecord = {
			edit: jest.fn(),
			save: jest.fn(),
		};
	} );

	afterEach( () => {
		mockRecord.edit.mockReset();
		mockRecord.save.mockReset();
	} );

	it( 'should call edit and save methods on the record object', async () => {
		await refreshRecord( mockRecord );

		expect( mockRecord.edit ).toHaveBeenCalledWith( {
			refreshRecordFakeKey: '',
		} );
		expect( mockRecord.save ).toHaveBeenCalled();
	} );
} );

describe( 'getWordPressOrgUrl', () => {
	it.each( [
		[ 'https://wordpress.org/a/edit/b', 'https://wordpress.org/a/edit/b' ],
		[ 'https://profiles.wordpress.org/tester/', 'https://profiles.wordpress.org/tester/' ],
		[ 'https://www.wordpress.org/a', 'https://www.wordpress.org/a' ],
		[ 'https://WORDPRESS.ORG/a', 'https://wordpress.org/a' ],
		[ 'https://wordpress.org', 'https://wordpress.org/' ],
		[ 'https://wordpress.org/a/', 'https://wordpress.org/a/' ],
		[ 'https://user@wordpress.org/a', 'https://user@wordpress.org/a' ],
	] )( 'returns the normalised URL for %p', ( url, expected ) => {
		expect( getWordPressOrgUrl( url ) ).toBe( expected );
	} );

	it.each( [
		[ null ],
		[ undefined ],
		[ '' ],
		[ '0' ],
		[ 'not a url' ],
		[ 'http://wordpress.org/a' ],
		[ '//wordpress.org/a' ],
		[ '/a/edit/b' ],
		[ 'https://notwordpress.org/a' ],
		[ 'https://wordpress.org.example.test/a' ],
		[ 'https://example.test/wordpress.org/a' ],
		[ 'javascript:alert(1)' ],
		[ 'javascript://wordpress.org/%0aalert(1)' ],
		[ 'data://wordpress.org/x' ],
		[ 'ftp://wordpress.org/x' ],
	] )( 'returns null for %p', ( url ) => {
		expect( getWordPressOrgUrl( url ) ).toBeNull();
	} );
} );

describe( 'getScreenFromUrl', () => {
	const url = ( search ) =>
		new URL( 'https://profiles.wordpress.org/tester/profile/security/' + search );

	it.each( [
		[ '', false, 'home' ],
		[ '?screen=home', false, 'home' ],
		[ '?screen=totp', false, 'totp' ],
		[ '?screen=application-passwords', false, 'application-passwords' ],
		[ '?screen=congratulations', false, 'home' ],
		[ '?screen=congratulations', true, 'congratulations' ],
		[ '?screen=svn-password', true, 'home' ],
		[ '?screen=nope', false, 'home' ],
		[ '?screen=nope', true, 'home' ],
		[ '?screen=', true, 'home' ],
		[ '?screen=TOTP', true, 'home' ],
	] )( 'resolves %p (onboarding: %p) to %p', ( search, isOnboarding, expected ) => {
		expect( getScreenFromUrl( url( search ), isOnboarding ) ).toBe( expected );
	} );
} );
