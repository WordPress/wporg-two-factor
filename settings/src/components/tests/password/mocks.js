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
