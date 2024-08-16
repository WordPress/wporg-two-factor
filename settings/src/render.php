<div
	<?php echo get_block_wrapper_attributes(); ?>
	data-user-id="<?php echo esc_attr( $block->attributes['userId'] ); ?>"
	data-onboarding="<?php echo esc_attr( $block->attributes['onboarding'] ? 'true' : 'false' ); ?>"
	>
	<div class="initial-load">
		Loading ...
	</div>
</div>
