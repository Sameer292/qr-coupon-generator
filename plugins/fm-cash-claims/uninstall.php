<?php
/**
 * Uninstall routine. Data is kept unless the site opted in to deletion.
 *
 * @package FM_Cash_Claims
 */

declare(strict_types=1);

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

$fm_cash_settings = get_option( 'fm_cash_claims_settings', array() );

if ( ! is_array( $fm_cash_settings ) || empty( $fm_cash_settings['delete_data_on_uninstall'] ) ) {
	return;
}

global $wpdb;

$fm_cash_tables = array(
	$wpdb->prefix . 'fm_cash_scan_log',
	$wpdb->prefix . 'fm_cash_claims',
	$wpdb->prefix . 'fm_cash_coupons',
	$wpdb->prefix . 'fm_cash_prize_tiers',
	$wpdb->prefix . 'fm_cash_batches',
);

foreach ( $fm_cash_tables as $fm_cash_table ) {
	$wpdb->query( "DROP TABLE IF EXISTS {$fm_cash_table}" );
}

delete_option( 'fm_cash_claims_settings' );
delete_option( 'fm_cash_claims_db_version' );

$wpdb->query(
	"DELETE FROM {$wpdb->options}
	WHERE option_name LIKE '_transient_fm_cash_%'
		OR option_name LIKE '_transient_timeout_fm_cash_%'"
);

$fm_cash_uploads = wp_upload_dir();
$fm_cash_dir     = trailingslashit( (string) $fm_cash_uploads['basedir'] ) . 'fm-cash-imports';

if ( is_dir( $fm_cash_dir ) ) {
	$fm_cash_files = glob( trailingslashit( $fm_cash_dir ) . '*' );
	if ( is_array( $fm_cash_files ) ) {
		foreach ( $fm_cash_files as $fm_cash_file ) {
			if ( is_file( $fm_cash_file ) ) {
				@unlink( $fm_cash_file );
			}
		}
	}
	@rmdir( $fm_cash_dir );
}
