<?php
/**
 * Successful claim template.
 *
 * @package FM_Cash_Claims
 *
 * @var object $coupon
 * @var object $claim
 * @var object $batch
 * @var string $claim_url
 * @var string $prize_display
 * @var array  $settings
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$submitted_display = get_date_from_gmt( (string) $claim->claimed_at, 'M j, Y g:i A' );

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

		<section class="fm-claim-card fm-claim-card-success" aria-labelledby="fm-claim-title">
			<div class="fm-claim-success-icon" aria-hidden="true">✓</div>
			<p class="fm-claim-eyebrow fm-claim-eyebrow-dark"><?php esc_html_e( 'Claim recorded', 'fm-cash-claims' ); ?></p>
			<h1 id="fm-claim-title"><?php esc_html_e( 'Your cash prize is locked in', 'fm-cash-claims' ); ?></h1>
			<p class="fm-claim-intro">
				<?php
				printf(
					/* translators: %s: claimant name */
					esc_html__( 'Thank you, %s. Your claim was the first complete submission for this coupon.', 'fm-cash-claims' ),
					esc_html( (string) $claim->claimant_name )
				);
				?>
			</p>

			<div class="fm-claim-prize fm-claim-prize-compact">
				<span class="fm-claim-eyebrow"><?php esc_html_e( 'Your prize', 'fm-cash-claims' ); ?></span>
				<strong><?php echo esc_html( $prize_display ); ?></strong>
				<span class="fm-claim-prize-caption"><?php esc_html_e( 'Cash prize', 'fm-cash-claims' ); ?></span>
			</div>

			<dl class="fm-claim-details">
				<div>
					<dt><?php esc_html_e( 'Claim reference', 'fm-cash-claims' ); ?></dt>
					<dd class="fm-claim-ref"><?php echo esc_html( (string) $claim->claim_ref ); ?></dd>
				</div>
				<div>
					<dt><?php esc_html_e( 'Coupon code', 'fm-cash-claims' ); ?></dt>
					<dd><?php echo esc_html( (string) $coupon->coupon_code ); ?></dd>
				</div>
				<div>
					<dt><?php esc_html_e( 'Mobile number', 'fm-cash-claims' ); ?></dt>
					<dd><?php echo esc_html( FM_Cash_Claims_Util::mask_phone( (string) $claim->claimant_phone ) ); ?></dd>
				</div>
				<div>
					<dt><?php esc_html_e( 'Submitted', 'fm-cash-claims' ); ?></dt>
					<dd><?php echo esc_html( $submitted_display ); ?></dd>
				</div>
				<div>
					<dt><?php esc_html_e( 'Status', 'fm-cash-claims' ); ?></dt>
					<dd><span class="<?php echo esc_attr( FM_Cash_Claims_Util::status_class( 'pending' ) ); ?>"><?php echo esc_html( FM_Cash_Claims_Util::status_label( 'pending' ) ); ?></span></dd>
				</div>
			</dl>

			<div class="fm-claim-next">
				<strong><?php esc_html_e( 'What happens next?', 'fm-cash-claims' ); ?></strong>
				<ol>
					<li><?php esc_html_e( 'Our team reviews the claim and prepares the payout list.', 'fm-cash-claims' ); ?></li>
					<li><?php esc_html_e( 'Payment is made manually at the end of the day.', 'fm-cash-claims' ); ?></li>
					<li><?php esc_html_e( 'Keep your coupon and this claim reference until you are paid.', 'fm-cash-claims' ); ?></li>
				</ol>
			</div>

			<div class="fm-claim-actions">
				<button type="button" class="fm-claim-submit" data-fm-print>
					<?php esc_html_e( 'Print this confirmation', 'fm-cash-claims' ); ?>
				</button>
				<a class="fm-claim-secondary" href="<?php echo esc_url( home_url( '/' ) ); ?>">
					<?php esc_html_e( 'Back to Fresh Masala', 'fm-cash-claims' ); ?>
				</a>
			</div>

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
get_footer();
