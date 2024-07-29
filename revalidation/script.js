(function(settings){
	let revalidateModal = false;
	let lastTarget = false;

	const modalTrigger = function(e) {
		e.preventDefault();
		lastTarget = e.target;

		// Remove the existing dialog from the DOM.
		if ( revalidateModal ) {
			revalidateModal.remove();
		}

		revalidateModal = document.createElement( 'dialog' );
		revalidateModal.className = 'wporg-2fa-revalidate-modal';
		revalidateModal.innerHTML = '<h1>' + settings.l10n.title + '</h1>';

		const iframe = document.createElement( 'iframe' );
		iframe.src = e.target.href + '&interim-login=1';

		const closeButton = document.createElement( 'button' );
		closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M13 11.8l6.1-6.3-1-1-6.1 6.2-6.1-6.2-1 1 6.1 6.3-6.5 6.7 1 1 6.5-6.6 6.5 6.6 1-1z"></path></svg>';
		closeButton.addEventListener( 'click', function() {
			revalidateModal.close();
		} );

		revalidateModal.appendChild( iframe );
		revalidateModal.appendChild( closeButton );

		document.body.appendChild( revalidateModal );

		revalidateModal.showModal();
	};

	// Attach event listeners to all revalidate links
	document.querySelectorAll( 'a[href*=revalidate_2fa]' ).forEach( function( el ) {
		el.addEventListener( 'click', modalTrigger );
	} );

	// Listen for the revalidation to complete.
	window.addEventListener( 'message', function( event ) {
		if ( ! event.data || ! event.data.type || event.data.type !== 'reValidationComplete' ) {
			return;
		}

		revalidateModal.close();
		revalidateModal.remove();

		// Notify others.
		( lastTarget || window ).dispatchEvent( new Event( 'reValidationComplete', { bubbles: true } ) );
	} );
})(wporgTwoFactorRevalidation);