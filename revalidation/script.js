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
		return url.includes( 'wp-login.php' ) && url.includes( 'action=revalidate_2fa' );
	};

	// Display a modal dialog asking to revalidate.
	const displayModal = function() {
		// Remove any existing dialog from the DOM.
		if ( revalidateModal ) {
			revalidateModal.remove();
		}

		revalidateModal = document.createElement( 'dialog' );
		revalidateModal.className = 'wporg-2fa-revalidate-modal';
		revalidateModal.innerHTML = '<h1>' + settings.l10n.title + '</h1>';

		const iframe    = document.createElement( 'iframe' );
		const linkHref  = triggerEvent?.currentTarget?.href || triggerEvent?.target?.href;
		const iframeSrc = urlLooksLikeRevalidationURL( linkHref ) ? linkHref : settings.url;

		iframe.src = iframeSrc + '&interim-login=1';

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

	// Remove the revalidate URL from the link, replacing it with the redirect_to if present.
	const maybeRemoveRevalidateURL = function( element ) {
		// If we're on a element within a link, run back up the DOM to the proper parent.
		while ( element && element.tagName !== 'A' && element.parentElement ) {
			element = element.parentElement;
		}

		// If it's not a <a> link, or not a valid revalidate link, bail.
		if (
			! element ||
			! element.href ||
			! urlLooksLikeRevalidationURL( element.href ) ||
			! element.href.includes( 'redirect_to=' )
		) {
			return false;
		}

		const href     = new URL( element.href );
		const redirect = decodeURIComponent( href.searchParams.get( 'redirect_to' ) );

		if ( ! redirect ) {
			return false;
		}

		// Overwrite.
		element.href = redirect;

		return true;
	};

	// Handle the click event on a link, checking if revalidation is required prior to proceeding.
	const maybeRevalidateOnLinkNavigate = function( e ) {
		// Check to see if revalidation is required, otherwise we're in Sudo mode.
		if ( ! revalidateRequired() ) {
			maybeRemoveRevalidateURL( e.currentTarget );
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

		// Finally, notify others.
		( theTriggerEvent?.target || window ).dispatchEvent( new Event( 'reValidationComplete', { bubbles: true } ) );

		// If the last event was a click, throw that again.
		if ( theTriggerEvent?.type === 'click' ) {
			theTriggerEvent.target.dispatchEvent( theTriggerEvent );
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

	// Attach event listeners to all revalidate links and those that require 2FA sessions.
	document.querySelectorAll( 'a[href*="action=revalidate_2fa"], a[data-2fa-required]' ).forEach(
		(el) => el.addEventListener( 'click', maybeRevalidateOnLinkNavigate )
	);

	// Watch for revalidation completion.
	window.addEventListener( 'message', messageHandler );

} )( wporgTwoFactorRevalidation, window.wp );