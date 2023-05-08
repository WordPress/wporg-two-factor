/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, Flex } from '@wordpress/components';
import { Icon, cancelCircleFilled } from '@wordpress/icons';
import { RawHTML, useCallback, useContext, useEffect, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import ScreenLink from './screen-link';
import AutoTabbingInput from './auto-tabbing-input';
import { refreshRecord } from '../utilities';
import { GlobalContext } from '../script';

export default function TOTP() {
	const {
		user: { userRecord },
	} = useContext( GlobalContext );
	const availableProviders = userRecord.record[ '2fa_available_providers' ];
	const totpEnabled = availableProviders.includes( 'Two_Factor_Totp' );

	if ( totpEnabled ) {
		return <Manage />;
	}

	return <Setup />;
}

/**
 * Setup the TOTP provider.
 */
function Setup() {
	const {
		clickScreenLink,
		setGlobalNotice,
		user: { userRecord },
	} = useContext( GlobalContext );
	const [ secretKey, setSecretKey ] = useState( '' );
	const [ qrCodeUrl, setQrCodeUrl ] = useState( '' );
	const [ error, setError ] = useState( '' );
	const [ setupMethod, setSetupMethod ] = useState( 'qr-code' );
	const [ inputs, setInputs ] = useState( Array( 6 ).fill( '' ) );

	// Fetch the data needed to setup TOTP.
	useEffect( () => {
		// useEffect callbacks can't be async directly, because that'd return the promise as a "cleanup" function.
		const fetchSetupData = async () => {
			const response = await apiFetch( {
				path: '/wporg-two-factor/1.0/totp-setup?user_id=' + userRecord.record.id,
			} );

			setSecretKey( response.secret_key );
			setQrCodeUrl( response.qr_code_url );
		};

		fetchSetupData();
	}, [] );

	// Enable TOTP when button clicked.
	const handleEnable = useCallback( async ( event ) => {
		event.preventDefault();

		const code = inputs.join( '' );

		try {
			await apiFetch( {
				path: '/two-factor/1.0/totp/',
				method: 'POST',
				data: {
					user_id: userRecord.record.id,
					key: secretKey,
					code,
					enable_provider: true,
				},
			} );

			refreshRecord( userRecord );
			clickScreenLink( event, 'backup-codes' );
			setGlobalNotice( 'Successfully enabled One Time Passwords.' ); // Must be After `clickScreenEvent` clears it.
		} catch ( handleEnableError ) {
			setError( handleEnableError.message );
		}
	} );

	return (
		<Flex
			expanded={ false }
			direction="column"
			align="top"
			justify="top"
			gap="14px"
			className="wporg-2fa__totp_setup-container"
		>
			<p className="wporg-2fa__totp_setup-instruction">
				Two-Factor Authentication adds an extra layer of security to your account. Use a
				phone app like <a href="https://authy.com/">Authy</a> or{ ' ' }
				<a href="https://support.google.com/accounts/answer/1066447">
					Google Authenticator
				</a>{ ' ' }
				when logging in to WordPress.org.
			</p>

			{ 'qr-code' === setupMethod && (
				<SetupMethodQRCode setSetupMethod={ setSetupMethod } qrCodeUrl={ qrCodeUrl } />
			) }

			{ 'manual' === setupMethod && (
				<SetupMethodManual setSetupMethod={ setSetupMethod } secretKey={ secretKey } />
			) }

			<SetupForm
				handleEnable={ handleEnable }
				qrCodeUrl={ qrCodeUrl }
				secretKey={ secretKey }
				inputs={ inputs }
				setInputs={ setInputs }
				error={ error }
				setError={ setError }
			/>
		</Flex>
	);
}

/**
 * Render the QR code methods for setting up TOTP in an app.
 *
 * @param props
 * @param props.setSetupMethod
 * @param props.qrCodeUrl
 */
function SetupMethodQRCode( { setSetupMethod, qrCodeUrl } ) {
	const handleClick = useCallback( () => setSetupMethod( 'manual' ) );

	return (
		<Flex
			expanded={ false }
			direction="column"
			gap="16px"
			className="wporg-2fa__totp_setup-method-container"
		>
			<p>
				<strong>Scan the QR code with your authentication app&nbsp;</strong>
			</p>

			<Button variant="link" onClick={ handleClick }>
				Can&apos;t scan the QR code?
			</Button>

			<div className="wporg-2fa__qr-code">
				{ ! qrCodeUrl && 'Loading...' }

				{ qrCodeUrl && (
					<a href={ qrCodeUrl } aria-label="QR code to scan">
						<RawHTML>{ createQrCode( qrCodeUrl ) }</RawHTML>
					</a>
				) }
			</div>
		</Flex>
	);
}

/**
 * Render the manual method for setting up TOTP in an app.
 *
 * @param props
 * @param props.setSetupMethod
 * @param props.secretKey
 */
function SetupMethodManual( { setSetupMethod, secretKey } ) {
	const readableSecretKey = secretKey.match( /.{1,4}/g ).join( ' ' );

	const handleClick = useCallback( () => setSetupMethod( 'qr-code' ) );

	return (
		<div className="wporg-2fa__manual">
			<p>
				<strong>Enter this time code into your app&nbsp;</strong>
			</p>

			<Button variant="link" onClick={ handleClick }>
				Prefer to scan a QR code?
			</Button>

			<code>{ readableSecretKey }</code>
		</div>
	);
}

/*
 * Generate a QR code SVG.
 *
 * @param {string} data The data to encode in the QR code.
 */
function createQrCode( data ) {
	const { qrcode } = window; // Loaded via block.json.

	/*
	 * 0 = Automatically select the version, to avoid going over the limit of URL
	 *     length.
	 * L = Least amount of error correction, because it's not needed when scanning
	 *     on a monitor, and it lowers the image size.
	 */
	const qr = qrcode( 0, 'L' );
	qr.addData( data );
	qr.make();

	return qr.createSvgTag( 5 );
}

/**
 * Render the form for entering the TOTP code.
 *
 * @param props
 * @param props.handleEnable
 * @param props.qrCodeUrl
 * @param props.secretKey
 * @param props.inputs
 * @param props.setInputs
 * @param props.error
 * @param props.setError
 */
function SetupForm( { handleEnable, qrCodeUrl, secretKey, inputs, setInputs, error, setError } ) {
	const [ isInputComplete, setIsInputComplete ] = useState( false );

	useEffect( () => {
		if ( error && inputs.some( ( input ) => input === '' ) ) {
			setError( '' );
		}
	}, [ error, inputs ] );

	const handleComplete = useCallback( ( isComplete ) => setIsInputComplete( isComplete ), [] );
	const handleClearClick = useCallback( () => {
		setInputs( Array( 6 ).fill( '' ) );
		setIsInputComplete( false );
	}, [] );

	const canSubmit = qrCodeUrl && secretKey && isInputComplete;

	return (
		<Flex
			expanded={ false }
			direction="column"
			align="center"
			gap="16px"
			className="wporg-2fa__setup-form-container"
		>
			<Notice status="error" isDismissible={ false } className={ error ? 'is-shown' : '' }>
				<Icon icon={ cancelCircleFilled } />
				{ error }
			</Notice>

			<form className="wporg-2fa__setup-form" onSubmit={ handleEnable }>
				<p>Enter the six digit code provided by the app:</p>

				<AutoTabbingInput
					inputs={ inputs }
					setInputs={ setInputs }
					error={ error }
					onComplete={ handleComplete }
				/>

				<div className="wporg-2fa__submit-btn-container">
					<Button
						variant="secondary"
						onClick={ handleClearClick }
						aria-label="Clear all inputs"
					>
						Clear
					</Button>
					<Button
						type="submit"
						variant="primary"
						disabled={ ! canSubmit }
						aria-label="Submit input digits"
					>
						Enable
					</Button>
				</div>
			</form>
		</Flex>
	);
}

/**
 * Disable the TOTP provider.
 */
function Manage() {
	const {
		user: { userRecord },
		setGlobalNotice,
	} = useContext( GlobalContext );
	const [ error, setError ] = useState( '' );

	// Enable TOTP when button clicked.
	const handleDisable = useCallback( async ( event ) => {
		event.preventDefault();

		try {
			await apiFetch( {
				path: '/two-factor/1.0/totp/',
				method: 'DELETE',
				data: { user_id: userRecord.record.id },
			} );

			refreshRecord( userRecord );
			setGlobalNotice( 'Successfully disabled One Time Passwords.' );
		} catch ( handleDisableError ) {
			setError( handleDisableError.message );
		}
	} );

	return (
		<>
			<p>
				You&apos;ve enabled two-factor authentication on your account — smart move! When you
				log in to WordPress.org, you&apos;ll need to enter your username and password, and
				then enter a unique passcode generated by an app on your mobile device.
			</p>

			<p>
				Make sure you&apos;ve created{ ' ' }
				<ScreenLink screen="backup-codes" anchorText="backup codes" /> and saved them in a
				safe location, in case you ever lose your device. You may also need them when
				transitioning to a new device. Without them you may permanently lose access to your
				account.
			</p>

			<p>
				<strong>Status:</strong> Two-factor authentication is currently{ ' ' }
				<span className="wporg-2fa__enabled-status">on</span>.
			</p>

			<Button isPrimary onClick={ handleDisable }>
				Disable Two-Factor Authentication
			</Button>

			{ error && (
				<Notice status="error" isDismissible={ false }>
					<Icon icon={ cancelCircleFilled } />
					{ error }
				</Notice>
			) }
		</>
	);
}
