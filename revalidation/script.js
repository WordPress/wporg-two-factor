(function(settings){
	let revalidateModal = false;
	let lastTarget = false;

	const revalidateRequired = function() {
		const sudoCookieValue = document.cookie.split( /;\s*/ ).filter(
			(cookie) => cookie.startsWith( settings.cookieName + '=' )
		)[0]?.split('=')[1] || false;

		return ! sudoCookieValue;
	};

	const urlLooksLikeRevalidationURL = function( url ) {
		return url.includes( 'wp-login.php' ) && url.includes( 'action=revalidate_2fa' );
	}

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

		const iframe    = document.createElement( 'iframe' );
		const linkHref  = e.currentTarget.href || e.target.href;
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

	const maybeRevalidateOnLinkNavigate = function( e ) {
		// Check to see if revalidation is required, otherwise we're in Sudo mode.
		if ( ! revalidateRequired() ) {
			maybeRemoveRevalidateURL( e.currentTarget );
			return;
		}

		// If we're here, we need to revalidate the session, trigger the modal.
		modalTrigger( e );

		// Wait for the revalidation complete event, and re-trigger this navigation.
		e.target.addEventListener( 'reValidationComplete', function() {
			e.target.dispatchEvent( e ); // Just throw the exact same event again.
		} );
	};

	// Attach event listeners to all revalidate links
	document.querySelectorAll( 'a[href*="revalidate_2fa"]' ).forEach( function( el ) {
		el.addEventListener( 'click', modalTrigger );
	} );

	// Attach event listeners to any links that require a valid 2FA session.
	document.querySelectorAll( 'a[data-2fa-required]' ).forEach( function( el ) {
		el.addEventListener( 'click', maybeRevalidateOnLinkNavigate );

		// If we need to revalidate, attach a class to said elements.
		if ( revalidateRequired() ) {
			el.classList.add( 'revalidate-required' );
		}
	} );

	// Listen for the revalidation to complete.
	window.addEventListener( 'message', function( event ) {
		if ( ! event.data || ! event.data.type || event.data.type !== 'reValidationComplete' ) {
			return;
		}

		revalidateModal.close();
		revalidateModal.remove();

		// We've revalidated, remove any revalidate-required classes.
		document.querySelectorAll( '.revalidate-required' ).forEach( function( el ) {
			el.classList.remove( 'revalidate-required' );
		} );

		// Maybe remove the revalidate URL from the last target.
		if ( lastTarget ) {
			maybeRemoveRevalidateURL( lastTarget );
		}

		// Finally, notify others.
		( lastTarget || window ).dispatchEvent( new Event( 'reValidationComplete', { bubbles: true } ) );
	} );
})(wporgTwoFactorRevalidation);