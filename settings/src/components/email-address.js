
/**
 * WordPress dependencies
 */
import { Button, TextControl, Notice, Spinner } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { store as coreDataStore, useEntityRecord } from '@wordpress/core-data';

/**
 * Render the Email setting.
 */
export default function EmailAddress( { userId } ) {
	const { record, edit, save, editedRecord, hasEdits } = useEntityRecord( 'root', 'user', userId );

	// useEntityRecord() doesn't expose isSaving. Huh.
	const isSaving = useSelect( ( select ) => select( coreDataStore ).isSavingEntityRecord( 'root', 'user', userId ) );

	const [ emailError, setEmailError ] = useState( '' );
	const [ justChangedEmail, setJustChangedEmail ] = useState( false );

	const handleEmailChange = ( email ) => edit( { email } );

	const handleSave = async () => {
		try {
			await save();

			setJustChangedEmail( true );
		} catch( error ) {
			// TODO: Change these texts
			// error.code: rest_user_invalid_email (can't use that one), rest_invalid_param (invalid email format)
			// TODO: The red paragraph inserted inline feels a bit hacky.
			setEmailError( error.message );
		}
	};

	const handleDiscard = async () => {
		try {
			await edit( { pending_email: '' } );
			await save();
		} catch( error ) {
			alert( error.message );
		}
	};

	if ( ! record ) {
		return <Spinner />
	}

	return (
		<>
			{ record.pending_email && ! justChangedEmail && <Notice status="warning" className="actions-on-right" isDismissible={ false } actions={ [ { label: "Cancel change", onClick: handleDiscard } ] }>
				<p>
					There is a pending email change to { record.pending_email }.<br />
					Please check your email for a confirmation link.
				</p>
			</Notice> }

			{ record.pending_email && justChangedEmail && <Notice status="success" className="actions-on-right" isDismissible={ false } actions={ [ { label: "Cancel change", onClick: handleDiscard } ] }>
				<p>
					Please check your email for a confirmation email.<br />
					If { record.pending_email } is incorrect, simply enter a new email below.
				</p>
			</Notice> }

			<p>
				To change your email address enter a new one below.
			</p>

			<TextControl
				type="email"
				help="We will send you a verification email after updating your email address."
				label="Your email address"
				size="62"
				placeholder="my-email-address@example.org"
				value={ editedRecord.email ?? record.email }
				onChange={ handleEmailChange }
			/>

			{ emailError && <p style={{color: 'red'}}>{ emailError }</p> }

			<p>
				<Button variant="primary" onClick={ handleSave } disabled={ ! hasEdits || isSaving }>
					{ isSaving ? (
						<>
							<Spinner/>
							Updating
						</>
					) : 'Update Email Address' }
				</Button>
			</p>
		</>
	);
}