/** @type {import('jest').Config} */
const config = {
	testEnvironment: 'jsdom',
	moduleNameMapper: {
		'^uuid$': require.resolve( 'uuid' ),
	},
	setupFilesAfterEnv: [ './jest.setup.js' ],
};

module.exports = config;
