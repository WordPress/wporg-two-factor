/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/components';

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
	return (
		<>
			<p>
				To ensure the highest level of security for your account, please remember to keep
				your authentication methods up-to-date. We recommend configuring multiple
				authentication methods to guarantee you always have access to your account.
			</p>
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
