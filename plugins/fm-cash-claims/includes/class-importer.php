<?php
/**
 * Manifest upload, validation, and batch import.
 *
 * @package FM_Cash_Claims
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class FM_Cash_Claims_Importer {

	private const MAX_ROWS = 20000;
	private const MAX_PRIZE = 10000000;
	private const PREVIEW_TTL = HOUR_IN_SECONDS;

	private FM_Cash_Claims_DB $db;

	public function __construct( FM_Cash_Claims_DB $db ) {
		$this->db = $db;
	}

	public function init(): void {
		add_action( 'admin_post_fm_cash_import_preview', array( $this, 'handle_preview' ) );
		add_action( 'admin_post_fm_cash_import_confirm', array( $this, 'handle_confirm' ) );
		add_action( 'admin_post_fm_cash_import_cancel', array( $this, 'handle_cancel' ) );
	}

	public function handle_preview(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to import cash coupon batches.', 'fm-cash-claims' ) );
		}

		check_admin_referer( 'fm_cash_import_preview' );

		if ( empty( $_FILES['manifest'] ) || ! is_array( $_FILES['manifest'] ) ) {
			$this->store_notice( 'error', __( 'Please choose a manifest CSV file.', 'fm-cash-claims' ) );
			$this->redirect( 'fm-cash-claims-import' );
		}

		$file = $_FILES['manifest'];

		$upload_error = isset( $file['error'] ) && is_scalar( $file['error'] )
			? (int) $file['error']
			: UPLOAD_ERR_NO_FILE;
		if ( UPLOAD_ERR_OK !== $upload_error ) {
			$this->store_notice( 'error', __( 'The upload failed. Please try again.', 'fm-cash-claims' ) );
			$this->redirect( 'fm-cash-claims-import' );
		}

		$tmp_name = isset( $file['tmp_name'] ) && is_string( $file['tmp_name'] ) ? $file['tmp_name'] : '';
		if ( '' === $tmp_name || ! is_uploaded_file( $tmp_name ) ) {
			$this->store_notice( 'error', __( 'The uploaded file could not be read.', 'fm-cash-claims' ) );
			$this->redirect( 'fm-cash-claims-import' );
		}

		$original_name = isset( $file['name'] ) && is_string( $file['name'] ) ? $file['name'] : '';
		$extension     = strtolower( pathinfo( $original_name, PATHINFO_EXTENSION ) );
		if ( ! in_array( $extension, array( 'csv', 'txt' ), true ) ) {
			$this->store_notice( 'error', __( 'Upload the generator manifest.csv file (CSV or TXT).', 'fm-cash-claims' ) );
			$this->redirect( 'fm-cash-claims-import' );
		}

		$import_dir = $this->get_import_dir();
		if ( is_wp_error( $import_dir ) ) {
			$this->store_notice( 'error', $import_dir->get_error_message() );
			$this->redirect( 'fm-cash-claims-import' );
		}

		$this->cleanup_old_imports( $import_dir );

		$key  = wp_generate_password( 24, false, false );
		$path = trailingslashit( $import_dir ) . $key . '.csv';

		if ( ! move_uploaded_file( $tmp_name, $path ) ) {
			$this->store_notice( 'error', __( 'The manifest could not be stored for preview.', 'fm-cash-claims' ) );
			$this->redirect( 'fm-cash-claims-import' );
		}

		$result = $this->parse_manifest( $path );
		if ( is_wp_error( $result ) ) {
			@unlink( $path );
			$errors = $result->get_error_data();
			$errors = is_array( $errors ) ? $errors : array();
			$this->store_notice( 'error', $result->get_error_message(), $errors );
			$this->redirect( 'fm-cash-claims-import' );
		}

		if ( $this->db->get_batch( $result['batch_id'] ) ) {
			@unlink( $path );
			$this->store_notice(
				'error',
				sprintf(
					/* translators: %s: batch ID */
					__( 'Batch %s already exists. Import each manifest only once.', 'fm-cash-claims' ),
					$result['batch_id']
				)
			);
			$this->redirect( 'fm-cash-claims-import' );
		}

		$old_preview = get_transient( $this->preview_key() );
		if (
			is_array( $old_preview )
			&& ! empty( $old_preview['path'] )
			&& is_string( $old_preview['path'] )
			&& $old_preview['path'] !== $path
		) {
			@unlink( $old_preview['path'] );
		}

		set_transient(
			$this->preview_key(),
			array(
				'key'         => $key,
				'path'        => $path,
				'filename'    => sanitize_file_name( $original_name ),
				'batch_id'    => $result['batch_id'],
				'currency'    => $result['currency'],
				'total'       => $result['total'],
				'total_value' => $result['total_value'],
				'tiers'       => $result['tiers'],
				'sample'      => $result['sample'],
			),
			self::PREVIEW_TTL
		);

		$this->redirect( 'fm-cash-claims-import', array( 'preview' => '1' ) );
	}

	public function handle_confirm(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to import cash coupon batches.', 'fm-cash-claims' ) );
		}

		check_admin_referer( 'fm_cash_import_confirm' );

		$preview = get_transient( $this->preview_key() );
		$key     = isset( $_POST['import_key'] ) && is_string( $_POST['import_key'] )
			? sanitize_text_field( wp_unslash( $_POST['import_key'] ) )
			: '';

		if ( ! is_array( $preview ) || empty( $preview['key'] ) || ! hash_equals( (string) $preview['key'], $key ) ) {
			$this->store_notice( 'error', __( 'The import preview expired. Upload the manifest again.', 'fm-cash-claims' ) );
			$this->redirect( 'fm-cash-claims-import' );
		}

		$path = (string) ( $preview['path'] ?? '' );
		if ( '' === $path || ! file_exists( $path ) ) {
			delete_transient( $this->preview_key() );
			$this->store_notice( 'error', __( 'The temporary manifest file is missing. Upload it again.', 'fm-cash-claims' ) );
			$this->redirect( 'fm-cash-claims-import' );
		}

		$result = $this->parse_manifest( $path );
		if ( is_wp_error( $result ) ) {
			$errors = $result->get_error_data();
			$errors = is_array( $errors ) ? $errors : array();
			$this->store_notice( 'error', $result->get_error_message(), $errors );
			$this->redirect( 'fm-cash-claims-import' );
		}

		if ( $this->db->get_batch( $result['batch_id'] ) ) {
			@unlink( $path );
			delete_transient( $this->preview_key() );
			$this->store_notice(
				'error',
				sprintf(
					/* translators: %s: batch ID */
					__( 'Batch %s already exists. Import each manifest only once.', 'fm-cash-claims' ),
					$result['batch_id']
				)
			);
			$this->redirect( 'fm-cash-claims-import' );
		}

		global $wpdb;

		$batches      = $this->db->batches_table();
		$tiers        = $this->db->tiers_table();
		$coupons      = $this->db->coupons_table();
		$now          = $this->db->now();
		$window_days  = (int) FM_Cash_Claims_Settings::get( 'claim_window_days', 0 );
		$claim_end    = $window_days > 0 ? gmdate( 'Y-m-d H:i:s', time() + ( $window_days * DAY_IN_SECONDS ) ) : null;
		$failed       = false;
		$failure_text = __( 'The batch could not be imported.', 'fm-cash-claims' );

		$wpdb->query( 'START TRANSACTION' );

		$inserted_batch = $wpdb->insert(
			$batches,
			array(
				'batch_id'      => $result['batch_id'],
				'label'         => $result['batch_id'],
				'currency'      => $result['currency'],
				'total_coupons' => $result['total'],
				'total_value'   => $result['total_value'],
				'claim_start'   => null,
				'claim_end'     => $claim_end,
				'status'        => 'active',
				'created_at'    => $now,
				'updated_at'    => $now,
			),
			array( '%s', '%s', '%s', '%d', '%f', '%s', '%s', '%s', '%s', '%s' )
		);

		if ( false === $inserted_batch ) {
			$failed       = true;
			$failure_text = __( 'The batch record could not be created.', 'fm-cash-claims' );
		}

		if ( ! $failed ) {
			foreach ( $result['tiers'] as $tier ) {
				$inserted_tier = $wpdb->insert(
					$tiers,
					array(
						'batch_id'     => $result['batch_id'],
						'prize_amount' => $tier['amount'],
						'quantity'     => $tier['quantity'],
						'created_at'   => $now,
					),
					array( '%s', '%f', '%d', '%s' )
				);

				if ( false === $inserted_tier ) {
					$failed       = true;
					$failure_text = __( 'A prize tier record could not be created.', 'fm-cash-claims' );
					break;
				}
			}
		}

		if ( ! $failed ) {
			foreach ( array_chunk( $result['rows'], 200 ) as $chunk ) {
				$placeholders = array();
				$values       = array();

				foreach ( $chunk as $row ) {
					$placeholders[] = '(%s,%s,%s,%s,%s,%s,%s,%s)';
					array_push(
						$values,
						$row['coupon_code'],
						$row['qr_token'],
						$row['batch_id'],
						$row['prize_amount'],
						$row['currency'],
						'issued',
						$row['generated_at'],
						$now
					);
				}

				$sql      = "INSERT INTO {$coupons} (coupon_code, qr_token, batch_id, prize_amount, currency, status, generated_at, created_at) VALUES " . implode( ',', $placeholders );
				$prepared = $wpdb->prepare( $sql, $values );

				if ( false === $wpdb->query( $prepared ) ) {
					$failed       = true;
					$failure_text = __( 'The coupon rows could not be inserted.', 'fm-cash-claims' );
					break;
				}
			}
		}

		if ( ! $failed ) {
			$stored_count = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$coupons} WHERE batch_id = %s",
					$result['batch_id']
				)
			);

			if ( $stored_count !== (int) $result['total'] ) {
				$failed       = true;
				$failure_text = __( 'The stored coupon count does not match the manifest.', 'fm-cash-claims' );
			}
		}

		if ( $failed ) {
			$wpdb->query( 'ROLLBACK' );
			$this->store_notice( 'error', $failure_text );
			$this->redirect( 'fm-cash-claims-import' );
		}

		$wpdb->query( 'COMMIT' );

		@unlink( $path );
		delete_transient( $this->preview_key() );

		$this->store_notice(
			'success',
			sprintf(
				/* translators: 1: batch ID, 2: coupon count, 3: formatted payout total */
				__( 'Batch %1$s imported with %2$s coupons. Total payout exposure: %3$s.', 'fm-cash-claims' ),
				$result['batch_id'],
				number_format_i18n( $result['total'] ),
				FM_Cash_Claims_Util::format_amount( (float) $result['total_value'], $result['currency'] )
			)
		);

		$this->redirect( 'fm-cash-claims-batches' );
	}

	public function handle_cancel(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to cancel this import.', 'fm-cash-claims' ) );
		}

		check_admin_referer( 'fm_cash_import_cancel' );

		$preview = get_transient( $this->preview_key() );
		if ( is_array( $preview ) && ! empty( $preview['path'] ) ) {
			@unlink( (string) $preview['path'] );
		}

		delete_transient( $this->preview_key() );
		$this->store_notice( 'warning', __( 'The import preview was cancelled. No data was written.', 'fm-cash-claims' ) );
		$this->redirect( 'fm-cash-claims-import' );
	}

	public function get_preview(): ?array {
		$preview = get_transient( $this->preview_key() );

		return is_array( $preview ) ? $preview : null;
	}

	private function parse_manifest( string $path ): array|WP_Error {
		if ( ! is_readable( $path ) ) {
			return new WP_Error( 'unreadable', __( 'The manifest file is not readable.', 'fm-cash-claims' ) );
		}

		$handle = fopen( $path, 'rb' );
		if ( false === $handle ) {
			return new WP_Error( 'unreadable', __( 'The manifest file could not be opened.', 'fm-cash-claims' ) );
		}

		$header = fgetcsv( $handle, 0, ',', '"', '' );
		if ( ! is_array( $header ) ) {
			fclose( $handle );
			return new WP_Error( 'empty', __( 'The manifest is empty.', 'fm-cash-claims' ) );
		}

		$header[0] = preg_replace( '/^\xEF\xBB\xBF/', '', (string) $header[0] );
		$expected  = array( 'coupon_code', 'qr_token', 'batch_id', 'prize_amount', 'currency', 'generated_at' );

		if ( array_map( 'trim', $header ) !== $expected ) {
			fclose( $handle );
			return new WP_Error(
				'bad_header',
				sprintf(
					/* translators: %s: expected header */
					__( 'The manifest header is invalid. Expected: %s', 'fm-cash-claims' ),
					implode( ',', $expected )
				)
			);
		}

		$rows         = array();
		$sample       = array();
		$codes        = array();
		$tokens       = array();
		$tiers        = array();
		$errors       = array();
		$batch_id     = null;
		$currency     = null;
		$total_value  = 0.0;
		$line_number  = 1;

		while ( false !== ( $data = fgetcsv( $handle, 0, ',', '"', '' ) ) ) {
			$line_number++;

			if ( array( null ) === $data || ( 1 === count( $data ) && '' === trim( (string) $data[0] ) ) ) {
				continue;
			}

			if ( count( $data ) !== 6 ) {
				$errors[] = sprintf(
					/* translators: %d: CSV line number */
					__( 'Line %d: expected exactly 6 columns.', 'fm-cash-claims' ),
					$line_number
				);
				if ( count( $errors ) >= 20 ) {
					break;
				}
				continue;
			}

			$row = array_map(
				static fn( mixed $value ): string => trim( (string) $value ),
				$data
			);

			$coupon_code = $row[0];
			$qr_token    = $row[1];
			$row_batch   = $row[2];
			$amount_raw  = $row[3];
			$row_currency = strtoupper( $row[4] );
			$generated_at = $row[5];

			if ( '' === $coupon_code || mb_strlen( $coupon_code ) > 30 ) {
				$errors[] = sprintf( __( 'Line %d: invalid coupon code.', 'fm-cash-claims' ), $line_number );
			} elseif ( isset( $codes[ $coupon_code ] ) ) {
				$errors[] = sprintf( __( 'Line %d: duplicate coupon code %s.', 'fm-cash-claims' ), $line_number, $coupon_code );
			} else {
				$codes[ $coupon_code ] = true;
			}

			if ( ! preg_match( '/^[A-Za-z0-9_-]{32}$/', $qr_token ) ) {
				$errors[] = sprintf( __( 'Line %d: QR token must be 32 Base64URL characters.', 'fm-cash-claims' ), $line_number );
			} elseif ( isset( $tokens[ $qr_token ] ) ) {
				$errors[] = sprintf( __( 'Line %d: duplicate QR token.', 'fm-cash-claims' ), $line_number );
			} else {
				$tokens[ $qr_token ] = true;
			}

			if ( '' === $row_batch || mb_strlen( $row_batch ) > 50 ) {
				$errors[] = sprintf( __( 'Line %d: invalid batch ID.', 'fm-cash-claims' ), $line_number );
			} elseif ( null === $batch_id ) {
				$batch_id = $row_batch;
			} elseif ( $batch_id !== $row_batch ) {
				$errors[] = sprintf( __( 'Line %d: mixed batch IDs are not allowed.', 'fm-cash-claims' ), $line_number );
			}

			if ( ! is_numeric( $amount_raw ) ) {
				$errors[] = sprintf( __( 'Line %d: prize amount is not numeric.', 'fm-cash-claims' ), $line_number );
				$amount = 0.0;
			} else {
				$amount = round( (float) $amount_raw, 2 );
				if ( $amount <= 0 || $amount > self::MAX_PRIZE ) {
					$errors[] = sprintf( __( 'Line %d: prize amount must be positive and within the allowed range.', 'fm-cash-claims' ), $line_number );
				}
			}

			if ( ! preg_match( '/^[A-Z]{3}$/', $row_currency ) ) {
				$errors[] = sprintf( __( 'Line %d: currency must be a 3-letter code.', 'fm-cash-claims' ), $line_number );
			} elseif ( null === $currency ) {
				$currency = $row_currency;
			} elseif ( $currency !== $row_currency ) {
				$errors[] = sprintf( __( 'Line %d: mixed currencies are not allowed.', 'fm-cash-claims' ), $line_number );
			}

			$timestamp = strtotime( $generated_at );
			if ( false === $timestamp ) {
				$errors[] = sprintf( __( 'Line %d: generated_at is not a valid date.', 'fm-cash-claims' ), $line_number );
				$normalized_date = '';
			} else {
				$normalized_date = gmdate( 'Y-m-d H:i:s', $timestamp );
			}

			if ( count( $errors ) >= 20 ) {
				break;
			}

			$amount_key = number_format( $amount, 2, '.', '' );
			if ( ! isset( $tiers[ $amount_key ] ) ) {
				$tiers[ $amount_key ] = array(
					'amount'   => $amount,
					'quantity' => 0,
				);
			}
			$tiers[ $amount_key ]['quantity']++;
			$total_value += $amount;

			$normalized_row = array(
				'coupon_code'  => $coupon_code,
				'qr_token'     => $qr_token,
				'batch_id'     => $row_batch,
				'prize_amount' => $amount_key,
				'currency'     => $row_currency,
				'generated_at' => $normalized_date,
			);

			$rows[] = $normalized_row;

			if ( count( $sample ) < 5 ) {
				$sample[] = array(
					'coupon_code'  => $coupon_code,
					'qr_token'     => substr( $qr_token, 0, 6 ) . '…' . substr( $qr_token, -4 ),
					'prize_amount' => $amount,
					'currency'     => $row_currency,
					'generated_at' => $normalized_date,
				);
			}

			if ( count( $rows ) > self::MAX_ROWS ) {
				$errors[] = sprintf(
					/* translators: %s: maximum row count */
					__( 'The manifest exceeds the maximum of %s rows.', 'fm-cash-claims' ),
					number_format_i18n( self::MAX_ROWS )
				);
				break;
			}
		}

		fclose( $handle );

		if ( array() === $rows && array() === $errors ) {
			$errors[] = __( 'The manifest contains no coupon rows.', 'fm-cash-claims' );
		}

		if ( array() !== $errors ) {
			return new WP_Error( 'invalid_manifest', __( 'The manifest could not be imported. Fix the errors below and upload it again.', 'fm-cash-claims' ), $errors );
		}

		if ( null === $batch_id || null === $currency ) {
			return new WP_Error( 'invalid_manifest', __( 'The manifest is missing a batch ID or currency.', 'fm-cash-claims' ) );
		}

		uksort(
			$tiers,
			static fn( string $left, string $right ): int => (float) $left <=> (float) $right
		);

		return array(
			'batch_id'    => $batch_id,
			'currency'    => $currency,
			'total'       => count( $rows ),
			'total_value' => round( $total_value, 2 ),
			'tiers'       => array_values( $tiers ),
			'sample'      => $sample,
			'rows'        => $rows,
		);
	}

	private function get_import_dir(): string|WP_Error {
		$uploads = wp_upload_dir();
		if ( ! empty( $uploads['error'] ) ) {
			return new WP_Error( 'uploads', (string) $uploads['error'] );
		}

		$dir = trailingslashit( (string) $uploads['basedir'] ) . 'fm-cash-imports';
		if ( ! wp_mkdir_p( $dir ) ) {
			return new WP_Error( 'mkdir', __( 'The secure import directory could not be created.', 'fm-cash-claims' ) );
		}

		$htaccess = trailingslashit( $dir ) . '.htaccess';
		if ( ! file_exists( $htaccess ) ) {
			@file_put_contents(
				$htaccess,
				"<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n"
			);
		}

		$index = trailingslashit( $dir ) . 'index.php';
		if ( ! file_exists( $index ) ) {
			@file_put_contents( $index, "<?php\n// Silence is golden.\n" );
		}

		return $dir;
	}

	private function cleanup_old_imports( string $dir ): void {
		$files = glob( trailingslashit( $dir ) . '*.csv' );
		if ( ! is_array( $files ) ) {
			return;
		}

		$cutoff = time() - ( 2 * HOUR_IN_SECONDS );
		foreach ( $files as $file ) {
			if ( is_file( $file ) && filemtime( $file ) < $cutoff ) {
				@unlink( $file );
			}
		}
	}

	private function preview_key(): string {
		return 'fm_cash_import_preview_' . get_current_user_id();
	}

	private function store_notice( string $type, string $message, array $errors = array() ): void {
		set_transient(
			'fm_cash_notice_' . get_current_user_id(),
			array(
				'type'    => $type,
				'message' => $message,
				'errors'  => $errors,
			),
			2 * MINUTE_IN_SECONDS
		);
	}

	private function redirect( string $page, array $args = array() ): void {
		$url = add_query_arg(
			array_merge( array( 'page' => $page ), $args ),
			admin_url( 'admin.php' )
		);

		wp_safe_redirect( $url );
		exit;
	}
}
