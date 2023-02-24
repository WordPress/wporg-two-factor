/**
 * Adds the zxcvbn library to the global window object for testing purposes.
 *
 * @param {number} returnValue The score that is returned by the mocked zxcvbn library.
 * @return {Object}
 */
export const mockPasswordEstimator = ( returnValue = 0 ) => {
	// Mock the zxcvbn library
	global.window = Object.create( window );
	Object.defineProperty( window, 'zxcvbn', {
		value: () => {
			return {
				score: returnValue, // at less than 4
			};
		},
		writable: true,
		enumerable: true,
		configurable: true,
	} );
};
