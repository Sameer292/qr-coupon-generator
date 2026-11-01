<?php
/** Standalone campaign frame, independent of the site's theme navigation. */
declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

remove_action( 'wp_head', '_wp_render_title_tag', 1 );
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="preload" href="<?php echo esc_url( FM_CASH_CLAIMS_URL . 'assets/fonts/public-sans-latin.woff2' ); ?>" as="font" type="font/woff2" crossorigin />
	<title><?php esc_html_e( 'Your cash prize · Fresh Masala', 'fm-cash-claims' ); ?></title>
	<?php wp_head(); ?>
</head>
<body class="fm-cash-campaign">
<?php wp_body_open(); ?>
<header class="fm-claim-header">
	<a class="fm-claim-brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php esc_attr_e( 'Fresh Masala home', 'fm-cash-claims' ); ?>">
		<img class="fm-claim-logo" src="<?php echo esc_url( FM_CASH_CLAIMS_URL . 'assets/images/fresh-masala-logo.png' ); ?>" alt="Fresh Masala" width="664" height="376" fetchpriority="high" />
	</a>
	<span class="fm-claim-header-note"><img src="<?php echo esc_url( FM_CASH_CLAIMS_URL . 'assets/images/tihar-diya.svg' ); ?>" alt="" width="32" height="32" /><?php esc_html_e( 'A little light. A little joy.', 'fm-cash-claims' ); ?></span>
</header>
