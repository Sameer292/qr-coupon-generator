<?php
/**
 * Customer Verification Success Screen Template.
 *
 * @package FM_Festive_Draw
 *
 * @var string $coupon_code   Verified coupon code (e.g. FM-00042).
 * @var int    $week_number   Campaign week (1-4).
 * @var string $week_title    Campaign week title/theme.
 * @var string $draw_date_str Formatted draw date string.
 * @var array  $prizes        Array of prize strings for that week.
 * @var string $name          Participant name.
 * @var string $phone         Participant phone.
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
	<meta name="referrer" content="no-referrer">
	<meta name="robots" content="noindex, nofollow">
	<title><?php esc_html_e( 'Entry Confirmed! — Fresh Masala Festive Draw', 'fm-festive-draw' ); ?></title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="<?php echo esc_url( FM_FESTIVE_DRAW_URL . 'assets/css/verify.css?v=' . FM_FESTIVE_DRAW_VERSION ); ?>">
</head>
<body class="fm-body">
	<main class="fm-container">
		<!-- Success Celebration Card -->
		<div class="fm-success-card">
			<div class="fm-success-icon-wrap">
				<span class="fm-check-icon">&#10003;</span>
			</div>

			<h1 class="fm-success-title"><?php esc_html_e( 'You successfully participated in the program!', 'fm-festive-draw' ); ?></h1>
			<p class="fm-success-sub"><?php esc_html_e( 'Your coupon has been officially registered in the draw.', 'fm-festive-draw' ); ?></p>

			<!-- Registration Summary Box -->
			<div class="fm-summary-box">
				<div class="fm-summary-row">
					<span class="fm-summary-label"><?php esc_html_e( 'Coupon Code:', 'fm-festive-draw' ); ?></span>
					<strong class="fm-summary-val fm-code-highlight"><?php echo esc_html( $coupon_code ); ?></strong>
				</div>
				<div class="fm-summary-row">
					<span class="fm-summary-label"><?php esc_html_e( 'Entered into:', 'fm-festive-draw' ); ?></span>
					<span class="fm-summary-val"><?php echo esc_html( $week_title ); ?></span>
				</div>
				<div class="fm-summary-row">
					<span class="fm-summary-label"><?php esc_html_e( 'Draw Date:', 'fm-festive-draw' ); ?></span>
					<span class="fm-summary-val"><?php echo esc_html( $draw_date_str ); ?></span>
				</div>
				<div class="fm-summary-row">
					<span class="fm-summary-label"><?php esc_html_e( 'Participant:', 'fm-festive-draw' ); ?></span>
					<span class="fm-summary-val"><?php echo esc_html( $name ); ?> (<?php echo esc_html( FM_Verify::mask_phone( $phone ) ); ?>)</span>
				</div>
			</div>

			<!-- Prizes List for this Week -->
			<?php if ( ! empty( $prizes ) ) : ?>
				<div class="fm-prizes-preview" style="margin-top:20px;text-align:left;">
					<h2 class="fm-prizes-heading">
						<span class="fm-sparkle">🎁</span>
						<?php printf( esc_html__( 'Prizes in %s:', 'fm-festive-draw' ), esc_html( $week_title ) ); ?>
					</h2>
					<ul class="fm-prizes-list">
						<?php foreach ( $prizes as $prize ) : ?>
							<li><?php echo esc_html( $prize ); ?></li>
						<?php endforeach; ?>
					</ul>
				</div>
			<?php endif; ?>

			<!-- Important Claim Warning -->
			<div class="fm-claim-notice">
				<div class="fm-claim-icon">&#9888;</div>
				<p>
					<strong><?php esc_html_e( 'Important Notice:', 'fm-festive-draw' ); ?></strong>
					<?php esc_html_e( 'Winners are announced on our official social media channels. Keep this coupon — you must present it to claim a prize.', 'fm-festive-draw' ); ?>
				</p>
			</div>

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
