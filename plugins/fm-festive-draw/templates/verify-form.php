<?php
/**
 * Customer Verification & Activation Form Template.
 *
 * @package FM_Festive_Draw
 *
 * @var array       $coupon       Coupon row data.
 * @var int         $current_week Active week number (1-4).
 * @var string      $week_title   Week title/theme.
 * @var array       $prizes       Array of prize strings for current week.
 * @var string|null $error_msg    Validation error message if any.
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
	<title><?php esc_html_e( 'Festive Lucky Draw — Fresh Masala', 'fm-festive-draw' ); ?></title>
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
			<p class="fm-subtitle"><?php esc_html_e( 'Enter your coupon code into this week\'s prize draw!', 'fm-festive-draw' ); ?></p>
		</header>

		<!-- Coupon Code Card -->
		<section class="fm-coupon-display-card">
			<span class="fm-label"><?php esc_html_e( 'VERIFIED COUPON CODE', 'fm-festive-draw' ); ?></span>
			<div class="fm-coupon-code"><?php echo esc_html( $coupon['coupon_code'] ); ?></div>
			<div class="fm-status-tag">
				<span class="fm-dot"></span>
				<?php printf( esc_html__( 'Live Entry for %s', 'fm-festive-draw' ), esc_html( $week_title ) ); ?>
			</div>
		</section>

		<!-- Weekly Prizes Preview -->
		<?php if ( ! empty( $prizes ) ) : ?>
			<section class="fm-prizes-preview">
				<h2 class="fm-prizes-heading">
					<span class="fm-sparkle">✨</span>
					<?php printf( esc_html__( 'Week %d Prizes Up For Grabs:', 'fm-festive-draw' ), $current_week ); ?>
				</h2>
				<ul class="fm-prizes-list">
					<?php foreach ( $prizes as $prize ) : ?>
						<li><span class="fm-gift-icon">🎁</span> <?php echo esc_html( $prize ); ?></li>
					<?php endforeach; ?>
				</ul>
			</section>
		<?php endif; ?>

		<!-- Error alert if any -->
		<?php if ( ! empty( $error_msg ) ) : ?>
			<div class="fm-alert fm-alert-danger" role="alert">
				<strong><?php esc_html_e( 'Please check the following:', 'fm-festive-draw' ); ?></strong><br>
				<?php echo wp_kses_post( $error_msg ); ?>
			</div>
		<?php endif; ?>

		<!-- Customer Activation Form -->
		<form method="post" action="" class="fm-form" id="fm-activation-form" novalidate>
			<input type="hidden" name="fm_action" value="activate_coupon">
			<input type="hidden" name="t" value="<?php echo esc_attr( $raw_token ?? ( $_REQUEST['t'] ?? '' ) ); ?>">
			<?php wp_nonce_field( 'fm_activate_token', 'fm_nonce' ); ?>

			<div class="fm-form-group">
				<label for="participant_name" class="fm-form-label">
					<?php esc_html_e( 'Full Name', 'fm-festive-draw' ); ?> <span class="fm-req">*</span>
				</label>
				<input
					type="text"
					name="participant_name"
					id="participant_name"
					class="fm-input"
					placeholder="<?php esc_attr_e( 'e.g. Ram Bahadur Thapa', 'fm-festive-draw' ); ?>"
					value="<?php echo esc_attr( $_POST['participant_name'] ?? '' ); ?>"
					required
					minlength="2"
					maxlength="120"
					autocomplete="name"
				>
			</div>

			<div class="fm-form-group">
				<label for="participant_phone" class="fm-form-label">
					<?php esc_html_e( 'Mobile Number', 'fm-festive-draw' ); ?> <span class="fm-req">*</span>
				</label>
				<div class="fm-phone-wrap">
					<span class="fm-phone-prefix">+977</span>
					<input
						type="tel"
						name="participant_phone"
						id="participant_phone"
						class="fm-input fm-input-phone"
						placeholder="98XXXXXXXX"
						value="<?php echo esc_attr( $_POST['participant_phone'] ?? '' ); ?>"
						required
						pattern="^(\+?977[- ]?)?[9][78]\d{8}$"
						inputmode="numeric"
						autocomplete="tel"
					>
				</div>
				<small class="fm-help-text"><?php esc_html_e( 'Enter 10-digit Nepali mobile number (starts with 98 or 97)', 'fm-festive-draw' ); ?></small>
			</div>

			<div class="fm-checkbox-group">
				<label class="fm-checkbox-label">
					<input type="checkbox" name="terms_accepted" id="terms_accepted" value="1" <?php checked( ! empty( $_POST['terms_accepted'] ) ); ?> required>
					<span><?php esc_html_e( 'I am 18 years or older and accept the campaign terms & conditions.', 'fm-festive-draw' ); ?></span>
				</label>
			</div>

			<button type="submit" class="fm-submit-btn" id="fm-submit-btn">
				<span><?php esc_html_e( 'Enter Lucky Draw Now', 'fm-festive-draw' ); ?></span>
				<span class="fm-arrow">&rarr;</span>
			</button>
		</form>

		<footer class="fm-footer">
			<p><?php esc_html_e( 'Fresh Masala Pure Spices &bull; Kathmandu, Nepal', 'fm-festive-draw' ); ?></p>
			<p><small><?php esc_html_e( 'Keep your physical printed coupon safe. It must be presented along with official ID to claim any prize.', 'fm-festive-draw' ); ?></small></p>
		</footer>
	</main>

	<script src="<?php echo esc_url( FM_FESTIVE_DRAW_URL . 'assets/js/verify.js?v=' . FM_FESTIVE_DRAW_VERSION ); ?>"></script>
</body>
</html>
