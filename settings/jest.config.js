/** @type {import('jest').Config} */
const config = {
	testEnvironment: 'jsdom',
	moduleNameMapper: {
		'^uuid$': require.resolve( 'uuid' ),
	},
	transformIgnorePatterns: [
		'node_modules/(?!(parsel-js)/)',
	],
	setupFilesAfterEnv: [ './jest.setup.js' ],
};

module.exports = config;
