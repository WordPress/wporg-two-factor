<div
	<?php echo get_block_wrapper_attributes(); ?>
	data-user-id="<?php echo esc_attr( $block->attributes['userId'] ); ?>"
	data-is-onboarding="<?php echo esc_attr( $block->attributes['isOnboarding'] ? 'true' : 'false' ); ?>"
	>
	<div class="initial-load">
		Loading ...
	</div>
</div>
