
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

	const handleEmailChange = ( email ) => edit( { email } );

	const handleSave = async () => {
		try {
			const result = await save();
		} catch( error ) {
			alert( error.message );
			return;
		}

		console.log( result );

		alert( "Saved!" );
	};

	const handleDiscard = async () => {
		await edit( { pending_email: '' } );
		await save();
		alert( "Discarded." );
	};

	if ( ! record ) {
		return <Spinner />
	}

	return (
		<>
			{ record.pending_email && <Notice status="warning" onDismiss={ handleDiscard }>
				<p>
					There is a pending email change to { record.pending_email }.<br />
					Please check your email for a confirmation link.
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
				value={ editedRecord.email || record.email }
				onChange={ handleEmailChange }
			/>

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