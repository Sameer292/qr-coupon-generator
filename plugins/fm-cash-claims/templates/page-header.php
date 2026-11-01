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
	<title><?php esc_html_e( 'Your cash prize · Fresh Masala', 'fm-cash-claims' ); ?></title>
	<?php wp_head(); ?>
</head>
<body class="fm-cash-campaign">
<?php wp_body_open(); ?>
<header class="fm-claim-header">
	<a class="fm-claim-brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php esc_attr_e( 'Fresh Masala home', 'fm-cash-claims' ); ?>">
		<svg class="fm-claim-brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 3 29 15 42 8 35 21 47 24 35 29 42 42 29 35 24 47 19 35 6 42 13 29 1 24 13 19 6 6 19 13Z" fill="currentColor"/><circle cx="24" cy="24" r="5" fill="#f8f4ec"/></svg>
		<span><strong>Fresh Masala</strong><small><?php esc_html_e( 'A little more to celebrate.', 'fm-cash-claims' ); ?></small></span>
	</a>
	<span class="fm-claim-header-note"><?php esc_html_e( 'Cash prize campaign', 'fm-cash-claims' ); ?></span>
</header>
