/* eslint-disable jsx-a11y/label-has-associated-control */
/**
 * WordPress dependencies
 */
import { useState } from '@wordpress/element';
import { Button, Flex } from '@wordpress/components';

export default function Home( { onSelect } ) {
	const [ selectedOption, setSelectedOption ] = useState( 'totp' );

	const handleOptionChange = ( event ) => {
		setSelectedOption( event.target.value );
	};

	const handleButtonClick = () => {
		if ( selectedOption === '' ) {
			return;
		}

		onSelect( selectedOption );
	};

	return (
		<>
			<p>Select a method to configure two-factor authentication for your account.</p>
			<form className="wporg-2fa__first-time-default">
				<label className="wporg-2fa__first-time-default-item">
					<input
						type="radio"
						id="totp"
						name="toggle"
						value="totp"
						checked={ selectedOption === 'totp' }
						onChange={ handleOptionChange }
					/>
					<div>
						<span>Setup one time password</span>
						<p>Use an application to get two-factor authentication codes.</p>
					</div>
				</label>
				<label className="wporg-2fa__first-time-default-item">
					<input
						type="radio"
						id="webauthn"
						name="toggle"
						value="webauthn"
						checked={ selectedOption === 'webauthn' }
						onChange={ handleOptionChange }
					/>
					<div>
						<span>Setup security key</span>
						<p>Use biometrics, digital cryptography, or hardware keys.</p>
					</div>
				</label>
			</form>
			<Flex className="wporg-2fa__submit-actions" justify="flex-start">
				<Button isPrimary onClick={ handleButtonClick }>
					Configure Two-Factor
				</Button>
			</Flex>
		</>
	);
}
