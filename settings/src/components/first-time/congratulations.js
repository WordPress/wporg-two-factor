/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/components';
import { useContext } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../../script';

/**
 * Check if the URL is valid. Make sure it stays on wordpress.org.
 *
 * @param  url
 * @return {boolean} Whether it's a valid URL.
 */
const isValidUrl = ( url ) => {
	try {
		const { hostname } = new URL( url );
		return hostname.endsWith( 'wordpress.org' );
	} catch ( exception ) {
		return false;
	}
};

export default function Congratulations() {
	const {
		user: { webAuthnEnabled, totpEnabled },
	} = useContext( GlobalContext );

	const getAuthSuggestion = () => {
		if ( webAuthnEnabled && totpEnabled ) {
			return null;
		}

		return (
			<ul>
				<li>
					{ totpEnabled && (
						<a href="https://profiles.wordpress.org/me/profile/edit/group/3/?screen=webauthn">
							Set up a security key
						</a>
					) }

					{ webAuthnEnabled && (
						<a href="https://profiles.wordpress.org/me/profile/edit/group/3/?screen=totp">
							Set up an authenticator app
						</a>
					) }
				</li>
			</ul>
		);
	};

	return (
		<>
			<p>
				To ensure the highest level of security for your account, please remember to keep
				your authentication methods up-to-date, and consult{ ' ' }
				<a href="//make.wordpress.org/meta/handbook/tutorials-guides/configuring-two-factor-authentication/">
					our documentation
				</a>{ ' ' }
				if you need help or have any questions.
			</p>
			<p>
				We recommend configuring multiple authentication methods and generating backup codes
				to guarantee you always have access to your account.
			</p>

			{ getAuthSuggestion() }

			<div className="wporg-2fa__submit-actions">
				<Button
					onClick={ () => {
						const redirectTo = new URLSearchParams( window.location.search ).get(
							'redirect_to'
						);

						if ( redirectTo && isValidUrl( redirectTo ) ) {
							window.location.href = redirectTo;
						} else {
							window.location.href =
								'//profiles.wordpress.org/me/profile/edit/group/3';
						}
					} }
					isPrimary
				>
					Continue
				</Button>
			</div>
		</>
	);
}
