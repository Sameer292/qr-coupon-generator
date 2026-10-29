<?php
/**
 * Claim error template.
 *
 * @package FM_Cash_Claims
 *
 * @var string $title
 * @var string $message
 * @var array  $settings
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

		<section class="fm-claim-card fm-claim-card-error" aria-labelledby="fm-claim-title">
			<div class="fm-claim-error-icon" aria-hidden="true">!</div>
			<h1 id="fm-claim-title"><?php echo esc_html( $title ); ?></h1>
			<p class="fm-claim-intro"><?php echo esc_html( $message ); ?></p>

			<?php if ( ! empty( $settings['support_phone'] ) || ! empty( $settings['support_email'] ) || ! empty( $settings['support_address'] ) ) : ?>
				<div class="fm-claim-support">
					<strong><?php esc_html_e( 'Fresh Masala support', 'fm-cash-claims' ); ?></strong>
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

			<div class="fm-claim-actions">
				<a class="fm-claim-secondary" href="<?php echo esc_url( home_url( '/' ) ); ?>">
					<?php esc_html_e( 'Back to Fresh Masala', 'fm-cash-claims' ); ?>
				</a>
			</div>
		</section>
	</div>
</main>
<?php
get_footer();
