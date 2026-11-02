<?php
/** Campaign footer. */
declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<footer class="fm-claim-footer">
	<span>Fresh Masala</span>
	<span><?php esc_html_e( 'Keep your coupon until your payout is complete.', 'fm-cash-claims' ); ?></span>
</footer>
<?php wp_footer(); ?>
</body>
</html>
