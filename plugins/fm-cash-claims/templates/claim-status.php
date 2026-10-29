<?php
/**
 * Existing claim status template.
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

$status           = (string) $claim->status;
$submitted_display = get_date_from_gmt( (string) $claim->claimed_at, 'M j, Y g:i A' );
$paid_display      = ! empty( $claim->paid_at ) ? get_date_from_gmt( (string) $claim->paid_at, 'M j, Y g:i A' ) : '';

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
			<div class="fm-claim-status-hero">
				<span class="<?php echo esc_attr( FM_Cash_Claims_Util::status_class( $status ) ); ?>">
					<?php echo esc_html( FM_Cash_Claims_Util::status_label( $status ) ); ?>
				</span>
				<h1 id="fm-claim-title">
					<?php if ( 'paid' === $status ) : ?>
						<?php esc_html_e( 'This claim has been paid', 'fm-cash-claims' ); ?>
					<?php elseif ( 'rejected' === $status ) : ?>
						<?php esc_html_e( 'This claim was not approved', 'fm-cash-claims' ); ?>
					<?php else : ?>
						<?php esc_html_e( 'Your claim is already recorded', 'fm-cash-claims' ); ?>
					<?php endif; ?>
				</h1>
				<p class="fm-claim-intro">
					<?php if ( 'paid' === $status ) : ?>
						<?php esc_html_e( 'The payout for this coupon has been completed. Keep your coupon for your records.', 'fm-cash-claims' ); ?>
					<?php elseif ( 'rejected' === $status ) : ?>
						<?php esc_html_e( 'Please contact Fresh Masala support with the coupon code above if you believe this was a mistake.', 'fm-cash-claims' ); ?>
					<?php else : ?>
						<?php esc_html_e( 'Only one claim is allowed per coupon. The first complete claim submission wins, and payment is made manually at the end of the day.', 'fm-cash-claims' ); ?>
					<?php endif; ?>
				</p>
			</div>

			<div class="fm-claim-prize fm-claim-prize-compact">
				<span class="fm-claim-eyebrow"><?php esc_html_e( 'Coupon prize', 'fm-cash-claims' ); ?></span>
				<strong><?php echo esc_html( $prize_display ); ?></strong>
				<span class="fm-claim-prize-caption"><?php esc_html_e( 'Cash prize', 'fm-cash-claims' ); ?></span>
			</div>

			<dl class="fm-claim-details">
				<div>
					<dt><?php esc_html_e( 'Coupon code', 'fm-cash-claims' ); ?></dt>
					<dd><?php echo esc_html( (string) $coupon->coupon_code ); ?></dd>
				</div>
				<div>
					<dt><?php esc_html_e( 'Submitted', 'fm-cash-claims' ); ?></dt>
					<dd><?php echo esc_html( $submitted_display ); ?></dd>
				</div>
				<?php if ( '' !== $paid_display ) : ?>
					<div>
						<dt><?php esc_html_e( 'Paid', 'fm-cash-claims' ); ?></dt>
						<dd><?php echo esc_html( $paid_display ); ?></dd>
					</div>
				<?php endif; ?>
			</dl>

			<?php if ( 'pending' === $status ) : ?>
				<div class="fm-claim-next">
					<strong><?php esc_html_e( 'Pending payout', 'fm-cash-claims' ); ?></strong>
					<p><?php esc_html_e( 'Your claim is in the payout queue. Payment is made manually at the end of the day. Keep your coupon and claim reference until you are paid.', 'fm-cash-claims' ); ?></p>
				</div>
			<?php endif; ?>

			<div class="fm-claim-actions">
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
