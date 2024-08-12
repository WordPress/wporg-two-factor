/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';
import { Icon, check } from '@wordpress/icons';

export default function SetupProgressBar( { currentStepIndex, steps } ) {
	const getCompletionPercentage = useCallback(
		() => ( currentStepIndex / ( steps.length - 1 ) ) * 100,
		[ currentStepIndex, steps.length ]
	);

	const getStepClass = ( index ) => {
		if ( index === currentStepIndex ) {
			return 'is-enabled';
		}

		if ( currentStepIndex > index ) {
			return 'is-complete';
		}

		return 'is-disabled';
	};

	return (
		<div className="wporg-2fa__progress-bar">
			<ul className="wporg-2fa__setup-steps">
				{ steps.map( ( step, index ) => (
					<li key={ step.title } className={ getStepClass( index ) }>
						<Icon
							width="16px"
							height="16px"
							icon={ currentStepIndex > index ? check : step.icon }
						/>
						<span className="wporg-2fa__setup-label">{ step.label }</span>
					</li>
				) ) }
			</ul>

			<div
				style={ {
					'--wporg-separator-width': getCompletionPercentage() + '%',
				} }
				className="wporg-2fa__setup-step-separator"
			></div>
		</div>
	);
}
