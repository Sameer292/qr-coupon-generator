<?php
/**
 * CSV export for end-of-day reconciliation.
 *
 * @package FM_Cash_Claims
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class FM_Cash_Claims_Export {

	private FM_Cash_Claims_DB $db;

	public function __construct( FM_Cash_Claims_DB $db ) {
		$this->db = $db;
	}

	public function init(): void {
		add_action( 'admin_post_fm_cash_export_claims', array( $this, 'handle_export' ) );
	}

	public function handle_export(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to export claims.', 'fm-cash-claims' ) );
		}

		check_admin_referer( 'fm_cash_export_claims' );

		global $wpdb;

		$table = $this->db->claims_table();
		list( $where_sql, $params ) = $this->build_where();

		$sql  = "SELECT * FROM {$table} WHERE {$where_sql} ORDER BY claimed_at DESC";
		$rows = $params ? $wpdb->get_results( $wpdb->prepare( $sql, $params ) ) : $wpdb->get_results( $sql );

		$filename = 'fm-cash-claims-' . gmdate( 'Ymd-His' ) . '.csv';

		nocache_headers();
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="' . $filename . '"' );
		header( 'X-Content-Type-Options: nosniff' );
		header( 'Cache-Control: no-store, no-cache, must-revalidate, max-age=0' );

		$output = fopen( 'php://output', 'wb' );
		if ( false === $output ) {
			wp_die( esc_html__( 'The export file could not be created.', 'fm-cash-claims' ) );
		}

		// UTF-8 BOM helps Excel open the file with the correct encoding.
		fwrite( $output, "\xEF\xBB\xBF" );

		fputcsv(
			$output,
			array(
				'claim_ref',
				'coupon_code',
				'batch_id',
				'prize_amount',
				'currency',
				'claimant_name',
				'claimant_phone',
				'claimant_pan',
				'status',
				'claimed_at_local',
				'paid_at_local',
				'paid_by',
				'payment_note',
				'rejection_reason',
			),
			',',
			'"',
			'\\'
		);

		foreach ( (array) $rows as $claim ) {
			$paid_by = '';
			if ( ! empty( $claim->paid_by ) ) {
				$user = get_userdata( (int) $claim->paid_by );
				if ( $user ) {
					$paid_by = (string) $user->display_name;
				}
			}

			fputcsv(
				$output,
				array(
					FM_Cash_Claims_Util::csv_safe( (string) $claim->claim_ref ),
					FM_Cash_Claims_Util::csv_safe( (string) $claim->coupon_code ),
					FM_Cash_Claims_Util::csv_safe( (string) $claim->batch_id ),
					number_format( (float) $claim->prize_amount, 2, '.', '' ),
					FM_Cash_Claims_Util::csv_safe( (string) $claim->currency ),
					FM_Cash_Claims_Util::csv_safe( (string) $claim->claimant_name ),
					FM_Cash_Claims_Util::csv_safe( (string) $claim->claimant_phone ),
					FM_Cash_Claims_Util::csv_safe( (string) $claim->claimant_pan ),
					FM_Cash_Claims_Util::csv_safe( (string) $claim->status ),
					FM_Cash_Claims_Util::csv_safe( get_date_from_gmt( (string) $claim->claimed_at, 'Y-m-d H:i:s' ) ),
					FM_Cash_Claims_Util::csv_safe( ! empty( $claim->paid_at ) ? get_date_from_gmt( (string) $claim->paid_at, 'Y-m-d H:i:s' ) : '' ),
					FM_Cash_Claims_Util::csv_safe( $paid_by ),
					FM_Cash_Claims_Util::csv_safe( (string) ( $claim->payment_note ?? '' ) ),
					FM_Cash_Claims_Util::csv_safe( (string) ( $claim->rejection_reason ?? '' ) ),
				),
				',',
				'"',
				'\\'
			);
		}

		fclose( $output );
		exit;
	}

	/**
	 * @return array{0:string,1:array<int,string>}
	 */
	private function build_where(): array {
		global $wpdb;

		$where  = array( '1=1' );
		$params = array();

		$status = isset( $_GET['status'] ) && is_string( $_GET['status'] )
			? sanitize_key( wp_unslash( $_GET['status'] ) )
			: '';
		if ( in_array( $status, array( 'pending', 'paid', 'rejected' ), true ) ) {
			$where[]  = 'status = %s';
			$params[] = $status;
		}

		$batch = isset( $_GET['batch'] ) && is_string( $_GET['batch'] )
			? sanitize_text_field( wp_unslash( $_GET['batch'] ) )
			: '';
		if ( '' !== $batch ) {
			$where[]  = 'batch_id = %s';
			$params[] = $batch;
		}

		$date = isset( $_GET['claim_date'] ) && is_string( $_GET['claim_date'] )
			? sanitize_text_field( wp_unslash( $_GET['claim_date'] ) )
			: '';
		if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) ) {
			$start    = get_gmt_from_date( $date . ' 00:00:00' );
			$end      = get_gmt_from_date( $date . ' 23:59:59' );
			$where[]  = 'claimed_at >= %s AND claimed_at <= %s';
			$params[] = $start;
			$params[] = $end;
		}

		$search = isset( $_GET['s'] ) && is_string( $_GET['s'] )
			? sanitize_text_field( wp_unslash( $_GET['s'] ) )
			: '';
		if ( '' !== $search ) {
			$like     = '%' . $wpdb->esc_like( $search ) . '%';
			$where[]  = '(claim_ref LIKE %s OR coupon_code LIKE %s OR claimant_name LIKE %s OR claimant_phone LIKE %s)';
			$params[] = $like;
			$params[] = $like;
			$params[] = $like;
			$params[] = $like;
		}

		return array( implode( ' AND ', $where ), $params );
	}
}
