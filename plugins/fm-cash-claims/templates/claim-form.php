<?php
/**
 * Claim form template.
 *
 * @package FM_Cash_Claims
 *
 * @var object $coupon
 * @var object $batch
 * @var string $claim_url
 * @var string $nonce
 * @var string $prize_display
 * @var array  $settings
 * @var array  $errors
 * @var array  $old
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();
?>
<main class="fm-claim-page">
	<div class="fm-claim-shell">
		<div class="fm-claim-brand">
			<span class="fm-claim-brand-mark">FM</span>
			<span>
				<strong>Fresh Masala</strong>
				<small>Cash Prize Campaign</small>
			</span>
		</div>

		<section class="fm-claim-card" aria-labelledby="fm-claim-title">
			<div class="fm-claim-prize">
				<span class="fm-claim-eyebrow">Your coupon is worth</span>
				<strong><?php echo esc_html( $prize_display ); ?></strong>
				<span class="fm-claim-prize-caption">Cash prize</span>
			</div>

			<h1 id="fm-claim-title"><?php esc_html_e( 'Claim your cash prize', 'fm-cash-claims' ); ?></h1>
			<p class="fm-claim-intro">
				<?php esc_html_e( 'Enter your details below. The first complete claim submission wins. Payment is made manually at the end of the day.', 'fm-cash-claims' ); ?>
			</p>

			<div class="fm-claim-meta">
				<div>
					<span><?php esc_html_e( 'Coupon code', 'fm-cash-claims' ); ?></span>
					<strong><?php echo esc_html( (string) $coupon->coupon_code ); ?></strong>
				</div>
				<div>
					<span><?php esc_html_e( 'Batch', 'fm-cash-claims' ); ?></span>
					<strong><?php echo esc_html( (string) $batch->batch_id ); ?></strong>
				</div>
			</div>

			<?php if ( array() !== $errors ) : ?>
				<div class="fm-claim-alert fm-claim-alert-error" role="alert">
					<strong><?php esc_html_e( 'Please check the form:', 'fm-cash-claims' ); ?></strong>
					<ul>
						<?php foreach ( $errors as $error ) : ?>
							<li><?php echo esc_html( (string) $error ); ?></li>
						<?php endforeach; ?>
					</ul>
				</div>
			<?php endif; ?>

			<form class="fm-claim-form" method="post" action="<?php echo esc_url( $claim_url ); ?>">
				<input type="hidden" name="fm_cash_nonce" value="<?php echo esc_attr( $nonce ); ?>" />

				<div class="fm-claim-honeypot" aria-hidden="true">
					<label>
						<?php esc_html_e( 'Website', 'fm-cash-claims' ); ?>
						<input type="text" name="website" value="" tabindex="-1" autocomplete="off" />
					</label>
				</div>

				<label class="fm-claim-field">
					<span><?php esc_html_e( 'Full name', 'fm-cash-claims' ); ?> <b>*</b></span>
					<input
						type="text"
						name="claimant_name"
						value="<?php echo esc_attr( (string) ( $old['claimant_name'] ?? '' ) ); ?>"
						maxlength="120"
						autocomplete="name"
						required
					/>
				</label>

				<label class="fm-claim-field">
					<span><?php esc_html_e( 'Mobile number', 'fm-cash-claims' ); ?> <b>*</b></span>
					<input
						type="tel"
						name="claimant_phone"
						value="<?php echo esc_attr( (string) ( $old['claimant_phone'] ?? '' ) ); ?>"
						maxlength="20"
						inputmode="numeric"
						autocomplete="tel"
						placeholder="9801234567"
						required
					/>
					<small><?php esc_html_e( 'Use the number where you can be reached for payout.', 'fm-cash-claims' ); ?></small>
				</label>

				<label class="fm-claim-field">
					<span><?php esc_html_e( 'PAN number', 'fm-cash-claims' ); ?> <em><?php esc_html_e( 'Optional', 'fm-cash-claims' ); ?></em></span>
					<input
						type="text"
						name="claimant_pan"
						value="<?php echo esc_attr( (string) ( $old['claimant_pan'] ?? '' ) ); ?>"
						maxlength="20"
						inputmode="numeric"
						autocomplete="off"
						placeholder="<?php esc_attr_e( '9 digits', 'fm-cash-claims' ); ?>"
					/>
					<small><?php esc_html_e( 'Provide it only if you want it recorded for payout or tax purposes.', 'fm-cash-claims' ); ?></small>
				</label>

				<label class="fm-claim-check">
					<input type="checkbox" name="terms" value="1" <?php checked( ! empty( $old['terms'] ) ); ?> required />
					<span><?php echo wp_kses_post( nl2br( esc_html( (string) $settings['terms_text'] ) ) ); ?></span>
				</label>

				<button type="submit" class="fm-claim-submit">
					<?php esc_html_e( 'Submit claim', 'fm-cash-claims' ); ?>
				</button>
			</form>

			<p class="fm-claim-footnote">
				<?php esc_html_e( 'Keep this coupon and your claim reference. Only one claim is allowed per coupon.', 'fm-cash-claims' ); ?>
			</p>

			<?php if ( ! empty( $settings['support_phone'] ) || ! empty( $settings['support_email'] ) || ! empty( $settings['support_address'] ) ) : ?>
				<div class="fm-claim-support">
					<strong><?php esc_html_e( 'Need help?', 'fm-cash-claims' ); ?></strong>
					<span>
						<?php if ( ! empty( $settings['support_phone'] ) ) : ?>
							<?php echo esc_html( (string) $settings['support_phone'] ); ?>
						<?php endif; ?>
						<?php if ( ! empty( $settings['support_phone'] ) && ! empty( $settings['support_email'] ) ) : ?>
							<span aria-hidden="true"> · </span>
						<?php endif; ?>
						<?php if ( ! empty( $settings['support_email'] ) ) : ?>
							<a href="mailto:<?php echo esc_attr( antispambot( (string) $settings['support_email'] ) ); ?>"><?php echo esc_html( antispambot( (string) $settings['support_email'] ) ); ?></a>
						<?php endif; ?>
					</span>
					<?php if ( ! empty( $settings['support_address'] ) ) : ?>
						<span class="fm-claim-support-address"><?php echo nl2br( esc_html( (string) $settings['support_address'] ) ); ?></span>
					<?php endif; ?>
				</div>
			<?php endif; ?>
		</section>

		<p class="fm-claim-back">
			<a href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( '← Back to Fresh Masala', 'fm-cash-claims' ); ?></a>
		</p>
	</div>
</main>
<?php
get_footer();
