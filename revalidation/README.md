# Revalidation

WordPressdotorg\Two_Factor\Revalidation provides several methods that may be used to trigger a 2FA revalidation process.

## get_status() 

Returns the details about the current 2FA session.

 - last_validated: The UTC time that the user last completed a 2FA prompt.
 - expires_at: When the users 2FA "sudo mode" revalidation period is up* (see note below). After this time, the user should be prompted for a 2FA revalidation.
 - expires_save: After expires_at, 2FA save-actions may still occur, due to the save grace period.
 - needs_revalidate: Whether the user should be prompted to revalidate their 2FA now.
 - can_save: Whether a save operation should occur that requires 2FA validation.

Note: The Javascript implementation does not use the same `expires_at`, instead it makes use of `expires_save` and ensures that any action that needs a 2FA session will prompt 1 minute before the `expires_save` timeframe.

## auth_redirect( $redirect_to )

Allows for a save method to require 2FA status, if the request isn't 2FA'd, it'll redirect through a 2FA revalidation prompt, before coming back to your page.

This should not be used on POST requests, as the payload will be lost, either use `get_status()` or return an error.

## get_url( $redirect_to )

Returns a revalidate_2fa link, which will redirect to the specified `$redirect_to`.

## get_js_url( $redirect_to )

**This is probably the function you should call.**

Returns `get_url( $redirect_to )` but also calls `enqueue_assets()` to enqueue a JS revalidation modal that will trigger client-side to provide a better user-experience.

## Attributes
Two Data attributes are also able to trigger 2FA revalidation modals IF `get_js_url()` has been used or `enqueue_assets()` has been called.

### data-2fa-required
If this attribute is present, it'll trigger the 2FA modal on click, and throw the click event after completion.

### data-2fa-message
If this attribute is present, it'll be shown in the 2FA dialogue in place of the default text.

## Example of use.

```php
use function WordPressdotorg\Two_Factor\Revalidation\{
	get_status as get_revalidation_status,
	get_url as get_revalidation_url,
	get_js_url as get_revalidation_js_url
};

# This is an example of a 'redirect through a 2FA revalidation screen' request. 2FA revalidation is always required.
echo '<p><a href="' . get_revalidation_url( $_SERVER['REQUEST_URI'] ) . '">Revalidate via redirect</a></p>';

# This is an example of the above, but with a JS modal instead when possible.
echo '<p><a href="' . get_revalidation_js_url( $_SERVER['REQUEST_URI'] ) . '">Revalidate via js link</a></p>';

# This is an example of a generic navigation or JS button that also triggers a 2FA revalidation modal.
echo '<p><a href="' . esc_url( $_SERVER['REQUEST_URI'] ) . '" data-2fa-required data-2fa-message="To confirm you\'re human, please validate your Two-Factor authentication">Revalidate via data attr</a></p>';

```

