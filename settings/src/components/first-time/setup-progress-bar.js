/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';

export default function SetupProgressBar( { currentStepIndex, steps } ) {
	const getCompletionPercentage = useCallback(
		() => ( currentStepIndex / ( steps.length - 1 ) ) * 100,
		[ currentStepIndex, steps ]
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

	const flexWidth = 100 / steps.length;

	return (
		<div className="wporg-2fa__progress-bar">
			<ul className="wporg-2fa__setup-steps">
				{ steps.map( ( step, index ) => (
					<li
						key={ step }
						className={ getStepClass( index ) }
						style={ { flexBasis: flexWidth + '%' } }
					>
						<span className="wporg-2fa__setup-count">{ index + 1 }</span>
						<span className="wporg-2fa__setup-label">{ step }</span>
					</li>
				) ) }
			</ul>

			<div
				style={ {
					'--wporg-separator-width': getCompletionPercentage() + '%',
					width: 100 - flexWidth + '%',
					left: flexWidth / 2 + '%',
				} }
				className="wporg-2fa__setup-step-separator"
			></div>
		</div>
	);
}
