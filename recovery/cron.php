<?php

/**
 * WP-Cron handler for processing delayed recovery requests.
 */

namespace WordPressdotorg\Two_Factor\Recovery;

defined( 'WPINC' ) || die();

add_action( 'init', __NAMESPACE__ . '\schedule_recovery_check' );
add_action( 'wporg_2fa_process_pending_recoveries', __NAMESPACE__ . '\process_pending_recoveries' );

/**
 * Schedule the hourly cron event for processing pending recoveries.
 */
function schedule_recovery_check() : void {
	if ( ! wp_next_scheduled( 'wporg_2fa_process_pending_recoveries' ) ) {
		wp_schedule_event( time(), 'hourly', 'wporg_2fa_process_pending_recoveries' );
	}
}

/**
 * Process pending recovery requests whose waiting period has elapsed.
 *
 * Finds all users with a pending email recovery request where `available_at` has passed,
 * and sends them the "recovery available" email.
 */
function process_pending_recoveries() : void {
	global $wpdb;

	$meta_key = RECOVERY_REQUEST_META;

	// Find users with pending recovery requests.
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery
	$user_ids = $wpdb->get_col(
		$wpdb->prepare(
			"SELECT user_id FROM {$wpdb->usermeta} WHERE meta_key = %s",
			$meta_key
		)
	);

	foreach ( $user_ids as $user_id ) {
		$request = get_pending_recovery( (int) $user_id );

		if ( ! $request ) {
			continue;
		}

		// Only process email recovery requests that are pending and whose delay has elapsed.
		if ( 'email' !== $request['type'] || 'pending' !== $request['status'] ) {
			continue;
		}

		if ( time() < $request['available_at'] ) {
			continue;
		}

		// Mark as ready and send the completion email.
		$request['status'] = 'ready';
		update_user_meta( (int) $user_id, RECOVERY_REQUEST_META, $request );

		// We need the raw token to build the completion URL, but we only store hashed tokens.
		// Instead, generate a new completion token and store it.
		$completion_token = wp_generate_password( 32, false );
		$request['completion_token'] = wp_hash_password( $completion_token );
		update_user_meta( (int) $user_id, RECOVERY_REQUEST_META, $request );

		send_recovery_available_email( (int) $user_id, $request, $completion_token );
	}
}
