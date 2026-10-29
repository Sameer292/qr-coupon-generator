<?php
/**
 * Customer Verification Error & Status Template.
 *
 * @package FM_Festive_Draw
 *
 * @var string      $title          Page/Card Title.
 * @var string      $message        Primary message.
 * @var string|null $coupon_code    Coupon code if already used.
 * @var string|null $activated_time Formatted activation date/time if already used.
 * @var string|null $masked_phone   Masked phone number if already used.
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$is_already_used = ! empty( $coupon_code );
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
	<meta name="referrer" content="no-referrer">
	<meta name="robots" content="noindex, nofollow">
	<title><?php echo esc_html( $title ?? __( 'Coupon Verification — Fresh Masala', 'fm-festive-draw' ) ); ?></title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="<?php echo esc_url( FM_FESTIVE_DRAW_URL . 'assets/css/verify.css?v=' . FM_FESTIVE_DRAW_VERSION ); ?>">
</head>
<body class="fm-body">
	<main class="fm-container">
		<!-- Header / Branding -->
		<header class="fm-header">
			<div class="fm-brand-badge"><?php esc_html_e( 'FESTIVE LUCKY DRAW 2083', 'fm-festive-draw' ); ?></div>
			<h1 class="fm-main-title"><?php esc_html_e( 'Fresh Masala', 'fm-festive-draw' ); ?></h1>
		</header>

		<div class="fm-card-state <?php echo $is_already_used ? 'fm-state-warning' : 'fm-state-error'; ?>">
			<div class="fm-state-icon">
				<?php if ( $is_already_used ) : ?>
					<span>&#9888;</span>
				<?php else : ?>
					<span>&#10005;</span>
				<?php endif; ?>
			</div>

			<h2 class="fm-state-title">
				<?php echo esc_html( $title ?? ( $is_already_used ? __( 'Coupon Already Entered', 'fm-festive-draw' ) : __( 'Invalid Coupon', 'fm-festive-draw' ) ) ); ?>
			</h2>

			<p class="fm-state-message">
				<?php echo esc_html( $message ?? ( $is_already_used ? __( 'This coupon has already been entered.', 'fm-festive-draw' ) : __( 'Invalid or unrecognized coupon. Please verify your printed card or QR code.', 'fm-festive-draw' ) ) ); ?>
			</p>

			<?php if ( $is_already_used ) : ?>
				<div class="fm-summary-box" style="margin-top:20px;">
					<div class="fm-summary-row">
						<span class="fm-summary-label"><?php esc_html_e( 'Coupon Code:', 'fm-festive-draw' ); ?></span>
						<strong class="fm-summary-val fm-code-highlight"><?php echo esc_html( $coupon_code ); ?></strong>
					</div>
					<div class="fm-summary-row">
						<span class="fm-summary-label"><?php esc_html_e( 'Registered On:', 'fm-festive-draw' ); ?></span>
						<span class="fm-summary-val"><?php echo esc_html( $activated_time ?? '&mdash;' ); ?></span>
					</div>
					<div class="fm-summary-row">
						<span class="fm-summary-label"><?php esc_html_e( 'Registered By Phone:', 'fm-festive-draw' ); ?></span>
						<span class="fm-summary-val"><code><?php echo esc_html( $masked_phone ?? '**********' ); ?></code></span>
					</div>
				</div>
				<p class="fm-help-text" style="margin-top:15px;">
					<?php esc_html_e( 'If you believe this is an error, please retain your original physical scratch card and contact customer support.', 'fm-festive-draw' ); ?>
				</p>
			<?php endif; ?>

			<div class="fm-action-wrap" style="margin-top:24px;">
				<a href="https://freshmasala.com.np" class="fm-btn-outline" target="_blank" rel="noopener noreferrer">
					<?php esc_html_e( 'Visit Fresh Masala Official Website', 'fm-festive-draw' ); ?> &rarr;
				</a>
			</div>
		</div>

		<footer class="fm-footer">
			<p><?php esc_html_e( 'Fresh Masala Pure Spices &bull; Kathmandu, Nepal', 'fm-festive-draw' ); ?></p>
		</footer>
	</main>
</body>
</html>
