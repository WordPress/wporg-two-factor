/**
 * @file This is a fork of Two Factor Provider WebAuthn's `common.ts` functions.
 *
 * It's been converted to a native JS module. Instructions for updating:
 *
 * 		1. Clone the Git repository and follow the normal setup instructions.
 * 		2. In `rollup.config.mjs`, uncomment the `babel()` and `terser()` lines in `plugins`.
 * 		3. `npm run build`. The `assets/profile.js.min` file should be transpiled to JS and left unminified.
 * 		4. Copy/paste the functions below from `profile.js.min`, and add `export` to the `prepare...` ones.
 * 		5. Test to make sure everything's compatible with our custom UI.
 *
 * @see https://github.com/sjinks/wp-two-factor-provider-webauthn
 * @see https://github.com/sjinks/wp-two-factor-provider-webauthn/blob/a17ed69/assets/common.ts
 * @see https://github.com/sjinks/wp-two-factor-provider-webauthn/blob/a17ed69/rollup.config.mjs
 */

function arrayToBase64String( a ) {
	return window.btoa( String.fromCharCode( ...a ) );
}

function base64UrlDecode( input ) {
	return window.atob(
		input.replace( /-/g, '+' ).replace( /_/g, '/' ) +
			'='.repeat( 3 - ( ( 3 + input.length ) % 4 ) )
	);
}

function stringToBuffer( s ) {
	return Uint8Array.from( s, ( c ) => c.charCodeAt( 0 ) );
}

export function preparePublicKeyCreationOptions( publicKey ) {
	let _a;
	return {
		...publicKey,
		user: {
			...publicKey.user,
			id: stringToBuffer( base64UrlDecode( publicKey.user.id ) ),
		},
		challenge: stringToBuffer( base64UrlDecode( publicKey.challenge ) ),
		excludeCredentials:
			( _a = publicKey.excludeCredentials ) === null || _a === void 0
				? void 0
				: _a.map( ( data ) => ( {
						...data,
						id: stringToBuffer( base64UrlDecode( data.id ) ),
				  } ) ),
	};
}

export function preparePublicKeyCredential( data ) {
	const response = data.response;
	return {
		id: data.id,
		type: data.type,
		rawId: arrayToBase64String( new Uint8Array( data.rawId ) ),
		clientExtensionResults: data.getClientExtensionResults(),
		response: {
			attestationObject:
				'attestationObject' in response
					? arrayToBase64String( new Uint8Array( response.attestationObject ) )
					: undefined,
			authenticatorData:
				'authenticatorData' in response
					? arrayToBase64String( new Uint8Array( response.authenticatorData ) )
					: undefined,
			signature:
				'signature' in response
					? arrayToBase64String( new Uint8Array( response.signature ) )
					: undefined,
			userHandle:
				'userHandle' in response && response.userHandle
					? arrayToBase64String( new Uint8Array( response.userHandle ) )
					: undefined,
			clientDataJSON: arrayToBase64String( new Uint8Array( data.response.clientDataJSON ) ),
		},
	};
}
