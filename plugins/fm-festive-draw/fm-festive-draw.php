<?php
/**
 * Plugin Name:       Fresh Masala Festive Draw
 * Plugin URI:        https://freshmasala.com.np
 * Description:       Self-contained coupon verification and weekly prize draw campaign manager for Fresh Masala printed coupons.
 * Version:           1.0.0
 * Requires at least: 6.4
 * Requires PHP:      8.1
 * Author:            Fresh Masala
 * Author URI:        https://freshmasala.com.np
 * License:           GPL-2.0-or-later
 * Text Domain:       fm-festive-draw
 * Domain Path:       /languages
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Plugin Constants.
define( 'FM_FESTIVE_DRAW_VERSION', '1.0.0' );
define( 'FM_FESTIVE_DRAW_FILE', __FILE__ );
define( 'FM_FESTIVE_DRAW_DIR', plugin_dir_path( __FILE__ ) );
define( 'FM_FESTIVE_DRAW_URL', plugin_dir_url( __FILE__ ) );
define( 'FM_FESTIVE_DRAW_BASENAME', plugin_basename( __FILE__ ) );

// Require include classes.
require_once FM_FESTIVE_DRAW_DIR . 'includes/class-db.php';
require_once FM_FESTIVE_DRAW_DIR . 'includes/class-importer.php';
require_once FM_FESTIVE_DRAW_DIR . 'includes/class-verify.php';
require_once FM_FESTIVE_DRAW_DIR . 'includes/class-admin.php';
require_once FM_FESTIVE_DRAW_DIR . 'includes/class-draw.php';

/**
 * Main plugin orchestration class.
 */
final class FM_Festive_Draw {

	/**
	 * Singleton instance.
	 *
	 * @var FM_Festive_Draw|null
	 */
	private static ?FM_Festive_Draw $instance = null;

	/**
	 * Database handler.
	 *
	 * @var FM_DB
	 */
	public FM_DB $db;

	/**
	 * Importer handler.
	 *
	 * @var FM_Importer
	 */
	public FM_Importer $importer;

	/**
	 * Verification handler.
	 *
	 * @var FM_Verify
	 */
	public FM_Verify $verify;

	/**
	 * Admin handler.
	 *
	 * @var FM_Admin
	 */
	public FM_Admin $admin;

	/**
	 * Draw tool handler.
	 *
	 * @var FM_Draw
	 */
	public FM_Draw $draw;

	/**
	 * Get singleton instance.
	 *
	 * @return FM_Festive_Draw
	 */
	public static function instance(): FM_Festive_Draw {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		$this->db       = new FM_DB();
		$this->importer = new FM_Importer( $this->db );
		$this->verify   = new FM_Verify( $this->db );
		$this->admin    = new FM_Admin( $this->db );
		$this->draw     = new FM_Draw( $this->db );

		$this->init_hooks();
	}

	/**
	 * Hook registrations.
	 */
	private function init_hooks(): void {
		register_activation_hook( FM_FESTIVE_DRAW_FILE, [ $this, 'activate' ] );
		register_deactivation_hook( FM_FESTIVE_DRAW_FILE, [ $this, 'deactivate' ] );

		add_action( 'plugins_loaded', [ $this, 'on_plugins_loaded' ] );
	}

	/**
	 * Activation hook handler.
	 */
	public function activate(): void {
		$this->db->create_tables();
		$this->db->seed_default_settings();
		$this->verify->register_rewrite_rules();
		flush_rewrite_rules();
	}

	/**
	 * Deactivation hook handler.
	 */
	public function deactivate(): void {
		flush_rewrite_rules();
	}

	/**
	 * Runs on plugins_loaded.
	 */
	public function on_plugins_loaded(): void {
		load_plugin_textdomain( 'fm-festive-draw', false, dirname( FM_FESTIVE_DRAW_BASENAME ) . '/languages' );
	}
}

/**
 * Returns the main plugin instance.
 *
 * @return FM_Festive_Draw
 */
function fm_festive_draw(): FM_Festive_Draw {
	return FM_Festive_Draw::instance();
}

// Global Campaign Helpers.

/**
 * Returns active week number (1-4) or null if campaign is outside window.
 * All date checks are evaluated against wp_timezone() (Nepal UTC+5:45).
 *
 * @return int|null
 */
function fm_current_week(): ?int {
	$weeks = get_option( 'fm_campaign_weeks', [] );
	if ( empty( $weeks ) || ! is_array( $weeks ) ) {
		return null;
	}

	$tz  = wp_timezone();
	$now = new DateTimeImmutable( 'now', $tz );

	for ( $w = 1; $w <= 4; $w++ ) {
		if ( empty( $weeks[ $w ] ) ) {
			continue;
		}

		$start_str = $weeks[ $w ]['start_datetime'] ?? '';
		$end_str   = $weeks[ $w ]['end_datetime'] ?? '';

		if ( empty( $start_str ) || empty( $end_str ) ) {
			continue;
		}

		try {
			$start = new DateTimeImmutable( $start_str, $tz );
			$end   = new DateTimeImmutable( $end_str, $tz );

			if ( $now >= $start && $now <= $end ) {
				return $w;
			}
		} catch ( Exception $e ) {
			continue;
		}
	}

	return null;
}

/**
 * Get configuration array for a specific week or all weeks.
 *
 * @param int|null $week_number 1-4, or null for all weeks.
 * @return array
 */
function fm_get_week_config( ?int $week_number = null ): array {
	$weeks = get_option( 'fm_campaign_weeks', [] );
	if ( null === $week_number ) {
		return $weeks;
	}
	return $weeks[ $week_number ] ?? [];
}

// Instantiate.
fm_festive_draw();
