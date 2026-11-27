const globals = require( 'globals' );
const defaultConfig = require( '@wordpress/scripts/config/eslint.config.cjs' );

module.exports = [
	...defaultConfig,
	{
		languageOptions: {
			globals: { navigator: 'readonly' },
		},
		rules: {
			'jsdoc/require-param-type': 'off',
			'jsdoc/reject-function-type': 'off',
			'prettier/prettier': [
				'error',
				{
					...require( '@wordpress/prettier-config' ),
					printWidth: 100,
				},
			],
		},
	},
	{
		files: [ 'src/tests/**/*.js', 'vitest.setup.js' ],
		languageOptions: {
			globals: globals.vitest,
		},
	},
];
