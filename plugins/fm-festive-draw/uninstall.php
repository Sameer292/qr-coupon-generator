<?php
/**
 * Fresh Masala Festive Draw - Plugin Uninstaller.
 *
 * Safe by default: Will NOT drop database tables or delete coupon data
 * unless explicitly enabled via the campaign settings screen.
 *
 * @package FM_Festive_Draw
 */

declare(strict_types=1);

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

$delete_all_data = (bool) get_option( 'fm_delete_data_on_uninstall', false );

if ( true === $delete_all_data ) {
	global $wpdb;

	$coupons_table  = $wpdb->prefix . 'fm_coupons';
	$scan_log_table = $wpdb->prefix . 'fm_scan_log';

	// phpcs:ignore WordPress.DB.DirectDatabaseQuery
	$wpdb->query( "DROP TABLE IF EXISTS {$coupons_table}" );
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery
	$wpdb->query( "DROP TABLE IF EXISTS {$scan_log_table}" );

	// Delete campaign options.
	delete_option( 'fm_campaign_weeks' );
	delete_option( 'fm_draw_results' );
	delete_option( 'fm_delete_data_on_uninstall' );

	// Clear rate limiting transients.
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery
	$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_fm_rl_%' OR option_name LIKE '_transient_timeout_fm_rl_%'" );
}
