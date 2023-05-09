/* global jest, it, describe, beforeEach, expect, afterEach */

/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import { useEntityRecord } from '@wordpress/core-data';

/**
 * Local dependencies
 */
import { useGetUserRecord, refreshRecord } from '../../utilities';

jest.mock( '@wordpress/data' );
jest.mock( '@wordpress/core-data' );

describe( 'useGetUserRecord', () => {
	beforeEach( () => {
		useSelect.mockClear();
		useEntityRecord.mockClear();
	} );

	it( 'should call useEntityRecord with correct arguments', () => {
		useEntityRecord.mockReturnValue( { record: {} } );

		useGetUserRecord( 1 );

		expect( useEntityRecord ).toHaveBeenCalledWith( 'root', 'user', 1 );
	} );

	it( 'should set isSaving in userRecord', () => {
		useEntityRecord.mockReturnValue( { record: {} } );
		useSelect.mockReturnValue( true );

		const result = useGetUserRecord( 1 );

		expect( useSelect ).toHaveBeenCalled();
		expect( result.isSaving ).toBeTruthy();
	} );

	it( 'should initialize password in userRecord.record if not defined', () => {
		useEntityRecord.mockReturnValue( { record: {} } );

		const result = useGetUserRecord( 1 );

		expect( result.record.password ).toBe( '' );
	} );

	it( 'should not overwrite password in userRecord.record if already defined', () => {
		useEntityRecord.mockReturnValue( {
			record: { password: 'test-password' },
		} );

		const result = useGetUserRecord( 1 );

		expect( result.record.password ).toBe( 'test-password' );
	} );
} );

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

	it( 'should call edit and save methods on the record object', () => {
		refreshRecord( mockRecord );

		expect( mockRecord.edit ).toHaveBeenCalledWith( {
			refreshRecordFakeKey: '',
		} );
		expect( mockRecord.save ).toHaveBeenCalled();
	} );
} );
