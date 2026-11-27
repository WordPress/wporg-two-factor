import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig( {
	plugins: [
		react( {
			// The source keeps JSX in `.js` files.
			parserConfig: ( id ) =>
				/\.jsx?$/.test( id ) ? { syntax: 'ecmascript', jsx: true } : undefined,
		} ),
	],
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: [ './vitest.setup.js' ],
		// Node cannot load some `@wordpress` ESM builds (directory and JSON imports), so Vite compiles them.
		server: { deps: { inline: [ /@wordpress\// ] } },
	},
} );
