/* global jest, it, describe, beforeEach, expect */

/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import { useEntityRecord } from '@wordpress/core-data';
import { renderHook } from '@testing-library/react';

/**
 * Local dependencies
 */
import { useUser } from '../../hooks/useUser';

jest.mock( '@wordpress/data' );
jest.mock( '@wordpress/core-data' );

describe( 'useUser', () => {
	beforeEach( () => {
		useSelect.mockClear();
		useEntityRecord.mockClear();
	} );

	it( 'should call useEntityRecord with correct arguments', () => {
		useEntityRecord.mockReturnValue( { record: {} } );

		renderHook( () => useUser( 1 ) );

		expect( useEntityRecord ).toHaveBeenCalledWith( 'root', 'user', 1 );
	} );

	it( 'should set isSaving in user', () => {
		useEntityRecord.mockReturnValue( { record: {} } );
		useSelect.mockReturnValue( true );

		const {
			result: { current: user },
		} = renderHook( () => useUser( 1 ) );

		expect( useSelect ).toHaveBeenCalled();
		expect( user.isSaving ).toBeTruthy();
	} );

	it( 'should not overwrite password in user.userRecord.record if already defined', () => {
		useEntityRecord.mockReturnValue( {
			record: { password: 'test-password' },
		} );

		const {
			result: { current: user },
		} = renderHook( () => useUser( 1 ) );

		expect( user.userRecord.record.password ).toBe( 'test-password' );
	} );

	it( 'should set hasPrimaryProvider to false if user.userRecord.record is undefined', () => {
		useEntityRecord.mockReturnValue( {} );

		const {
			result: { current: user },
		} = renderHook( () => useUser( 1 ) );

		expect( user.hasPrimaryProvider ).toBe( false );
	} );

	it( 'should set hasPrimaryProvider to false if 2fa_available_providers is undefined', () => {
		useEntityRecord.mockReturnValue( { record: {} } );

		const {
			result: { current: user },
		} = renderHook( () => useUser( 1 ) );

		expect( user.hasPrimaryProvider ).toBe( false );
	} );

	it( 'should set hasPrimaryProvider to false if 2fa_available_providers is empty', () => {
		useEntityRecord.mockReturnValue( { record: { '2fa_available_providers': [] } } );

		const {
			result: { current: user },
		} = renderHook( () => useUser( 1 ) );

		expect( user.hasPrimaryProvider ).toBe( false );
	} );

	it( 'should set hasPrimaryProvider to false if 2fa_available_providers only has Two_Factor_Backup_Codes', () => {
		useEntityRecord.mockReturnValue( {
			record: { '2fa_available_providers': [ 'Two_Factor_Backup_Codes' ] },
		} );

		const {
			result: { current: user },
		} = renderHook( () => useUser( 1 ) );

		expect( user.hasPrimaryProvider ).toBe( false );
	} );

	it( 'should set hasPrimaryProvider to true if 2fa_available_providers has Two_Factor_Totp', () => {
		useEntityRecord.mockReturnValue( {
			record: { '2fa_available_providers': [ 'Two_Factor_Totp', 'Two_Factor_Backup_Codes' ] },
		} );

		const {
			result: { current: user },
		} = renderHook( () => useUser( 1 ) );

		expect( user.hasPrimaryProvider ).toBe( true );
	} );

	it( 'should set hasPrimaryProvider to true if 2fa_available_providers has TwoFactor_Provider_WebAuthn', () => {
		useEntityRecord.mockReturnValue( {
			record: {
				'2fa_available_providers': [
					'TwoFactor_Provider_WebAuthn',
					'Two_Factor_Backup_Codes',
				],
			},
		} );

		const {
			result: { current: user },
		} = renderHook( () => useUser( 1 ) );

		expect( user.hasPrimaryProvider ).toBe( true );
	} );
} );
