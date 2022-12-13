<?php

namespace WordPressdotorg\Two_Factor;

defined( 'WPINC' ) || die();

add_action( 'init', __NAMESPACE__ . '\register_block' );

/**
 * Registers the block
 */
function register_block() {
	register_block_type( __DIR__ . '/build' );
}
