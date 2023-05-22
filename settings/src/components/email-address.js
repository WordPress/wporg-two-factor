/**
 * WordPress dependencies
 */
import { Button, TextControl, Notice, Spinner } from '@wordpress/components';
import { useCallback, useContext, useState } from '@wordpress/element';
import { Icon, cancelCircleFilled } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { GlobalContext } from '../script';

/**
 * Render the Email setting.
 */
export default function EmailAddress() {
	const {
		user: { userRecord, isSaving },
	} = useContext( GlobalContext );
	const { record, edit, save, editedRecord, hasEdits } = userRecord;
	const [ emailError, setEmailError ] = useState( '' );
	const [ justChangedEmail, setJustChangedEmail ] = useState( false );

	const handleSave = useCallback( async () => {
		try {
			setEmailError( '' );

			await save();

			setJustChangedEmail( true );
		} catch ( error ) {
			let message = error.message;

			if ( 'rest_user_invalid_email' === error.code ) {
				message = 'Sorry, that email is already in use by another account.';
			} else if ( 'rest_invalid_param' === error.code ) {
				message = 'Sorry, it looks like that email is invalid.';
			}

			setEmailError( message );
		}
	}, [] );

	const handleDiscard = useCallback( async () => {
		try {
			await edit( { pending_email: '' } );
			await save();
		} catch ( error ) {
			setEmailError( error.message );
		}
	}, [] );

	return (
		<>
			{ record.pending_email && ! justChangedEmail && (
				<Notice
					status="warning"
					className="actions-on-right"
					isDismissible={ false }
					actions={ [ { label: 'Cancel change', onClick: handleDiscard } ] }
				>
					<p>
						There is a pending email change to { record.pending_email }.<br />
						Please check your email for a confirmation link.
					</p>
				</Notice>
			) }

			{ record.pending_email && justChangedEmail && (
				<Notice
					status="success"
					className="actions-on-right"
					isDismissible={ false }
					actions={ [ { label: 'Cancel change', onClick: handleDiscard } ] }
				>
					<p>
						Please check your email for a confirmation email.
						<br />
						If { record.pending_email } is incorrect, simply enter a new email below.
					</p>
				</Notice>
			) }

			<p>To change your email address enter a new one below.</p>

			<TextControl
				type="email"
				help="We will send you a verification email before updating your email address."
				label="Your email address"
				size="62"
				placeholder="Enter email address..."
				value={ editedRecord.email ?? record.email }
				onChange={ ( email ) => edit( { email } ) }
			/>

			{ emailError && (
				<Notice status="error" isDismissible={ false }>
					<Icon icon={ cancelCircleFilled } />
					{ emailError }
				</Notice>
			) }

			<p>
				<Button
					variant="primary"
					onClick={ handleSave }
					disabled={ ! hasEdits || isSaving }
				>
					{ isSaving ? (
						<>
							<Spinner />
							Updating
						</>
					) : (
						'Update Email Address'
					) }
				</Button>
			</p>
		</>
	);
}
