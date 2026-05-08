<?php

/**
 * REST API endpoints for Account Recovery.
 */

namespace WordPressdotorg\Two_Factor\Recovery;
use Two_Factor_Core;
use WP_REST_Server, WP_REST_Request, WP_Error, WP_User;

defined( 'WPINC' ) || die();

add_action( 'rest_api_init', __NAMESPACE__ . '\register_recovery_routes' );

/**
 * Register the recovery REST API routes.
 */
function register_recovery_routes() : void {
	$namespace = 'wporg-two-factor/1.0';

	// Configuration endpoints (require authentication).

	register_rest_route(
		$namespace,
		'/recovery/designate-contact',
		[
			'methods'             => WP_REST_Server::EDITABLE,
			'callback'            => __NAMESPACE__ . '\rest_designate_contact',
			'permission_callback' => function( $request ) {
				return current_user_can( 'edit_user', (int) $request['user_id'] );
			},
			'args'                => [
				'user_id' => [
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
				'contact_login' => [
					'required' => true,
					'type'     => 'string',
					'sanitize_callback' => 'sanitize_user',
				],
			],
		]
	);

	register_rest_route(
		$namespace,
		'/recovery/remove-contact',
		[
			'methods'             => WP_REST_Server::EDITABLE,
			'callback'            => __NAMESPACE__ . '\rest_remove_contact',
			'permission_callback' => function( $request ) {
				return current_user_can( 'edit_user', (int) $request['user_id'] );
			},
			'args'                => [
				'user_id' => [
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
				'contact_id' => [
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
			],
		]
	);

	register_rest_route(
		$namespace,
		'/recovery/accept-designation',
		[
			'methods'             => WP_REST_Server::EDITABLE,
			'callback'            => __NAMESPACE__ . '\rest_accept_designation',
			'permission_callback' => function( $request ) {
				return current_user_can( 'edit_user', (int) $request['contact_id'] );
			},
			'args'                => [
				'contact_id' => [
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
				'user_id' => [
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
				'token' => [
					'required' => true,
					'type'     => 'string',
				],
			],
		]
	);

	register_rest_route(
		$namespace,
		'/recovery/decline-designation',
		[
			'methods'             => WP_REST_Server::EDITABLE,
			'callback'            => __NAMESPACE__ . '\rest_decline_designation',
			'permission_callback' => function( $request ) {
				return current_user_can( 'edit_user', (int) $request['contact_id'] );
			},
			'args'                => [
				'contact_id' => [
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
				'user_id' => [
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
				'token' => [
					'required' => true,
					'type'     => 'string',
				],
			],
		]
	);

	// Recovery flow endpoints (token-based auth, some accessible without login).

	register_rest_route(
		$namespace,
		'/recovery/request',
		[
			'methods'             => WP_REST_Server::EDITABLE,
			'callback'            => __NAMESPACE__ . '\rest_create_recovery_request',
			// Caller authenticates with the interim 2FA login nonce issued after
			// successful password validation, so the request is only reachable
			// to someone who has just signed in with the account password.
			'permission_callback' => '__return_true',
			'args'                => [
				'wp-auth-id' => [
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
				'wp-auth-nonce' => [
					'required' => true,
					'type'     => 'string',
				],
			],
		]
	);

	register_rest_route(
		$namespace,
		'/recovery/cancel',
		[
			'methods'             => WP_REST_Server::EDITABLE,
			'callback'            => __NAMESPACE__ . '\rest_cancel_recovery',
			'permission_callback' => '__return_true', // Token-based auth.
			'args'                => [
				'user_id' => [
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
				'token' => [
					'required' => true,
					'type'     => 'string',
				],
			],
		]
	);

	register_rest_route(
		$namespace,
		'/recovery/cancel-compromised',
		[
			'methods'             => WP_REST_Server::EDITABLE,
			'callback'            => __NAMESPACE__ . '\rest_cancel_recovery_compromised',
			'permission_callback' => '__return_true', // Token-based auth.
			'args'                => [
				'user_id' => [
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
				'token' => [
					'required' => true,
					'type'     => 'string',
				],
			],
		]
	);

	register_rest_route(
		$namespace,
		'/recovery/confirm-contact',
		[
			'methods'             => WP_REST_Server::EDITABLE,
			'callback'            => __NAMESPACE__ . '\rest_confirm_contact_recovery',
			'permission_callback' => function() {
				// Contact must be logged in.
				return is_user_logged_in();
			},
			'args'                => [
				'user_id' => [
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
				'token' => [
					'required' => true,
					'type'     => 'string',
				],
			],
		]
	);

	register_rest_route(
		$namespace,
		'/recovery/status',
		[
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => __NAMESPACE__ . '\rest_recovery_status',
			'permission_callback' => '__return_true', // Token-based auth.
			'args'                => [
				'user_id' => [
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
				'token' => [
					'required' => true,
					'type'     => 'string',
				],
			],
		]
	);

	register_rest_route(
		$namespace,
		'/recovery/complete',
		[
			'methods'             => WP_REST_Server::EDITABLE,
			'callback'            => __NAMESPACE__ . '\rest_complete_recovery',
			'permission_callback' => '__return_true', // Token-based auth.
			'args'                => [
				'user_id' => [
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				],
				'token' => [
					'required' => true,
					'type'     => 'string',
				],
			],
		]
	);
}

/**
 * Designate a recovery contact.
 */
function rest_designate_contact( WP_REST_Request $request ) {
	$result = designate_contact( $request['user_id'], $request['contact_login'] );

	if ( is_wp_error( $result ) ) {
		$result->add_data( [ 'status' => 400 ] );
		return $result;
	}

	return [ 'success' => true ];
}

/**
 * Remove a designated contact.
 *
 * remove_contact() returns bool, not WP_Error -- removing a non-existent
 * contact is intentionally a no-op, so there is no error path to check.
 */
function rest_remove_contact( WP_REST_Request $request ) {
	remove_contact( $request['user_id'], $request['contact_id'] );

	return [ 'success' => true ];
}

/**
 * Accept a contact designation.
 */
function rest_accept_designation( WP_REST_Request $request ) {
	$result = accept_designation( $request['contact_id'], $request['user_id'], $request['token'] );

	if ( is_wp_error( $result ) ) {
		$result->add_data( [ 'status' => 400 ] );
		return $result;
	}

	return [ 'success' => true ];
}

/**
 * Decline a contact designation.
 */
function rest_decline_designation( WP_REST_Request $request ) {
	$result = decline_designation( $request['contact_id'], $request['user_id'], $request['token'] );

	if ( is_wp_error( $result ) ) {
		$result->add_data( [ 'status' => 400 ] );
		return $result;
	}

	return [ 'success' => true ];
}

/**
 * Create a recovery request.
 *
 * Requires the interim 2FA login nonce that Two_Factor_Core issues after a
 * successful password check, so only the holder of the account password can
 * trigger the flow.
 */
function rest_create_recovery_request( WP_REST_Request $request ) {
	$user_id = (int) $request['wp-auth-id'];
	$nonce   = (string) $request['wp-auth-nonce'];

	if ( ! $user_id || ! $nonce || true !== Two_Factor_Core::verify_login_nonce( $user_id, $nonce ) ) {
		return new WP_Error( 'recovery_failed', 'Recovery request could not be processed.', [ 'status' => 400 ] );
	}

	$user = get_userdata( $user_id );
	if ( ! $user ) {
		return new WP_Error( 'recovery_failed', 'Recovery request could not be processed.', [ 'status' => 400 ] );
	}

	// Rate limiting: one request per user per hour.
	$existing = get_pending_recovery( $user_id );
	if ( $existing && ( time() - $existing['requested_at'] ) < HOUR_IN_SECONDS ) {
		return new WP_Error( 'rate_limited', 'A recovery request was recently submitted. Please wait before trying again.', [ 'status' => 429 ] );
	}

	$result = create_recovery_request( $user_id );

	if ( is_wp_error( $result ) ) {
		// Return vague error for public endpoint.
		return new WP_Error( 'recovery_failed', 'Recovery request could not be processed.', [ 'status' => 400 ] );
	}

	return [ 'success' => true ];
}

/**
 * Cancel a recovery request.
 */
function rest_cancel_recovery( WP_REST_Request $request ) {
	$result = cancel_recovery_request( $request['user_id'], $request['token'] );

	if ( is_wp_error( $result ) ) {
		$result->add_data( [ 'status' => 400 ] );
		return $result;
	}

	return [ 'success' => true ];
}

/**
 * Cancel a recovery request and report password as compromised.
 * Resets the password and destroys all sessions.
 */
function rest_cancel_recovery_compromised( WP_REST_Request $request ) {
	$result = cancel_recovery_compromised( $request['user_id'], $request['token'] );

	if ( is_wp_error( $result ) ) {
		$result->add_data( [ 'status' => 400 ] );
		return $result;
	}

	return [ 'success' => true ];
}

/**
 * Confirm a contact recovery request.
 */
function rest_confirm_contact_recovery( WP_REST_Request $request ) {
	$contact_id = get_current_user_id();

	// Contact must be authenticated with 2FA.
	if ( ! Two_Factor_Core::is_current_user_session_two_factor() ) {
		return new WP_Error( 'requires_2fa', 'You must be authenticated with two-factor authentication to confirm a recovery request.', [ 'status' => 403 ] );
	}

	$result = confirm_contact_recovery( $request['user_id'], $request['token'], $contact_id );

	if ( is_wp_error( $result ) ) {
		$result->add_data( [ 'status' => 400 ] );
		return $result;
	}

	return [ 'success' => true ];
}

/**
 * Get recovery request status.
 */
function rest_recovery_status( WP_REST_Request $request ) {
	$recovery = get_pending_recovery( $request['user_id'] );

	if ( ! $recovery ) {
		return new WP_Error( 'no_pending', 'No pending recovery request found.', [ 'status' => 404 ] );
	}

	if ( ! wp_check_password( $request['token'], $recovery['token'] ) ) {
		return new WP_Error( 'invalid_token', 'Invalid recovery token.', [ 'status' => 403 ] );
	}

	return [
		'status'       => $recovery['status'],
		'requested_at' => $recovery['requested_at'],
		'is_ready'     => 'confirmed_by_contact' === $recovery['status'],
	];
}

/**
 * Complete a recovery request.
 */
function rest_complete_recovery( WP_REST_Request $request ) {
	$result = complete_recovery( $request['user_id'], $request['token'] );

	if ( is_wp_error( $result ) ) {
		$result->add_data( [ 'status' => 400 ] );
		return $result;
	}

	return [ 'success' => true ];
}
