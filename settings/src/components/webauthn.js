/**
 * WordPress dependencies
 */
import { useContext } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';

/**
 * Render the WebAuthn setting.
 */
export default function WebAuthn() {
	const { userRecord } = useContext( GlobalContext );
	const { record } = userRecord;

	// Get the current domain automatically. This is a little hacky, but it's temporary.
	const adminUrl = apiFetch.nonceEndpoint.replace( 'admin-ajax.php?action=rest-nonce', '' );
	const enableUrl = adminUrl + 'profile.php#two-factor-options';

	return (
		<p>
			The front-end interface for WebAuthn is currently under development. You can <a href={ enableUrl }>enable it in wp-admin</a> for now.
		</p>
	);
}
