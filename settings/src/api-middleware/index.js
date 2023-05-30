/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';

/**
 * Internal dependencies
 */
import revalidationHandler from './revalidation-handler';

// Set up API middleware.
apiFetch.use( revalidationHandler );
