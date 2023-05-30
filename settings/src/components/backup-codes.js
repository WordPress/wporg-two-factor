/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { useContext, useCallback, useEffect, useState } from '@wordpress/element';
import { Button, CheckboxControl, Notice, Spinner } from '@wordpress/components';
import { Icon, warning, cancelCircleFilled } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import RevalidateModal from './revalidate-modal';
import { GlobalContext } from '../script';
import { refreshRecord } from '../utilities';

/**
 * Setup and manage backup codes.
 */
export default function BackupCodes() {
	const {
		user: { userRecord },
	} = useContext( GlobalContext );
	const [ regenerating, setRegenerating ] = useState( false );

	const backupCodesEnabled =
		userRecord.record[ '2fa_available_providers' ].includes( 'Two_Factor_Backup_Codes' );

	if ( backupCodesEnabled && ! regenerating ) {
		return <Manage setRegenerating={ setRegenerating } />;
	}
	return <Setup setRegenerating={ setRegenerating } />;
}

/**
 * Setup the Backup Codes provider.
 *
 * @param props
 * @param props.setRegenerating
 */
function Setup( { setRegenerating } ) {
	const {
		setGlobalNotice,
		user: { userRecord },
	} = useContext( GlobalContext );
	const [ backupCodes, setBackupCodes ] = useState( [] );
	const [ hasPrinted, setHasPrinted ] = useState( false );
	const [ error, setError ] = useState( '' );

	// Generate new backup codes and save them in usermeta.
	useEffect( () => {
		// useEffect callbacks can't be async directly, because that'd return the promise as a "cleanup" function.
		const generateCodes = async () => {
			// This will save the backup codes and enable the provider, which isn't really what we want, but that
			// mimics the upstream plugin. It's probably better to fix it there first, and then update this, to
			// make sure we stay in sync with upstream.
			// See https://github.com/WordPress/two-factor/issues/507
			try {
				const response = await apiFetch( {
					path: '/two-factor/1.0/generate-backup-codes',
					method: 'POST',
					data: {
						user_id: userRecord.record.id,
						enable_provider: true,
					},
				} );

				setBackupCodes( response.codes );
			} catch ( apiFetchError ) {
				setError( apiFetchError );
			}
		};

		generateCodes();
	}, [] );

	// Finish the setup process.
	const handleFinished = useCallback( () => {
		// The codes have already been saved to usermeta, see `generateCodes()` above.
		refreshRecord( userRecord ); // This has the intended side-effect of redirecting to the Manage screen.
		setGlobalNotice( 'Backup codes have been enabled.' );
		setRegenerating( false );
	} );

	return (
		<>
			<p>
				Backup codes let you access your account if your primary two-factor authentication
				method is unavailable, like if your phone is lost or stolen. Each code can only be
				used once.
			</p>

			<p>Please print the codes and keep them in a safe place.</p>

			{ error ? (
				<>
					{ error.code === 'revalidation_required' && <RevalidateModal /> }
					<Notice status="error" isDismissible={ false }>
						<Icon icon={ cancelCircleFilled } />
						{ error.message }
					</Notice>
				</>
			) : (
				<>
					<CodeList codes={ backupCodes } />

					<Notice status="warning" isDismissible={ false }>
						<Icon icon={ warning } className="wporg-2fa__print-codes-warning" />
						Without access to the one-time password app or a backup code, you will lose
						access to your account. Once you navigate away from this page, you will not
						be able to view these codes again.
					</Notice>

					<CheckboxControl
						label="I have printed or saved these codes"
						checked={ hasPrinted }
						onChange={ setHasPrinted }
						disabled={ error }
					/>
				</>
			) }

			<p className="wporg-2fa__submit-actions">
				<Button isPrimary disabled={ ! hasPrinted } onClick={ handleFinished }>
					All Finished
				</Button>
			</p>
		</>
	);
}

/**
 * Display a list of backup codes
 *
 * @param props
 * @param props.codes
 */
function CodeList( { codes } ) {
	return (
		<div className="wporg-2fa__backup-codes-list">
			{ ! codes.length && (
				<p>
					Generating backup codes...
					<Spinner />
				</p>
			) }

			{ codes.length > 0 && (
				<ol>
					{ codes.map( ( code ) => {
						return (
							<li key={ code } className="wporg-2fa__token">
								{ code.slice( 0, 4 ) + ' ' + code.slice( 4 ) }
							</li>
						);
					} ) }
				</ol>
			) }
		</div>
	);
}

/**
 * Render the screen where users can manage Backup Codes.
 *
 * @param props
 * @param props.setRegenerating
 */
function Manage( { setRegenerating } ) {
	const {
		user: {
			userRecord: { record },
		},
	} = useContext( GlobalContext );
	const remaining = record[ '2fa_backup_codes_remaining' ];

	return (
		<>
			<p>
				Backup codes let you access your account if your primary two-factor authentication
				method is unavailable, like if your phone is lost or stolen. Each code can only be
				used once.
			</p>

			{ remaining > 5 && (
				<p>
					You have <strong>{ remaining }</strong> backup codes remaining.
				</p>
			) }

			{ remaining <= 5 && (
				<Notice status="warning" isDismissible={ false }>
					<Icon icon={ warning } />
					You only have <strong>{ remaining }</strong> backup codes remaining. Please
					regenerate and save new ones before you run out. If you don&apos;t, you
					won&apos;t be able to log into your account if you lose your phone.
				</Notice>
			) }

			<Button
				isSecondary
				onClick={ () => {
					setRegenerating( true );
				} }
			>
				Generate new backup codes
			</Button>
		</>
	);
}
