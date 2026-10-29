<?php
/**
 * Database schema, table installation, and IP helpers.
 *
 * @package FM_Festive_Draw
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles database schema creation and access helpers.
 */
class FM_DB {

	/**
	 * Table name for coupons without prefix.
	 */
	public const TABLE_COUPONS = 'fm_coupons';

	/**
	 * Table name for scan audit logs without prefix.
	 */
	public const TABLE_SCAN_LOG = 'fm_scan_log';

	/**
	 * Get full table name for coupons.
	 *
	 * @return string
	 */
	public function get_coupons_table(): string {
		global $wpdb;
		return $wpdb->prefix . self::TABLE_COUPONS;
	}

	/**
	 * Get full table name for scan logs.
	 *
	 * @return string
	 */
	public function get_scan_log_table(): string {
		global $wpdb;
		return $wpdb->prefix . self::TABLE_SCAN_LOG;
	}

	/**
	 * Create database tables using dbDelta.
	 */
	public function create_tables(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();
		$coupons_table   = $this->get_coupons_table();
		$scan_log_table  = $this->get_scan_log_table();

		// Coupons table schema.
		$sql_coupons = "CREATE TABLE {$coupons_table} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  coupon_code varchar(20) NOT NULL,
  qr_token varchar(64) NOT NULL,
  batch_id varchar(50) NOT NULL,
  status enum('issued','activated','won','claimed','void') NOT NULL DEFAULT 'issued',
  week_number tinyint(3) unsigned DEFAULT NULL,
  participant_name varchar(120) DEFAULT NULL,
  participant_phone varchar(30) DEFAULT NULL,
  generated_at datetime NOT NULL,
  activated_at datetime DEFAULT NULL,
  activated_ip varbinary(16) DEFAULT NULL,
  created_at datetime NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY coupon_code (coupon_code),
  UNIQUE KEY qr_token (qr_token),
  KEY status (status),
  KEY week_number (week_number),
  KEY participant_phone (participant_phone)
) {$charset_collate};";

		// Scan audit log table schema.
		$sql_scan_log = "CREATE TABLE {$scan_log_table} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  qr_token varchar(64) NOT NULL,
  ip_address varbinary(16) NOT NULL,
  user_agent varchar(255) DEFAULT NULL,
  result varchar(30) NOT NULL,
  scanned_at datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY qr_token (qr_token),
  KEY ip_address (ip_address),
  KEY scanned_at (scanned_at)
) {$charset_collate};";

		dbDelta( $sql_coupons );
		dbDelta( $sql_scan_log );
	}

	/**
	 * Converts an IP address (IPv4 or IPv6) to 16-byte binary representation.
	 *
	 * @param string|null $ip String IP address.
	 * @return string|null Binary IP, or null on failure.
	 */
	public function ip_to_binary( ?string $ip ): ?string {
		if ( empty( $ip ) ) {
			return null;
		}

		$binary = @inet_pton( trim( $ip ) );
		if ( false === $binary ) {
			return null;
		}

		// If IPv4 (4 bytes), inet_pton returns 4 bytes which fits in varbinary(16).
		return $binary;
	}

	/**
	 * Converts binary representation back to human-readable IP address.
	 *
	 * @param string|null $binary Binary IP address.
	 * @return string|null String IP, or null on failure.
	 */
	public function binary_to_ip( ?string $binary ): ?string {
		if ( empty( $binary ) ) {
			return null;
		}

		$ip = @inet_ntop( $binary );
		return false !== $ip ? $ip : null;
	}

	/**
	 * Detects the client IP address from server headers.
	 *
	 * @return string
	 */
	public function get_client_ip(): string {
		$headers = [
			'HTTP_CF_CONNECTING_IP',
			'HTTP_X_FORWARDED_FOR',
			'HTTP_CLIENT_IP',
			'REMOTE_ADDR',
		];

		foreach ( $headers as $header ) {
			if ( ! empty( $_SERVER[ $header ] ) ) {
				$ip_list = explode( ',', (string) $_SERVER[ $header ] );
				$ip      = trim( $ip_list[0] );
				if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) {
					return $ip;
				}
			}
		}

		return '127.0.0.1';
	}

	/**
	 * Records an entry into the scan audit log.
	 *
	 * @param string      $qr_token   Scanned QR token (or partial/raw token string).
	 * @param string      $result     Scan result code.
	 * @param string|null $ip         Client IP address.
	 * @param string|null $user_agent Client user agent.
	 * @return bool
	 */
	public function log_scan( string $qr_token, string $result, ?string $ip = null, ?string $user_agent = null ): bool {
		global $wpdb;

		if ( null === $ip ) {
			$ip = $this->get_client_ip();
		}
		if ( null === $user_agent ) {
			$user_agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? substr( (string) $_SERVER['HTTP_USER_AGENT'], 0, 255 ) : '';
		}

		$binary_ip = $this->ip_to_binary( $ip );
		if ( null === $binary_ip ) {
			$binary_ip = $this->ip_to_binary( '127.0.0.1' );
		}

		$table_name = $this->get_scan_log_table();

		// Use prepared statement with binary data.
		$scanned_at = current_time( 'mysql' );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$inserted = $wpdb->query(
			$wpdb->prepare(
				"INSERT INTO {$table_name} (qr_token, ip_address, user_agent, result, scanned_at) VALUES (%s, %s, %s, %s, %s)", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				substr( $qr_token, 0, 64 ),
				$binary_ip,
				$user_agent,
				$result,
				$scanned_at
			)
		);

		return false !== $inserted;
	}

	/**
	 * Seed default campaign week settings if not already defined.
	 */
	public function seed_default_settings(): void {
		$existing = get_option( 'fm_campaign_weeks', null );
		if ( null !== $existing && is_array( $existing ) && ! empty( $existing ) ) {
			return;
		}

		$tz  = wp_timezone();
		$now = new DateTimeImmutable( 'now', $tz );

		// Configure 4 default consecutive weeks starting from this week.
		$defaults = [
			1 => [
				'title'          => 'Week 1 — Kitchen & Culinary Delights',
				'start_datetime' => $now->format( 'Y-m-d 00:00:00' ),
				'end_datetime'   => $now->modify( '+6 days' )->format( 'Y-m-d 23:59:59' ),
				'prizes'         => "1x Premium Mixer Grinder (750W)\n2x Digital Air Fryer (4.5L)\n5x Fresh Masala Mega Spice Gift Hamper\n10x Non-Stick Cookware Set",
				'winner_count'   => 5,
			],
			2 => [
				'title'          => 'Week 2 — Home & Comfort',
				'start_datetime' => $now->modify( '+7 days' )->format( 'Y-m-d 00:00:00' ),
				'end_datetime'   => $now->modify( '+13 days' )->format( 'Y-m-d 23:59:59' ),
				'prizes'         => "1x 43\" 4K Smart LED TV\n2x Robotic Vacuum Cleaner\n5x Luxury Comforter & Bedding Set\n10x Electric Kettle & Blender Combo",
				'winner_count'   => 5,
			],
			3 => [
				'title'          => 'Week 3 — Festive Electronics',
				'start_datetime' => $now->modify( '+14 days' )->format( 'Y-m-d 00:00:00' ),
				'end_datetime'   => $now->modify( '+20 days' )->format( 'Y-m-d 23:59:59' ),
				'prizes'         => "1x 32L Convection Microwave Oven\n2x Smart Fitness Watch\n5x Induction Cooktop with Kadai\n10x Fresh Masala Golden Hamper",
				'winner_count'   => 5,
			],
			4 => [
				'title'          => 'Week 4 — Grand Bumper Mega Draw',
				'start_datetime' => $now->modify( '+21 days' )->format( 'Y-m-d 00:00:00' ),
				'end_datetime'   => $now->modify( '+27 days' )->format( 'Y-m-d 23:59:59' ),
				'prizes'         => "1x Grand Prize: Electric Smart Scooter\n1x Double Door Frost-Free Refrigerator\n1x 8kg Fully Automatic Front-Load Washing Machine\n5x Gold Coin (1 Tola 24K)\n10x Special Festive Cash Vouchers (Rs. 10,000)",
				'winner_count'   => 10,
			],
		];

		update_option( 'fm_campaign_weeks', $defaults );
	}

	/**
	 * Completely resets all coupon database records, scan logs, and weekly draw winner records.
	 *
	 * @return array{coupons_deleted: int, logs_deleted: int}
	 */
	public function reset_all_data(): array {
		global $wpdb;

		$coupons_table  = $this->get_coupons_table();
		$scan_log_table = $this->get_scan_log_table();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$coupons_deleted = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$coupons_table}" );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$logs_deleted    = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$scan_log_table}" );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$wpdb->query( "TRUNCATE TABLE {$coupons_table}" );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$wpdb->query( "TRUNCATE TABLE {$scan_log_table}" );

		// Reset draw histories for all weeks
		for ( $w = 1; $w <= 4; $w++ ) {
			delete_option( "fm_draw_history_{$w}" );
		}

		delete_transient( 'fm_last_import_summary' );

		return [
			'coupons_deleted' => $coupons_deleted,
			'logs_deleted'    => $logs_deleted,
		];
	}

	/**
	 * Reset and sync campaign weeks 1-4 starting from today.
	 */
	public function sync_campaign_weeks_to_now(): void {
		$tz  = wp_timezone();
		$now = new DateTimeImmutable( 'now', $tz );

		$defaults = [
			1 => [
				'title'          => 'Week 1 — Kitchen & Culinary Delights',
				'start_datetime' => $now->format( 'Y-m-d 00:00:00' ),
				'end_datetime'   => $now->modify( '+6 days' )->format( 'Y-m-d 23:59:59' ),
				'prizes'         => "1x Premium Mixer Grinder (750W)\n2x Digital Air Fryer (4.5L)\n5x Fresh Masala Mega Spice Gift Hamper\n10x Non-Stick Cookware Set",
				'winner_count'   => 5,
			],
			2 => [
				'title'          => 'Week 2 — Home & Comfort',
				'start_datetime' => $now->modify( '+7 days' )->format( 'Y-m-d 00:00:00' ),
				'end_datetime'   => $now->modify( '+13 days' )->format( 'Y-m-d 23:59:59' ),
				'prizes'         => "1x 43\" 4K Smart LED TV\n2x Robotic Vacuum Cleaner\n5x Luxury Comforter & Bedding Set\n10x Electric Kettle & Blender Combo",
				'winner_count'   => 5,
			],
			3 => [
				'title'          => 'Week 3 — Festive Electronics',
				'start_datetime' => $now->modify( '+14 days' )->format( 'Y-m-d 00:00:00' ),
				'end_datetime'   => $now->modify( '+20 days' )->format( 'Y-m-d 23:59:59' ),
				'prizes'         => "1x 32L Convection Microwave Oven\n2x Smart Fitness Watch\n5x Induction Cooktop with Kadai\n10x Fresh Masala Golden Hamper",
				'winner_count'   => 5,
			],
			4 => [
				'title'          => 'Week 4 — Grand Bumper Mega Draw',
				'start_datetime' => $now->modify( '+21 days' )->format( 'Y-m-d 00:00:00' ),
				'end_datetime'   => $now->modify( '+27 days' )->format( 'Y-m-d 23:59:59' ),
				'prizes'         => "1x Grand Prize: Electric Smart Scooter\n1x Double Door Frost-Free Refrigerator\n1x 8kg Fully Automatic Front-Load Washing Machine\n5x Gold Coin (1 Tola 24K)\n10x Special Festive Cash Vouchers (Rs. 10,000)",
				'winner_count'   => 10,
			],
		];

		update_option( 'fm_campaign_weeks', $defaults );
	}
}
