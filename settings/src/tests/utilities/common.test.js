/* global jest, it, describe, beforeEach, expect, afterEach */

/**
 * Local dependencies
 */
import { refreshRecord } from '../../utilities/common';

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
