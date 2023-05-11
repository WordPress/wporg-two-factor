module.exports = {
	root: true,
	extends: 'plugin:@wordpress/eslint-plugin/recommended',

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
