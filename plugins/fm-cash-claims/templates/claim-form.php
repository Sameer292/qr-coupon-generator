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
 * @var array  $settings
 * @var array  $errors
 * @var array  $old
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require FM_CASH_CLAIMS_DIR . 'templates/page-header.php';
?>
<main class="fm-claim-page">
	<div class="fm-claim-shell fm-claim-layout">
		<section class="fm-claim-story" aria-labelledby="fm-claim-title">
			<h1 id="fm-claim-title"><?php esc_html_e( 'A little spice.', 'fm-cash-claims' ); ?><br /><?php esc_html_e( 'A big surprise.', 'fm-cash-claims' ); ?></h1>
			<p><?php esc_html_e( 'Your Fresh Masala coupon has a cash prize waiting. Tell us a little about yourself to reveal it.', 'fm-cash-claims' ); ?></p>
			<div class="fm-mystery-ticket" aria-hidden="true">
				<span>Fresh Masala</span>
				<div class="fm-ticket-amount">?</div>
				<strong><?php esc_html_e( 'A delicious little mystery.', 'fm-cash-claims' ); ?></strong>
				<small><?php esc_html_e( 'Yours to unwrap.', 'fm-cash-claims' ); ?></small>
			</div>
			<p class="fm-claim-story-note"><?php esc_html_e( 'One coupon. One claim. A moment worth celebrating.', 'fm-cash-claims' ); ?></p>
		</section>

		<section class="fm-claim-card" aria-labelledby="fm-details-title">
			<div class="fm-claim-coupon"><span><?php esc_html_e( 'Your coupon', 'fm-cash-claims' ); ?></span><strong><?php echo esc_html( (string) $coupon->coupon_code ); ?></strong></div>
			<h2 id="fm-details-title"><?php esc_html_e( 'Make it yours.', 'fm-cash-claims' ); ?></h2>
			<p class="fm-claim-intro">
				<?php esc_html_e( 'Submit your details to claim your coupon and reveal your prize.', 'fm-cash-claims' ); ?>
			</p>

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
						minlength="2"
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
						aria-describedby="fm-phone-help"
						required
					/>
					<small id="fm-phone-help"><?php esc_html_e( 'We will use this number to arrange your payout.', 'fm-cash-claims' ); ?></small>
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
						aria-describedby="fm-pan-help"
					/>
					<small id="fm-pan-help"><?php esc_html_e( 'Only if needed for your payout or tax records.', 'fm-cash-claims' ); ?></small>
				</label>

				<label class="fm-claim-check">
					<input type="checkbox" name="terms" value="1" <?php checked( ! empty( $old['terms'] ) ); ?> required />
					<span><?php echo wp_kses_post( nl2br( esc_html( (string) $settings['terms_text'] ) ) ); ?></span>
				</label>

				<button type="submit" class="fm-claim-submit" data-fm-submitting="<?php esc_attr_e( 'Securing your claim…', 'fm-cash-claims' ); ?>">
					<span><?php esc_html_e( 'Claim & reveal my prize', 'fm-cash-claims' ); ?></span><span aria-hidden="true">↗</span>
				</button>
			</form>

			<p class="fm-claim-footnote">
				<?php esc_html_e( 'Your amount stays a surprise until your claim is saved.', 'fm-cash-claims' ); ?>
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

	</div>
</main>
<?php
require FM_CASH_CLAIMS_DIR . 'templates/page-footer.php';
