<?php
/**
 * Database schema and claim transactions.
 *
 * @package FM_Cash_Claims
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class FM_Cash_Claims_DB {

	public function batches_table(): string {
		global $wpdb;

		return $wpdb->prefix . 'fm_cash_batches';
	}

	public function tiers_table(): string {
		global $wpdb;

		return $wpdb->prefix . 'fm_cash_prize_tiers';
	}

	public function coupons_table(): string {
		global $wpdb;

		return $wpdb->prefix . 'fm_cash_coupons';
	}

	public function claims_table(): string {
		global $wpdb;

		return $wpdb->prefix . 'fm_cash_claims';
	}

	public function scan_log_table(): string {
		global $wpdb;

		return $wpdb->prefix . 'fm_cash_scan_log';
	}

	public function create_tables(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();
		$batches         = $this->batches_table();
		$tiers           = $this->tiers_table();
		$coupons         = $this->coupons_table();
		$claims          = $this->claims_table();
		$scan_log        = $this->scan_log_table();

		$sql = array();

		$sql[] = "CREATE TABLE {$batches} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			batch_id varchar(50) NOT NULL,
			label varchar(120) NOT NULL DEFAULT '',
			currency char(3) NOT NULL DEFAULT 'NPR',
			total_coupons int(10) unsigned NOT NULL DEFAULT 0,
			total_value decimal(14,2) NOT NULL DEFAULT 0.00,
			claim_start datetime DEFAULT NULL,
			claim_end datetime DEFAULT NULL,
			status enum('active','closed','void') NOT NULL DEFAULT 'active',
			created_at datetime NOT NULL,
			updated_at datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY batch_id (batch_id),
			KEY status (status),
			KEY created_at (created_at)
		) {$charset_collate};";

		$sql[] = "CREATE TABLE {$tiers} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			batch_id varchar(50) NOT NULL,
			prize_amount decimal(14,2) NOT NULL,
			quantity int(10) unsigned NOT NULL DEFAULT 0,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY batch_tier (batch_id,prize_amount),
			KEY batch_id (batch_id)
		) {$charset_collate};";

		$sql[] = "CREATE TABLE {$coupons} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			coupon_code varchar(30) NOT NULL,
			qr_token varchar(64) NOT NULL,
			batch_id varchar(50) NOT NULL,
			prize_amount decimal(14,2) NOT NULL,
			currency char(3) NOT NULL DEFAULT 'NPR',
			status enum('issued','claimed','paid','void') NOT NULL DEFAULT 'issued',
			generated_at datetime DEFAULT NULL,
			claimed_at datetime DEFAULT NULL,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY coupon_code (coupon_code),
			UNIQUE KEY qr_token (qr_token),
			KEY batch_id (batch_id),
			KEY status (status),
			KEY prize_amount (prize_amount)
		) {$charset_collate};";

		$sql[] = "CREATE TABLE {$claims} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			claim_ref varchar(40) NOT NULL,
			coupon_id bigint(20) unsigned NOT NULL,
			coupon_code varchar(30) NOT NULL,
			batch_id varchar(50) NOT NULL,
			prize_amount decimal(14,2) NOT NULL,
			currency char(3) NOT NULL DEFAULT 'NPR',
			claimant_name varchar(120) NOT NULL,
			claimant_phone varchar(30) NOT NULL,
			claimant_pan varchar(20) DEFAULT NULL,
			status enum('pending','paid','rejected') NOT NULL DEFAULT 'pending',
			claimed_at datetime NOT NULL,
			claim_ip varchar(45) DEFAULT NULL,
			paid_at datetime DEFAULT NULL,
			paid_by bigint(20) unsigned DEFAULT NULL,
			payment_note varchar(255) DEFAULT NULL,
			rejection_reason varchar(255) DEFAULT NULL,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY claim_ref (claim_ref),
			UNIQUE KEY coupon_id (coupon_id),
			KEY status (status),
			KEY batch_id (batch_id),
			KEY claimed_at (claimed_at),
			KEY claimant_phone (claimant_phone)
		) {$charset_collate};";

		$sql[] = "CREATE TABLE {$scan_log} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			token_hash char(64) NOT NULL,
			coupon_id bigint(20) unsigned DEFAULT NULL,
			result varchar(30) NOT NULL,
			ip_address varchar(45) DEFAULT NULL,
			user_agent varchar(255) DEFAULT NULL,
			scanned_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY token_hash (token_hash),
			KEY result (result),
			KEY scanned_at (scanned_at)
		) {$charset_collate};";

		foreach ( $sql as $statement ) {
			dbDelta( $statement );
		}
	}

	public function now(): string {
		return gmdate( 'Y-m-d H:i:s' );
	}

	public function get_client_ip(): ?string {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) && is_string( $_SERVER['REMOTE_ADDR'] )
			? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) )
			: '';
		$ip = apply_filters( 'fm_cash_claims_client_ip', $ip );
		$ip = is_string( $ip ) ? $ip : '';

		return filter_var( $ip, FILTER_VALIDATE_IP ) ? $ip : null;
	}

	public function get_batch( string $batch_id ): ?object {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->batches_table()} WHERE batch_id = %s LIMIT 1",
				$batch_id
			)
		);

		return $row ?: null;
	}

	public function get_batch_by_id( int $id ): ?object {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->batches_table()} WHERE id = %d LIMIT 1",
				$id
			)
		);

		return $row ?: null;
	}

	public function get_coupon_by_token( string $token ): ?object {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->coupons_table()} WHERE qr_token = %s LIMIT 1",
				$token
			)
		);

		return $row ?: null;
	}

	public function get_coupon_by_code( string $code ): ?object {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->coupons_table()} WHERE coupon_code = %s LIMIT 1",
				$code
			)
		);

		return $row ?: null;
	}

	public function get_coupon( int $id ): ?object {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->coupons_table()} WHERE id = %d LIMIT 1",
				$id
			)
		);

		return $row ?: null;
	}

	public function get_claim_by_coupon( int $coupon_id ): ?object {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->claims_table()} WHERE coupon_id = %d LIMIT 1",
				$coupon_id
			)
		);

		return $row ?: null;
	}

	public function get_claim( int $claim_id ): ?object {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->claims_table()} WHERE id = %d LIMIT 1",
				$claim_id
			)
		);

		return $row ?: null;
	}

	public function get_claim_by_ref( string $claim_ref ): ?object {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->claims_table()} WHERE claim_ref = %s LIMIT 1",
				$claim_ref
			)
		);

		return $row ?: null;
	}

	public function get_tiers( string $batch_id ): array {
		global $wpdb;

		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$this->tiers_table()} WHERE batch_id = %s ORDER BY prize_amount ASC",
				$batch_id
			)
		) ?: array();
	}

	public function is_batch_open( object $batch ): bool {
		if ( 'active' !== (string) $batch->status ) {
			return false;
		}

		$now = $this->now();

		if ( ! empty( $batch->claim_start ) && $now < (string) $batch->claim_start ) {
			return false;
		}

		if ( ! empty( $batch->claim_end ) && $now > (string) $batch->claim_end ) {
			return false;
		}

		return true;
	}

	public function log_scan( string $token, ?int $coupon_id, string $result, ?string $ip, ?string $user_agent ): void {
		global $wpdb;

		$wpdb->insert(
			$this->scan_log_table(),
			array(
				'token_hash' => hash( 'sha256', $token ),
				'coupon_id'  => $coupon_id,
				'result'     => mb_substr( $result, 0, 30 ),
				'ip_address' => $ip,
				'user_agent' => null === $user_agent ? null : mb_substr( $user_agent, 0, 255 ),
				'scanned_at' => $this->now(),
			),
			array( '%s', '%d', '%s', '%s', '%s', '%s' )
		);
	}

	public function count_claims_for_phone( string $phone ): int {
		global $wpdb;

		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$this->claims_table()} WHERE claimant_phone = %s AND status IN ('pending','paid')",
				$phone
			)
		);
	}

	/**
	 * @return object|WP_Error Claim row on success, WP_Error on failure.
	 */
	public function create_claim(
		int $coupon_id,
		string $claimant_name,
		string $claimant_phone,
		?string $claimant_pan,
		?string $claim_ip
	): object {
		global $wpdb;

		$coupons = $this->coupons_table();
		$claims  = $this->claims_table();

		$wpdb->query( 'START TRANSACTION' );

		$coupon = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$coupons} WHERE id = %d FOR UPDATE",
				$coupon_id
			)
		);

		if ( ! $coupon ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'not_found', __( 'Coupon not found.', 'fm-cash-claims' ) );
		}

		if ( 'issued' !== (string) $coupon->status ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'already_claimed', __( 'This coupon has already been claimed.', 'fm-cash-claims' ) );
		}

		$now       = $this->now();
		$claim_ref = $this->generate_claim_ref();

		$inserted = $wpdb->insert(
			$claims,
			array(
				'claim_ref'       => $claim_ref,
				'coupon_id'       => $coupon_id,
				'coupon_code'     => $coupon->coupon_code,
				'batch_id'        => $coupon->batch_id,
				'prize_amount'    => $coupon->prize_amount,
				'currency'        => $coupon->currency,
				'claimant_name'   => $claimant_name,
				'claimant_phone'  => $claimant_phone,
				'claimant_pan'    => $claimant_pan,
				'status'          => 'pending',
				'claimed_at'      => $now,
				'claim_ip'        => $claim_ip,
				'created_at'      => $now,
			),
			array( '%s', '%d', '%s', '%s', '%f', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
		);

		if ( false === $inserted ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'db_error', __( 'The claim could not be saved.', 'fm-cash-claims' ) );
		}

		$claim_id = (int) $wpdb->insert_id;

		$updated = $wpdb->update(
			$coupons,
			array(
				'status'     => 'claimed',
				'claimed_at' => $now,
			),
			array(
				'id'     => $coupon_id,
				'status' => 'issued',
			),
			array( '%s', '%s' ),
			array( '%d', '%s' )
		);

		if ( 1 !== $updated ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'already_claimed', __( 'This coupon was just claimed by someone else.', 'fm-cash-claims' ) );
		}

		$wpdb->query( 'COMMIT' );

		$claim = $this->get_claim( $claim_id );

		return $claim ?: new WP_Error( 'db_error', __( 'The claim was saved but could not be reloaded.', 'fm-cash-claims' ) );
	}

	public function mark_claim_paid( int $claim_id, int $user_id, string $note ): bool|WP_Error {
		global $wpdb;

		$claims  = $this->claims_table();
		$coupons = $this->coupons_table();

		$wpdb->query( 'START TRANSACTION' );

		$claim = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$claims} WHERE id = %d FOR UPDATE",
				$claim_id
			)
		);

		if ( ! $claim ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'not_found', __( 'Claim not found.', 'fm-cash-claims' ) );
		}

		if ( 'pending' !== (string) $claim->status ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'invalid_status', __( 'Only pending claims can be marked as paid.', 'fm-cash-claims' ) );
		}

		$now = $this->now();

		$updated = $wpdb->update(
			$claims,
			array(
				'status'       => 'paid',
				'paid_at'      => $now,
				'paid_by'      => $user_id,
				'payment_note' => mb_substr( $note, 0, 255 ),
			),
			array(
				'id'     => $claim_id,
				'status' => 'pending',
			),
			array( '%s', '%s', '%d', '%s' ),
			array( '%d', '%s' )
		);

		if ( 1 !== $updated ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'invalid_status', __( 'The claim status changed before it could be paid.', 'fm-cash-claims' ) );
		}

		$coupon_updated = $wpdb->update(
			$coupons,
			array( 'status' => 'paid' ),
			array(
				'id'     => (int) $claim->coupon_id,
				'status' => 'claimed',
			),
			array( '%s' ),
			array( '%d', '%s' )
		);

		if ( 1 !== $coupon_updated ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'db_error', __( 'The coupon status could not be updated.', 'fm-cash-claims' ) );
		}

		$wpdb->query( 'COMMIT' );

		return true;
	}

	public function reject_claim( int $claim_id, string $reason ): bool|WP_Error {
		global $wpdb;

		$claims = $this->claims_table();

		$updated = $wpdb->update(
			$claims,
			array(
				'status'           => 'rejected',
				'rejection_reason' => mb_substr( $reason, 0, 255 ),
			),
			array(
				'id'     => $claim_id,
				'status' => 'pending',
			),
			array( '%s', '%s' ),
			array( '%d', '%s' )
		);

		if ( 1 !== $updated ) {
			return new WP_Error( 'invalid_status', __( 'Only pending claims can be rejected.', 'fm-cash-claims' ) );
		}

		return true;
	}

	public function reopen_claim( int $claim_id ): bool|WP_Error {
		global $wpdb;

		$claims  = $this->claims_table();
		$coupons = $this->coupons_table();

		$wpdb->query( 'START TRANSACTION' );

		$claim = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$claims} WHERE id = %d FOR UPDATE",
				$claim_id
			)
		);

		if ( ! $claim ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'not_found', __( 'Claim not found.', 'fm-cash-claims' ) );
		}

		if ( 'rejected' !== (string) $claim->status ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'invalid_status', __( 'Only rejected claims can be reopened.', 'fm-cash-claims' ) );
		}

		$deleted = $wpdb->delete(
			$claims,
			array(
				'id'     => $claim_id,
				'status' => 'rejected',
			),
			array( '%d', '%s' )
		);

		if ( 1 !== $deleted ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'db_error', __( 'The claim could not be removed.', 'fm-cash-claims' ) );
		}

		$coupon_updated = $wpdb->update(
			$coupons,
			array(
				'status'     => 'issued',
				'claimed_at' => null,
			),
			array(
				'id'     => (int) $claim->coupon_id,
				'status' => 'claimed',
			),
			array( '%s', '%s' ),
			array( '%d', '%s' )
		);

		if ( 1 !== $coupon_updated ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'db_error', __( 'The coupon could not be reopened.', 'fm-cash-claims' ) );
		}

		$wpdb->query( 'COMMIT' );

		return true;
	}

	public function delete_batch( string $batch_id ): bool|WP_Error {
		global $wpdb;

		$batch = $this->get_batch( $batch_id );
		if ( ! $batch ) {
			return new WP_Error( 'not_found', __( 'Batch not found.', 'fm-cash-claims' ) );
		}

		$claim_count = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$this->claims_table()} WHERE batch_id = %s",
				$batch_id
			)
		);

		if ( $claim_count > 0 ) {
			return new WP_Error( 'has_claims', __( 'This batch has claims and cannot be deleted.', 'fm-cash-claims' ) );
		}

		$claimed_coupons = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$this->coupons_table()} WHERE batch_id = %s AND status != 'issued'",
				$batch_id
			)
		);

		if ( $claimed_coupons > 0 ) {
			return new WP_Error( 'has_claims', __( 'This batch has claimed or paid coupons and cannot be deleted.', 'fm-cash-claims' ) );
		}

		$expected_coupons = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$this->coupons_table()} WHERE batch_id = %s",
				$batch_id
			)
		);

		$expected_tiers = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$this->tiers_table()} WHERE batch_id = %s",
				$batch_id
			)
		);

		$wpdb->query( 'START TRANSACTION' );

		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$this->scan_log_table()} SET coupon_id = NULL WHERE coupon_id IN (SELECT id FROM {$this->coupons_table()} WHERE batch_id = %s)",
				$batch_id
			)
		);

		$coupons_deleted = $wpdb->delete( $this->coupons_table(), array( 'batch_id' => $batch_id ), array( '%s' ) );
		if ( false === $coupons_deleted || ( $expected_coupons > 0 && $coupons_deleted !== $expected_coupons ) ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'db_error', __( 'The batch coupons could not be deleted.', 'fm-cash-claims' ) );
		}

		$tiers_deleted = $wpdb->delete( $this->tiers_table(), array( 'batch_id' => $batch_id ), array( '%s' ) );
		if ( false === $tiers_deleted || ( $expected_tiers > 0 && $tiers_deleted !== $expected_tiers ) ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'db_error', __( 'The batch prize tiers could not be deleted.', 'fm-cash-claims' ) );
		}

		$deleted = $wpdb->delete( $this->batches_table(), array( 'batch_id' => $batch_id ), array( '%s' ) );

		if ( 1 !== $deleted ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'db_error', __( 'The batch could not be deleted.', 'fm-cash-claims' ) );
		}

		$wpdb->query( 'COMMIT' );

		return true;
	}

	private function generate_claim_ref(): string {
		for ( $attempt = 0; $attempt < 5; $attempt++ ) {
			$reference = 'CLM-' . gmdate( 'Ymd' ) . '-' . strtoupper( wp_generate_password( 6, false, false ) );
			if ( ! $this->get_claim_by_ref( $reference ) ) {
				return $reference;
			}
		}

		return 'CLM-' . gmdate( 'YmdHis' ) . '-' . strtoupper( wp_generate_password( 8, false, false ) );
	}
}
