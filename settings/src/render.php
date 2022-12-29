<div
	<?php echo get_block_wrapper_attributes(); ?>
	data-user-id="<?php echo esc_attr( $block->attributes['userId'] ); ?>"
	data-user-requires-two-factor="<?php echo esc_attr( $block->attributes['userRequires2fa'] ? 'true' : 'false' ); ?>"
>
	Loading...
</div>
