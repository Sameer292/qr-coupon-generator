<?php
/**
 * Streaming CSV Importer for Fresh Masala coupons.
 *
 * @package FM_Festive_Draw
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles CSV manifest uploads, validation, streaming parsing, batch insertion, and AJAX chunking.
 */
class FM_Importer {

	/**
	 * Database handler.
	 *
	 * @var FM_DB
	 */
	private FM_DB $db;

	/**
	 * Expected CSV Header in strict sequence.
	 */
	public const EXPECTED_HEADER = [ 'coupon_code', 'qr_token', 'batch_id', 'generated_at' ];

	/**
	 * Batch size for SQL insertions.
	 */
	public const BATCH_SIZE = 500;

	/**
	 * Constructor.
	 *
	 * @param FM_DB $db Database instance.
	 */
	public function __construct( FM_DB $db ) {
		$this->db = $db;

		add_action( 'wp_ajax_fm_upload_csv_chunk', [ $this, 'ajax_process_chunk' ] );
	}

	/**
	 * Validate MIME type and file extension.
	 *
	 * @param array $file $_FILES array element.
	 * @return true|WP_Error
	 */
	public function validate_uploaded_file( array $file ) {
		if ( empty( $file['tmp_name'] ) || ! is_uploaded_file( $file['tmp_name'] ) ) {
			return new WP_Error( 'no_file', __( 'No valid file was uploaded.', 'fm-festive-draw' ) );
		}

		$filename = sanitize_file_name( $file['name'] ?? '' );
		$ext      = strtolower( pathinfo( $filename, PATHINFO_EXTENSION ) );

		if ( 'csv' !== $ext ) {
			return new WP_Error( 'invalid_extension', __( 'Invalid file extension. Only .csv files are permitted.', 'fm-festive-draw' ) );
		}

		// Check mime type with finfo if available.
		if ( function_exists( 'finfo_open' ) ) {
			$finfo     = finfo_open( FILEINFO_MIME_TYPE );
			$mime_type = finfo_file( $finfo, $file['tmp_name'] );
			finfo_close( $finfo );

			$allowed_mimes = [
				'text/csv',
				'text/plain',
				'application/csv',
				'text/comma-separated-values',
				'application/vnd.ms-excel',
				'text/x-csv',
				'application/octet-stream',
			];

			if ( ! in_array( $mime_type, $allowed_mimes, true ) ) {
				return new WP_Error( 'invalid_mime', sprintf( __( 'Invalid file MIME type (%s). Please upload a valid CSV file.', 'fm-festive-draw' ), esc_html( (string) $mime_type ) ) );
			}
		}

		return true;
	}

	/**
	 * Validates a single row against business rules.
	 *
	 * @param array $row Associative or indexed array [coupon_code, qr_token, batch_id, generated_at].
	 * @param int   $row_number Line number in CSV.
	 * @return array{valid: bool, error: string, data: array}
	 */
	public function validate_row( array $row, int $row_number ): array {
		if ( count( $row ) < 4 ) {
			return [
				'valid' => false,
				'error' => sprintf( __( 'Line %d: Incomplete row (expected 4 columns, found %d).', 'fm-festive-draw' ), $row_number, count( $row ) ),
				'data'  => [],
			];
		}

		$coupon_code  = trim( (string) $row[0] );
		$qr_token     = trim( (string) $row[1] );
		$batch_id     = trim( (string) $row[2] );
		$generated_at = trim( (string) $row[3] );

		// 1. Validate Coupon Code format: Allow alphanumeric with hyphens/underscores (e.g. FM-00001, FM2026-001, COUPON-1)
		if ( ! preg_match( '/^[A-Za-z0-9_-]{2,30}$/', $coupon_code ) ) {
			return [
				'valid' => false,
				'error' => sprintf( __( 'Line %d: Invalid coupon code format "%s".', 'fm-festive-draw' ), $row_number, esc_html( $coupon_code ) ),
				'data'  => [],
			];
		}

		// 2. Validate QR Token format: 16 to 64 URL-safe base64 characters /^[A-Za-z0-9_-]{16,64}$/
		if ( ! preg_match( '/^[A-Za-z0-9_-]{16,64}$/', $qr_token ) ) {
			return [
				'valid' => false,
				'error' => sprintf( __( 'Line %d: Invalid QR token format for coupon %s (expected URL-safe token).', 'fm-festive-draw' ), $row_number, esc_html( $coupon_code ) ),
				'data'  => [],
			];
		}

		// 3. Validate Batch ID
		if ( empty( $batch_id ) || strlen( $batch_id ) > 50 ) {
			return [
				'valid' => false,
				'error' => sprintf( __( 'Line %d: Invalid or empty batch_id for coupon %s.', 'fm-festive-draw' ), $row_number, esc_html( $coupon_code ) ),
				'data'  => [],
			];
		}

		// 4. Validate Generated At date
		try {
			$date_obj = new DateTimeImmutable( $generated_at );
			$mysql_date = $date_obj->format( 'Y-m-d H:i:s' );
		} catch ( Exception $e ) {
			return [
				'valid' => false,
				'error' => sprintf( __( 'Line %d: Invalid date format "%s" for coupon %s.', 'fm-festive-draw' ), $row_number, esc_html( $generated_at ), esc_html( $coupon_code ) ),
				'data'  => [],
			];
		}

		return [
			'valid' => true,
			'error' => '',
			'data'  => [
				'coupon_code'  => $coupon_code,
				'qr_token'     => $qr_token,
				'batch_id'     => $batch_id,
				'generated_at' => $mysql_date,
			],
		];
	}

	/**
	 * Synchronously or streamingly import an entire CSV file from disk.
	 *
	 * @param string $file_path Absolute path to the CSV file.
	 * @return array{success: bool, rows_read: int, inserted: int, duplicates: int, invalid: int, errors: array<string>, message: string}
	 */
	public function import_file( string $file_path ): array {
		if ( ! file_exists( $file_path ) || ! is_readable( $file_path ) ) {
			return [
				'success'    => false,
				'rows_read'  => 0,
				'inserted'   => 0,
				'duplicates' => 0,
				'invalid'    => 0,
				'errors'     => [ __( 'The uploaded file could not be read.', 'fm-festive-draw' ) ],
				'message'    => __( 'File read error.', 'fm-festive-draw' ),
			];
		}

		// Attempt to extend execution time for larger manifests.
		if ( function_exists( 'set_time_limit' ) ) {
			@set_time_limit( 300 );
		}

		$handle = fopen( $file_path, 'r' );
		if ( false === $handle ) {
			return [
				'success'    => false,
				'rows_read'  => 0,
				'inserted'   => 0,
				'duplicates' => 0,
				'invalid'    => 0,
				'errors'     => [ __( 'Failed to open file pointer.', 'fm-festive-draw' ) ],
				'message'    => __( 'File pointer error.', 'fm-festive-draw' ),
			];
		}

		// Read and check header.
		$header = fgetcsv( $handle );
		if ( false === $header || null === $header ) {
			fclose( $handle );
			return [
				'success'    => false,
				'rows_read'  => 0,
				'inserted'   => 0,
				'duplicates' => 0,
				'invalid'    => 0,
				'errors'     => [ __( 'The CSV file is empty.', 'fm-festive-draw' ) ],
				'message'    => __( 'Empty file.', 'fm-festive-draw' ),
			];
		}

		// Trim and lower header columns.
		$cleaned_header = array_map(
			static fn( $col ) => strtolower( trim( (string) $col, " \t\n\r\0\x0B\xEF\xBB\xBF" ) ),
			$header
		);

		if ( $cleaned_header !== self::EXPECTED_HEADER ) {
			fclose( $handle );
			return [
				'success'    => false,
				'rows_read'  => 0,
				'inserted'   => 0,
				'duplicates' => 0,
				'invalid'    => 0,
				'errors'     => [
					sprintf(
						__( 'Invalid CSV header. Expected exactly "%s" but got "%s".', 'fm-festive-draw' ),
						implode( ',', self::EXPECTED_HEADER ),
						implode( ',', $cleaned_header )
					),
				],
				'message'    => __( 'Header mismatch.', 'fm-festive-draw' ),
			];
		}

		$rows_read   = 0;
		$inserted    = 0;
		$duplicates  = 0;
		$invalid     = 0;
		$errors      = [];
		$row_number  = 1; // Header was row 1.
		$batch_queue = [];

		while ( ( $row = fgetcsv( $handle ) ) !== false ) {
			$row_number++;

			// Skip completely empty lines.
			if ( empty( $row ) || ( 1 === count( $row ) && null === $row[0] ) ) {
				continue;
			}

			$rows_read++;

			$validation = $this->validate_row( $row, $row_number );
			if ( ! $validation['valid'] ) {
				$invalid++;
				if ( count( $errors ) < 20 ) {
					$errors[] = $validation['error'];
				}
				continue;
			}

			$batch_queue[] = $validation['data'];

			if ( count( $batch_queue ) >= self::BATCH_SIZE ) {
				$batch_res   = $this->process_batch_insert( $batch_queue );
				$inserted   += $batch_res['inserted'];
				$duplicates += $batch_res['duplicates'];
				$batch_queue = [];
			}
		}

		// Process remaining items in queue.
		if ( ! empty( $batch_queue ) ) {
			$batch_res   = $this->process_batch_insert( $batch_queue );
			$inserted   += $batch_res['inserted'];
			$duplicates += $batch_res['duplicates'];
		}

		fclose( $handle );

		return [
			'success'    => true,
			'rows_read'  => $rows_read,
			'inserted'   => $inserted,
			'duplicates' => $duplicates,
			'invalid'    => $invalid,
			'errors'     => $errors,
			'message'    => sprintf(
				__( 'Import completed: %d rows read, %d inserted, %d skipped duplicates, %d rejected.', 'fm-festive-draw' ),
				$rows_read,
				$inserted,
				$duplicates,
				$invalid
			),
		];
	}

	/**
	 * Inserts a batch of valid coupon rows inside a transaction, skipping duplicates.
	 *
	 * @param array<array{coupon_code: string, qr_token: string, batch_id: string, generated_at: string}> $batch
	 * @return array{inserted: int, duplicates: int}
	 */
	public function process_batch_insert( array $batch ): array {
		global $wpdb;

		if ( empty( $batch ) ) {
			return [ 'inserted' => 0, 'duplicates' => 0 ];
		}

		$table_name = $this->db->get_coupons_table();

		// Collect codes and tokens to check for duplicates in the database.
		$codes  = array_column( $batch, 'coupon_code' );
		$tokens = array_column( $batch, 'qr_token' );

		// Prepare IN clauses safely.
		$code_placeholders  = implode( ',', array_fill( 0, count( $codes ), '%s' ) );
		$token_placeholders = implode( ',', array_fill( 0, count( $tokens ), '%s' ) );

		// Check for existing codes or tokens.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$existing_records = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT coupon_code, qr_token FROM {$table_name} WHERE coupon_code IN ({$code_placeholders}) OR qr_token IN ({$token_placeholders})", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				...array_merge( $codes, $tokens )
			),
			ARRAY_A
		);

		$existing_codes  = [];
		$existing_tokens = [];
		if ( ! empty( $existing_records ) ) {
			foreach ( $existing_records as $rec ) {
				$existing_codes[ $rec['coupon_code'] ] = true;
				$existing_tokens[ $rec['qr_token'] ]   = true;
			}
		}

		$to_insert   = [];
		$duplicates  = 0;
		$now_created = current_time( 'mysql' );

		// Also prevent intra-batch duplicate collisions.
		$batch_seen_codes  = [];
		$batch_seen_tokens = [];

		foreach ( $batch as $item ) {
			$c = $item['coupon_code'];
			$t = $item['qr_token'];

			if ( isset( $existing_codes[ $c ] ) || isset( $existing_tokens[ $t ] ) || isset( $batch_seen_codes[ $c ] ) || isset( $batch_seen_tokens[ $t ] ) ) {
				$duplicates++;
				continue;
			}

			$batch_seen_codes[ $c ]  = true;
			$batch_seen_tokens[ $t ] = true;

			$to_insert[] = [
				'coupon_code'  => $c,
				'qr_token'     => $t,
				'batch_id'     => $item['batch_id'],
				'status'       => 'issued',
				'generated_at' => $item['generated_at'],
				'created_at'   => $now_created,
			];
		}

		$inserted = 0;
		if ( ! empty( $to_insert ) ) {
			// Execute inside a database transaction.
			$wpdb->query( 'START TRANSACTION' );

			try {
				$value_placeholders = [];
				$values_flat        = [];

				foreach ( $to_insert as $row ) {
					$value_placeholders[] = '(%s, %s, %s, %s, %s, %s)';
					$values_flat[]        = $row['coupon_code'];
					$values_flat[]        = $row['qr_token'];
					$values_flat[]        = $row['batch_id'];
					$values_flat[]        = $row['status'];
					$values_flat[]        = $row['generated_at'];
					$values_flat[]        = $row['created_at'];
				}

				$sql = "INSERT INTO {$table_name} (coupon_code, qr_token, batch_id, status, generated_at, created_at) VALUES " . implode( ', ', $value_placeholders );

				// phpcs:ignore WordPress.DB.DirectDatabaseQuery
				$res = $wpdb->query( $wpdb->prepare( $sql, ...$values_flat ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

				if ( false === $res ) {
					$wpdb->query( 'ROLLBACK' );
					return [ 'inserted' => 0, 'duplicates' => $duplicates + count( $to_insert ) ];
				}

				$wpdb->query( 'COMMIT' );
				$inserted = count( $to_insert );
			} catch ( Exception $e ) {
				$wpdb->query( 'ROLLBACK' );
				return [ 'inserted' => 0, 'duplicates' => $duplicates + count( $to_insert ) ];
			}
		}

		return [
			'inserted'   => $inserted,
			'duplicates' => $duplicates,
		];
	}

	/**
	 * Handles AJAX chunked import request with progress tracking.
	 */
	public function ajax_process_chunk(): void {
		check_ajax_referer( 'fm_import_nonce', 'security' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( [ 'message' => __( 'Permission denied.', 'fm-festive-draw' ) ] );
		}

		$file_id    = sanitize_text_field( $_POST['file_id'] ?? '' );
		$offset     = isset( $_POST['offset'] ) ? absint( $_POST['offset'] ) : 0;
		$total_read = isset( $_POST['total_read'] ) ? absint( $_POST['total_read'] ) : 0;
		$inserted   = isset( $_POST['inserted'] ) ? absint( $_POST['inserted'] ) : 0;
		$duplicates = isset( $_POST['duplicates'] ) ? absint( $_POST['duplicates'] ) : 0;
		$invalid    = isset( $_POST['invalid'] ) ? absint( $_POST['invalid'] ) : 0;
		$errors     = isset( $_POST['errors'] ) && is_array( $_POST['errors'] ) ? array_map( 'sanitize_text_field', $_POST['errors'] ) : [];

		if ( empty( $file_id ) ) {
			wp_send_json_error( [ 'message' => __( 'Missing session file ID.', 'fm-festive-draw' ) ] );
		}

		$upload_dir = wp_upload_dir();
		$file_path  = trailingslashit( $upload_dir['basedir'] ) . 'fm-temp/' . sanitize_file_name( $file_id ) . '.csv';

		if ( ! file_exists( $file_path ) || ! is_readable( $file_path ) ) {
			wp_send_json_error( [ 'message' => __( 'Temporary import file expired or not found.', 'fm-festive-draw' ) ] );
		}

		$handle = fopen( $file_path, 'r' );
		if ( false === $handle ) {
			wp_send_json_error( [ 'message' => __( 'Unable to read import file.', 'fm-festive-draw' ) ] );
		}

		// First chunk: validate header.
		if ( 0 === $offset ) {
			$header = fgetcsv( $handle );
			if ( false === $header || null === $header ) {
				fclose( $handle );
				@unlink( $file_path );
				wp_send_json_error( [ 'message' => __( 'The uploaded file is empty.', 'fm-festive-draw' ) ] );
			}

			$cleaned_header = array_map(
				static fn( $col ) => strtolower( trim( (string) $col, " \t\n\r\0\x0B\xEF\xBB\xBF" ) ),
				$header
			);

			if ( $cleaned_header !== self::EXPECTED_HEADER ) {
				fclose( $handle );
				@unlink( $file_path );
				wp_send_json_error(
					[
						'message' => sprintf(
							__( 'Invalid CSV header. Expected exactly "%s" but got "%s".', 'fm-festive-draw' ),
							implode( ',', self::EXPECTED_HEADER ),
							implode( ',', $cleaned_header )
						),
					]
				);
			}

			$offset = ftell( $handle );
		} else {
			fseek( $handle, $offset );
		}

		$chunk_batch = [];
		$rows_in_chunk = 0;
		$is_eof = false;

		while ( $rows_in_chunk < self::BATCH_SIZE ) {
			$row = fgetcsv( $handle );
			if ( false === $row ) {
				$is_eof = true;
				break;
			}

			if ( empty( $row ) || ( 1 === count( $row ) && null === $row[0] ) ) {
				continue;
			}

			$total_read++;
			$rows_in_chunk++;

			$validation = $this->validate_row( $row, $total_read + 1 );
			if ( ! $validation['valid'] ) {
				$invalid++;
				if ( count( $errors ) < 20 ) {
					$errors[] = $validation['error'];
				}
				continue;
			}

			$chunk_batch[] = $validation['data'];
		}

		$new_offset = ftell( $handle );
		fclose( $handle );

		if ( ! empty( $chunk_batch ) ) {
			$batch_res   = $this->process_batch_insert( $chunk_batch );
			$inserted   += $batch_res['inserted'];
			$duplicates += $batch_res['duplicates'];
		}

		if ( $is_eof ) {
			@unlink( $file_path );
		}

		wp_send_json_success(
			[
				'is_eof'     => $is_eof,
				'offset'     => $new_offset,
				'total_read' => $total_read,
				'inserted'   => $inserted,
				'duplicates' => $duplicates,
				'invalid'    => $invalid,
				'errors'     => $errors,
			]
		);
	}
}
