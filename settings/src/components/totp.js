/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { Button, Notice } from '@wordpress/components';
import { Icon, cancelCircleFilled } from '@wordpress/icons';
import { RawHTML, useCallback, useContext, useEffect, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import SetupProgressBar  from './setup-progress-bar';
import ScreenLink        from './screen-link'
import NumericControl    from './numeric-control';
import { refreshRecord } from '../utilities';
import { GlobalContext } from '../script';

export default function TOTP() {
	const { userRecord }     = useContext( GlobalContext );
	const availableProviders = userRecord.record[ '2fa_available_providers' ];
	const totpStatus         = availableProviders.includes( 'Two_Factor_Totp' ) ? 'enabled' : 'disabled';

	if ( 'enabled' === totpStatus ) {
		return <Manage />;
	} else {
		return <Setup />;
	}
}

/**
 * Setup the TOTP provider.
 */
function Setup() {
	const { clickScreenLink, setGlobalNotice, userRecord } = useContext( GlobalContext );
	const [ secretKey, setSecretKey ]     = useState( '' );
	const [ qrCodeUrl, setQrCodeUrl ]     = useState( '' );
	const [ verifyCode, setVerifyCode ]   = useState( '' );
	const [ error, setError ]             = useState( '' );
	const [ setupMethod, setSetupMethod ] = useState( 'qr-code' );

	// Fetch the data needed to setup TOTP.
	useEffect( () => {
		// useEffect callbacks can't be async directly, because that'd return the promise as a "cleanup" function.
		const fetchSetupData = async () => {
			const response = await apiFetch( {
				path: '/wporg-two-factor/1.0/totp-setup?user_id=' + userRecord.record.id,
			} );

			setSecretKey( response[ 'secret_key' ] );
			setQrCodeUrl( response[ 'qr_code_url' ] );
		};

		fetchSetupData();
	}, [] );

	// Enable TOTP when button clicked.
	const handleEnable = useCallback( async ( event ) => {
		event.preventDefault();

		try {
			await apiFetch( {
				path: '/two-factor/1.0/totp/',
				method: 'POST',
				data: {
					user_id: userRecord.record.id,
					key: secretKey,
					code: verifyCode,
					enable_provider: true,
				},
			} );

			refreshRecord( userRecord );
			clickScreenLink( event, 'backup-codes' );
			setGlobalNotice( 'Successfully enabled One Time Passwords.' ); // Must be After `clickScreenEvent` clears it.

		} catch( error ) {
			setError( error.message );
		}
	} );

	return (
		<>
			<SetupProgressBar step="totp" />

			<p>
				Two-Factor Authentication adds an extra layer of security to your account.
				Once enabled, logging in to WordPress.org will require you to enter a unique passcode
				generated by an app on your mobile device, in addition to your username and password.
			</p>

			<p>
				Not sure what this screen means? You may need to download Authy or Google Authenticator for your phone.
				{/* todo add links to those. maybe pick different ones? or link to an article/video where they can learn more */ }
			</p>

			<SetupMethod
				setupMethod={ setupMethod }
				setSetupMethod={ setSetupMethod }
				qrCodeUrl={ qrCodeUrl }
				secretKey={ secretKey }
			/>

			<p>Then enter the six digit code provided by the app:</p>

			<SetupForm
				handleEnable={ handleEnable }
				verifyCode={ verifyCode }
				setVerifyCode={ setVerifyCode }
				qrCodeUrl={ qrCodeUrl }
				secretKey={ secretKey }
			/>

			{ error &&
				<Notice status="error" isDismissible={ false }>
					<Icon icon={ cancelCircleFilled } />
					{ error }
				</Notice>
			}
		</>
	);
}

/**
 * Render both methods for setting up TOTP in an app.
 */
function SetupMethod( { setupMethod, setSetupMethod, qrCodeUrl, secretKey } ) {
	if ( 'qr-code' === setupMethod ) {
		return (
			<>
				<p>
					Scan this QR code with the authenticator app on your mobile device.
					<br />

					<Button isLink onClick={ () => setSetupMethod( 'manual' ) }>
						Can't scan the code?
					</Button>
				</p>

				<div className="wporg-2fa__qr-code">
					{ ! qrCodeUrl && 'Loading...' }

					{ qrCodeUrl &&
						<a href={ qrCodeUrl } aria-label="Scan QR code">
							<RawHTML>
								{ createQrCode( qrCodeUrl ) }
							</RawHTML>
						</a>
					}
				</div>
			</>
		);
	}

	if ( 'manual' === setupMethod ) {
		const readableSecretKey = secretKey.match( /.{1,4}/g ).join( ' ' );

		return (
			<>
				<p>
					Enter this time code into your mobile app.<br />

					<Button isLink onClick={ () => setSetupMethod( 'qr-code' ) }>
						Prefer to scan a QR code?
					</Button>
				</p>

				<code className="wporg-2fa__manual-code">
					{ readableSecretKey }
				</code>
			</>
		);
	}
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
 */
function SetupForm( { handleEnable, verifyCode, setVerifyCode, qrCodeUrl, secretKey } ) {
	const verifyCodeLength = 6;
	const cleanVerifyCode  = verifyCode.replaceAll( /\s/g, '' );
	const canSubmit        = qrCodeUrl && secretKey && cleanVerifyCode.length === verifyCodeLength;

	return (
		<form onSubmit={ handleEnable }>
			<NumericControl
				className="wporg-2fa__verify-code wporg-2fa__token"
				placeholder="123 456"
				value={ verifyCode }
				onChange={
					( code ) => setVerifyCode( code )
				}
				required={ true }
			/>

			<div>
				<Button type="submit" isPrimary disabled={ ! canSubmit }>
					Enable
				</Button>

				<ScreenLink screen="account-status" anchorText="Cancel" buttonStyle="secondary" />
			</div>
		</form>
	);
}

/**
 * Disable the TOTP provider.
 */
function Manage() {
	const { userRecord, setGlobalNotice } = useContext( GlobalContext );
	const [ error, setError ]             = useState( '' );

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

		} catch( error ) {
			setError( error.message );
		}
	} );

	return (
		<>
			<p>
				You've enabled two-factor authentication on your account — smart move!
				When you log in to WordPress.org, you'll need to enter your username and password, and then enter a unique passcode generated by an app on your mobile device.
			</p>

			<p>
				Make sure you've created { ' ' }
				<ScreenLink screen="backup-codes" anchorText="backup codes" /> { ' ' }
				and saved them in a safe location, in case you ever lose your device. You may also need them when transitioning to a new device.
				Without them you may permenantly lose access to your account.
			</p>

			<p>
				<strong>Status:</strong> { ' ' }
				Two-factor authentication is currently <span className="wporg-2fa__enabled-status">on</span>.
			</p>

			<Button isPrimary onClick={ handleDisable }>
				Disable Two-Factor Authentication
			</Button>

			{ error &&
				<Notice status="error" isDismissible={ false }>
					<Icon icon={ cancelCircleFilled } />
					{ error }
				</Notice>
			}
		</>
	);
}
