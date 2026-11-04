module.exports = {
	root: true,
	extends: 'plugin:@wordpress/eslint-plugin/recommended',

	env: {
		browser: true,
	},

	parserOptions: {
		requireConfigFile: false,
		babelOptions: {
			presets: [ require.resolve( '@wordpress/babel-preset-default' ) ],
		},
	},

	globals: { navigator: 'readonly' },

	rules: {
		'jsdoc/require-param-type': 0,
		'prettier/prettier': [
			'error',
			{
				...require( '@wordpress/prettier-config' ),
				printWidth: 100,
			},
		],
	},
};
