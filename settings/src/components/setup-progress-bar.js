/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';
import { Icon, check } from '@wordpress/icons';

export default function SetupProgressBar( { currentStep, steps } ) {
	const currentIndex = steps.findIndex( ( step ) => step.id === currentStep );
	const getCompletionPercentage = useCallback(
		() => ( ( currentIndex + 1 ) / steps.length ) * 100,
		[ currentIndex, steps.length ]
	);

	const getStepClass = ( index ) => {
		if ( index === currentIndex ) {
			return 'is-enabled';
		}

		if ( currentIndex > index ) {
			return 'is-complete';
		}

		return 'is-disabled';
	};

	return (
		<div className="wporg-2fa__progress-bar">
			<ul className="wporg-2fa__setup-steps">
				{ steps.map( ( step, index ) => (
					<li key={ step.id } className={ getStepClass( index ) }>
						<Icon
							width="18px"
							height="18px"
							icon={ currentIndex > index ? check : step.icon }
						/>
						<span className="wporg-2fa__setup-label">{ step.title }</span>
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
