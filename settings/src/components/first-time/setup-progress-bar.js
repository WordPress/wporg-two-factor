/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';

export default function SetupProgressBar( { currentStepIndex, stepCount } ) {
	const getCompletionPercentage = useCallback(
		() => ( currentStepIndex / ( stepCount - 1 ) ) * 100,
		[ currentStepIndex, stepCount ]
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
				{ Array.from( { length: stepCount } ).map( ( step, index ) => (
					<li key={ index } className={ getStepClass( index ) }>
						<span className="wporg-2fa__setup-count">{ index + 1 }</span>
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
