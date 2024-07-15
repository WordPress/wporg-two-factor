/**
 * WordPress dependencies
 */
import { useContext, useState } from "@wordpress/element";
import { Button, Flex } from "@wordpress/components";

/**
 * Internal dependencies
 */
import ScreenNavigation from "./screen-navigation";
import TOTP from "./totp";
import WebAuthn from "./webauthn/webauthn";
import BackupCodes from "./backup-codes";
import SetupProgressBar from "./setup-progress-bar";
import { GlobalContext } from "../script";

function DefaultView({ onSelect }) {
	const [selectedOption, setSelectedOption] = useState("webauthn");

	const handleOptionChange = (e) => {
		setSelectedOption(e.target.value);
	};

	const handleButtonClick = () => {
		if (selectedOption === "") {
			return;
		}

		onSelect(selectedOption);
	};

	return (
		<>
			<p>
				As of September 10, 2024, all plugin committers will be required to have
				Two-Factor Authentication enabled.
			</p>
			<form>
				<div>
					<input
						type="radio"
						id="webauthn"
						name="toggle"
						value="webauthn"
						checked={selectedOption === "webauthn"}
						onChange={handleOptionChange}
					/>
					<label htmlFor="webauthn">Setup security key</label>
				</div>
				<div>
					<input
						type="radio"
						id="totp"
						name="toggle"
						value="totp"
						checked={selectedOption === "totp"}
						onChange={handleOptionChange}
					/>
					<label htmlFor="totp">Setup One Time Password</label>
				</div>
			</form>
			<Flex>
				<Button isPrimary onClick={handleButtonClick}>
					Configure
				</Button>
				<Button isSecondary onClick={handleButtonClick}>
					Skip for now
				</Button>
			</Flex>
		</>
	);
}

/**
 * Render the correct component based on the URL.
 *
 */
export default function InitialSetup() {
	const { navigateToScreen, screen } = useContext(GlobalContext);

	// The index is the URL slug and the value is the React component.
	const components = {
		totp: <TOTP />,
		"backup-codes": <BackupCodes />,
		webauthn: <WebAuthn />,
		home: (
			<DefaultView
				onSelect={ ( val) => {
					navigateToScreen( val);
				} }
			/>
		),
	};

	const titles = {
		'home': 'Secure your account',
	}


	const currentScreenComponent = (
		<ScreenNavigation screen={ screen } title={ titles[ screen ] }>
				<SetupProgressBar step={"totp-setup"} />
				{components[screen]}
			</ScreenNavigation> )

	return (
		<div className="wporg-2fa__first-time">
			<div className="wporg-2fa__first-time__inner">
				{currentScreenComponent}
			</div>
		</div>
	);
}
