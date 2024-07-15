/**
 * WordPress dependencies
 */
import { Icon, chevronLeft } from '@wordpress/icons';
import { Card, CardHeader, CardBody } from '@wordpress/components';

/**
 * Internal dependencies
 */
import ScreenLink from './screen-link';

/**
 * @param props
 * @param props.children
 * @param props.screen
 * @param props.title
 */
const ScreenNavigation = ( { screen, children, title = '' } ) => (
	<Card>
		<CardHeader className="wporg-2fa__navigation" size="xSmall">
			<ScreenLink
				screen="home"
				ariaLabel="Back to the account status page"
				anchorText={
					<>
						<Icon icon={ chevronLeft } width={ 14 } />
						Back
					</>
				}
			/>

			<h3>
				{ title.length
					? title
					: screen
							.replace( '-', ' ' )
							.replace( 'totp', 'Two-Factor Authentication' )
							.replace( 'webauthn', 'Two-Factor Security Key' ) }
			</h3>
		</CardHeader>
		<CardBody className={ 'wporg-2fa__' + screen }>{ children }</CardBody>
	</Card>
);

export default ScreenNavigation;
