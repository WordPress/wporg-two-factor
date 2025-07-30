window.wp = window.wp || {};

( function( settings, wp ) {
	let revalidateModal = false;
	let triggerEvent = false

	// Returns the expiry time of the sudo cookie.
	const getRevalidateExpiry = function() {
		const sudoCookieValue = document.cookie.split( /;\s*/ ).filter(
			(cookie) => cookie.startsWith( settings.cookieName + '=' )
		)[0]?.split('=')[1] || false;

		if ( ! sudoCookieValue ) {
			return false;
		}

		const expiry = new Date( parseInt( sudoCookieValue ) * 1000 );
		if ( expiry < new Date() ) {
			return false;
		}

		return expiry;
	};

	// Whether or not revalidation is required.
	const revalidateRequired = function() {
		return ! getRevalidateExpiry();
	};

	// Does the provided URL look like a revalidation url?
	const urlLooksLikeRevalidationURL = function( url ) {
		return url && url.includes( 'wp-login.php' ) && url.includes( 'action=revalidate_2fa' );
	};

	// Display a modal dialog asking to revalidate.
	const displayModal = function() {
		// Remove any existing dialog from the DOM.
		if ( revalidateModal ) {
			revalidateModal.remove();
		}

		const triggerElement = triggerEvent?.submitter || triggerEvent?.currentTarget || triggerEvent?.target;

		revalidateModal = document.createElement( 'dialog' );
		revalidateModal.className = 'wporg-2fa-revalidate-modal';

		const heading = document.createElement( 'h1' );
		heading.textContent = settings.l10n.title;
		revalidateModal.appendChild( heading );

		const revalidationMessage = document.createElement( 'p' );
		revalidationMessage.textContent = triggerElement?.dataset['2faMessage'] || settings.l10n.message;
		revalidateModal.appendChild( revalidationMessage );

		const linkHref  = triggerElement?.href || triggerElement?.action || triggerElement?.formAction || '';
		const iframeSrc = urlLooksLikeRevalidationURL( linkHref ) ? linkHref : settings.url;

		const iframe = document.createElement( 'iframe' );
		iframe.src = iframeSrc + '&interim-login=1';
		revalidateModal.appendChild( iframe );

		const closeButton = document.createElement( 'button' );
		closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M13 11.8l6.1-6.3-1-1-6.1 6.2-6.1-6.2-1 1 6.1 6.3-6.5 6.7 1 1 6.5-6.6 6.5 6.6 1-1z"></path></svg>';
		closeButton.addEventListener( 'click', function() {
			revalidateModal.close();
		} );
		revalidateModal.appendChild( closeButton );

		document.body.appendChild( revalidateModal );

		revalidateModal.showModal();
	};

	// Remove the revalidate URL from the link/form/formbutton, replacing it with the redirect_to if present.
	const maybeRemoveRevalidateURL = function( element ) {
		// If we're on a element within the target element (as denoted by the data attribute, or href), run up the tree.
		while (
			element &&
			(
				(
					// Elements designated with data-2fa-required.
					element.dataset &&
					! ( '2faRequired' in element.dataset )
				) || (
					// Elements with a href that appears to be a revalidation URL.
					'A' === element.tagName.toUpperCase() &&
					! element.href.includes( 'action=revalidate_2fa' )
				)
			) &&
			element.parentElement
		) {
			element = element.parentElement;
		}

		if ( ! element ) {
			return false;
		}

		const properties = [ 'href', 'action', 'formAction' ];
		let linkUrl      = '';
		let targetProp   = '';

		for ( var prop of properties ) {
			if ( prop in element && element[ prop ] ) {
				linkUrl    = element[ prop ];
				targetProp = prop;
				break;
			}
		}

		if (
			! linkUrl ||
			! targetProp ||
			! urlLooksLikeRevalidationURL( linkUrl ) ||
			! linkUrl.includes( 'redirect_to=' )
		) {
			return false;
		}

		const href     = new URL( linkUrl );
		const redirect = decodeURIComponent( href.searchParams.get( 'redirect_to' ) );

		if ( ! redirect ) {
			return false;
		}

		// Overwrite.
		element[ targetProp ] = redirect;

		return true;
	};

	// Handle the click event on a link, checking if revalidation is required prior to proceeding.
	const maybeRevalidateOnLinkNavigate = function( e ) {
		// Check to see if revalidation is required, otherwise we're in Sudo mode.
		if ( ! revalidateRequired() ) {
			maybeRemoveRevalidateURL( e.submitter || e.currentTarget || e.target );
			return;
		}

		triggerEvent = e;

		// Prevent the default action.
		e.preventDefault();

		// If we're here, we need to revalidate the session, trigger the modal.
		displayModal();
	};

	// Wait for the revalidation to complete.
	const messageHandler = function( event ) {
		if ( event?.data?.type !== 'reValidationComplete' ) {
			return;
		}

		revalidateModal.close();
		revalidateModal.remove();

		// Import and reset.
		const theTriggerEvent = triggerEvent;
		triggerEvent = false;

		// Maybe remove the revalidate URL from the last target.
		if ( theTriggerEvent?.target ) {
			maybeRemoveRevalidateURL( theTriggerEvent.target );
		}
		// If it's a form, remove it from the element that's triggering us.
		if ( theTriggerEvent?.submitter ) {
			maybeRemoveRevalidateURL( theTriggerEvent.submitter );
		}

		// Finally, notify others.
		( theTriggerEvent?.target || window ).dispatchEvent( new Event( 'reValidationComplete', { bubbles: true } ) );

		// If the last event was a click, throw that again, but by re-creating it.
		if ( theTriggerEvent?.type === 'click' ) {
			theTriggerEvent.target.dispatchEvent(
				new theTriggerEvent.constructor( theTriggerEvent.type, theTriggerEvent )
			);
		} else if ( theTriggerEvent?.type === 'submit' ) {
			// Request the form submit in the context of the original submitter (to ensure form* attributes are respected).
			theTriggerEvent.target.requestSubmit( theTriggerEvent.submitter || theTriggerEvent.target );
		}
	};

	// Export these functions for other scripts and debugging.
	wp.wporg2faRevalidation = {
		getRevalidateExpiry,
		revalidateRequired,
		urlLooksLikeRevalidationURL,
		displayModal,
		maybeRemoveRevalidateURL,
		maybeRevalidateOnLinkNavigate,
		messageHandler,
	};

	/*
	 * Attach event listeners to all revalidate links and those that require 2FA sessions.
	 *
	 * If the element is an action inside a form, we'll listen on submit.
	 *  (The .form attribute is only present on input & submission elements).
	 * If the element is a form, we listen on submit.
	 * Otherwise, we listen on click of the element.
	 */
	document.querySelectorAll( 'a[href*="action=revalidate_2fa"], [data-2fa-required]' ).forEach(
		(el) => {
			if ( 'form' in el && el.form ) {
				el.form.addEventListener( 'submit', maybeRevalidateOnLinkNavigate );
			} else if ( 'FORM' == el.tagName.toUpperCase() ) {
				el.addEventListener( 'submit', maybeRevalidateOnLinkNavigate );
			} else {
				el.addEventListener( 'click', maybeRevalidateOnLinkNavigate );
			}
		}
	);

	// Watch for revalidation completion.
	window.addEventListener( 'message', messageHandler );

} )( wporgTwoFactorRevalidation, window.wp );
