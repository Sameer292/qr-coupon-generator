<?php
/**
 * Plugin Name:       FM Cash Claims
 * Plugin URI:        https://freshmasala.com.np
 * Description:       Imports cash-prize coupon manifests, validates QR claims, stores claimant details, and provides a manual end-of-day payout dashboard.
 * Version:           1.0.0
 * Requires at least: 6.2
 * Requires PHP:      8.1
 * Author:            Fresh Masala
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       fm-cash-claims
 * Domain Path:       /languages
 *
 * @package FM_Cash_Claims
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'FM_CASH_CLAIMS_VERSION', '1.0.0' );
define( 'FM_CASH_CLAIMS_FILE', __FILE__ );
define( 'FM_CASH_CLAIMS_DIR', plugin_dir_path( __FILE__ ) );
define( 'FM_CASH_CLAIMS_URL', plugin_dir_url( __FILE__ ) );

require_once FM_CASH_CLAIMS_DIR . 'includes/class-util.php';
require_once FM_CASH_CLAIMS_DIR . 'includes/class-settings.php';
require_once FM_CASH_CLAIMS_DIR . 'includes/class-db.php';
require_once FM_CASH_CLAIMS_DIR . 'includes/class-importer.php';
require_once FM_CASH_CLAIMS_DIR . 'includes/class-export.php';
require_once FM_CASH_CLAIMS_DIR . 'includes/class-claim.php';
require_once FM_CASH_CLAIMS_DIR . 'includes/class-admin.php';

final class FM_Cash_Claims_Plugin {

	private static ?self $instance = null;
	private FM_Cash_Claims_DB $db;

	private function __construct() {
		$this->db = new FM_Cash_Claims_DB();
	}

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public static function boot(): void {
		self::instance()->init();
	}

	public function init(): void {
		load_plugin_textdomain(
			'fm-cash-claims',
			false,
			dirname( plugin_basename( FM_CASH_CLAIMS_FILE ) ) . '/languages'
		);

		$this->maybe_upgrade();

		$settings = new FM_Cash_Claims_Settings();
		$settings->init();

		$importer = new FM_Cash_Claims_Importer( $this->db );
		$importer->init();

		$claim = new FM_Cash_Claims_Claim( $this->db );
		$claim->init();

		$export = new FM_Cash_Claims_Export( $this->db );
		$export->init();

		if ( is_admin() ) {
			$admin = new FM_Cash_Claims_Admin( $this->db, $importer );
			$admin->init();
		}
	}

	public static function activate(): void {
		$db = new FM_Cash_Claims_DB();
		$db->create_tables();

		FM_Cash_Claims_Settings::install_defaults();
		update_option( 'fm_cash_claims_db_version', FM_CASH_CLAIMS_VERSION );

		$claim = new FM_Cash_Claims_Claim( $db );
		$claim->register_rewrite_rules();
		flush_rewrite_rules();
	}

	public static function deactivate(): void {
		flush_rewrite_rules();
	}

	private function maybe_upgrade(): void {
		$installed = (string) get_option( 'fm_cash_claims_db_version', '' );

		if ( FM_CASH_CLAIMS_VERSION !== $installed ) {
			$this->db->create_tables();
			FM_Cash_Claims_Settings::install_defaults();
			update_option( 'fm_cash_claims_db_version', FM_CASH_CLAIMS_VERSION );
		}
	}
}

register_activation_hook( __FILE__, array( 'FM_Cash_Claims_Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'FM_Cash_Claims_Plugin', 'deactivate' ) );
add_action( 'plugins_loaded', array( 'FM_Cash_Claims_Plugin', 'boot' ) );
