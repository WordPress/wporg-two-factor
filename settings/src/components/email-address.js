
/**
 * WordPress dependencies
 */
import { Button, TextControl, Notice, Spinner } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as coreDataStore } from '@wordpress/core-data';

/**
 * Render the Email setting.
 */
export default function EmailAddress( { userId } ) {
	const { userData, userDataAvailable, isSaving, hasEdits } = useSelect(
		( select ) => {
			const selectorArgs = [ 'root', 'user', userId, { context: 'edit' } ];
			return {
				userData: select( coreDataStore ).getEditedEntityRecord(
					...selectorArgs
				),
				userDataAvailable: select( coreDataStore ).hasFinishedResolution(
					'getEditedEntityRecord',
					selectorArgs
				),
				isSaving: select( coreDataStore ).isSavingEntityRecord(
					...selectorArgs
				),
				hasEdits: select( coreDataStore ).hasEditsForEntityRecord(
					...selectorArgs
				)
			};
		},
		[]
	);

	const { saveEditedEntityRecord, editEntityRecord } = useDispatch( coreDataStore );

	const handleEmailChange = ( email ) => editEntityRecord( 'root', 'user', userId, { email } );

	const handleSave = async () => {
		await saveEditedEntityRecord( 'root', 'user', userId );
	};

	const handleDiscard = async () => {
		await editEntityRecord( 'root', 'user', userId, { pending_email: '' } );
		await saveEditedEntityRecord( 'root', 'user', userId );
		alert( "Discarded" );
	};

	return (
		<>
			{ userData?.pending_email && <Notice status="info" onDismiss={ handleDiscard }>
				<p>
					There is a pending email change to { userData.pending_email }.
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
				value={ userData.email }
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