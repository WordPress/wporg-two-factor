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
 * @param props.canNavigate
 */
const ScreenNavigation = ( { screen, children, title = '', canNavigate = true } ) => (
	<Card>
		<CardHeader className="wporg-2fa__navigation" size="xSmall">
			{ canNavigate && (
				<ScreenLink
					screen="home"
					ariaLabel="Back to the account status page"
					anchorText={
						<>
							<Icon icon={ chevronLeft } width={ 24 } height={ 24 } />
							Back
						</>
					}
				/>
			) }

			<h3>{ title }</h3>
		</CardHeader>
		<CardBody className={ 'wporg-2fa__' + screen }>{ children }</CardBody>
	</Card>
);

export default ScreenNavigation;
