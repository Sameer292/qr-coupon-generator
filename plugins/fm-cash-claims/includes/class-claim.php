<?php
/**
 * Public claim endpoint and first-complete-claim transaction.
 *
 * @package FM_Cash_Claims
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class FM_Cash_Claims_Claim {

	private const RATE_LIMIT    = 60;
	private const SUCCESS_TTL   = 15 * MINUTE_IN_SECONDS;

	private FM_Cash_Claims_DB $db;

	public function __construct( FM_Cash_Claims_DB $db ) {
		$this->db = $db;
	}

	public function init(): void {
		add_action( 'init', array( $this, 'register_rewrite_rules' ) );
		add_filter( 'query_vars', array( $this, 'query_vars' ) );
		add_action( 'template_redirect', array( $this, 'handle_request' ) );
	}

	public function register_rewrite_rules(): void {
		add_rewrite_rule( '^claim/?$', 'index.php?fm_cash_claim=1', 'top' );
		add_rewrite_rule( '^claim/([A-Za-z0-9_-]{16,64})/?$', 'index.php?fm_cash_claim=1&fm_cash_token=$matches[1]', 'top' );
	}

	public function query_vars( array $vars ): array {
		$vars[] = 'fm_cash_claim';
		$vars[] = 'fm_cash_token';

		return $vars;
	}

	public function handle_request(): void {
		if ( is_admin() || ! $this->is_claim_request() ) {
			return;
		}

		wp_enqueue_style(
			'fm-cash-claims-claim',
			FM_CASH_CLAIMS_URL . 'assets/css/claim.css',
			array(),
			FM_CASH_CLAIMS_VERSION
		);

		wp_enqueue_script(
			'fm-cash-claims-claim',
			FM_CASH_CLAIMS_URL . 'assets/js/claim.js',
			array(),
			FM_CASH_CLAIMS_VERSION,
			true
		);

		$token = $this->get_token();
		if ( '' === $token ) {
			$this->render_error(
				__( 'Coupon code missing', 'fm-cash-claims' ),
				__( 'This link does not contain a valid coupon code. Please scan the QR code on your coupon again.', 'fm-cash-claims' ),
				400
			);
			return;
		}

		$ip         = $this->db->get_client_ip();
		$user_agent = isset( $_SERVER['HTTP_USER_AGENT'] ) && is_string( $_SERVER['HTTP_USER_AGENT'] )
			? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) )
			: '';

		$coupon = $this->db->get_coupon_by_token( $token );
		if ( ! $coupon ) {
			if ( ! current_user_can( 'manage_options' ) ) {
				$rate_key   = 'fm_cash_rl_' . md5( $ip ?? 'unknown' );
				$rate_count = (int) get_transient( $rate_key );

				if ( $rate_count >= self::RATE_LIMIT ) {
					$this->db->log_scan( $token, null, 'rate_limited', $ip, $user_agent );
					$this->render_error(
						__( 'Too many attempts', 'fm-cash-claims' ),
						__( 'Too many invalid coupon checks were made from this connection. Please wait an hour and try again.', 'fm-cash-claims' ),
						429
					);
					return;
				}

				set_transient( $rate_key, $rate_count + 1, HOUR_IN_SECONDS );
			}

			$this->db->log_scan( $token, null, 'not_found', $ip, $user_agent );
			$this->render_error(
				__( 'Coupon not found', 'fm-cash-claims' ),
				__( 'This coupon code is not recognised. Check that you scanned the correct QR code, or contact Fresh Masala support.', 'fm-cash-claims' ),
				404
			);
			return;
		}

		$batch = $this->db->get_batch( (string) $coupon->batch_id );
		if ( ! $batch || 'void' === (string) $batch->status ) {
			$this->db->log_scan( $token, (int) $coupon->id, 'batch_unavailable', $ip, $user_agent );
			$this->render_error(
				__( 'Campaign unavailable', 'fm-cash-claims' ),
				__( 'This cash prize campaign is not available. Please contact Fresh Masala support.', 'fm-cash-claims' ),
				410
			);
			return;
		}

		$claim = $this->db->get_claim_by_coupon( (int) $coupon->id );

		if ( $claim ) {
			if ( 'pending' === (string) $claim->status && $this->consume_success_key( $coupon, $claim ) ) {
				$this->db->log_scan( $token, (int) $coupon->id, 'claim_success_view', $ip, $user_agent );
				$this->render_success( $coupon, $claim, $batch );
				return;
			}

			if ( 'paid' === (string) $claim->status ) {
				$this->db->log_scan( $token, (int) $coupon->id, 'already_paid', $ip, $user_agent );
				$this->render_status( $coupon, $claim, $batch );
				return;
			}

			if ( 'rejected' === (string) $claim->status ) {
				$this->db->log_scan( $token, (int) $coupon->id, 'already_rejected', $ip, $user_agent );
				$this->render_status( $coupon, $claim, $batch );
				return;
			}

			$this->db->log_scan( $token, (int) $coupon->id, 'already_claimed', $ip, $user_agent );
			$this->render_status( $coupon, $claim, $batch );
			return;
		}

		if ( ! $this->db->is_batch_open( $batch ) ) {
			$this->db->log_scan( $token, (int) $coupon->id, 'closed', $ip, $user_agent );
			$this->render_error(
				__( 'Claim window closed', 'fm-cash-claims' ),
				__( 'The claim window for this cash prize campaign has closed. Please contact Fresh Masala support if you believe this is a mistake.', 'fm-cash-claims' ),
				410
			);
			return;
		}

		if ( 'void' === (string) $coupon->status ) {
			$this->db->log_scan( $token, (int) $coupon->id, 'void', $ip, $user_agent );
			$this->render_error(
				__( 'Coupon void', 'fm-cash-claims' ),
				__( 'This coupon has been voided and cannot be claimed. Please contact Fresh Masala support.', 'fm-cash-claims' ),
				410
			);
			return;
		}

		if ( 'issued' !== (string) $coupon->status ) {
			$this->db->log_scan( $token, (int) $coupon->id, 'invalid_state', $ip, $user_agent );
			$this->render_error(
				__( 'Coupon unavailable', 'fm-cash-claims' ),
				__( 'This coupon is not currently available for claiming. Please contact Fresh Masala support.', 'fm-cash-claims' ),
				409
			);
			return;
		}

		$request_method = isset( $_SERVER['REQUEST_METHOD'] ) && is_string( $_SERVER['REQUEST_METHOD'] )
			? $_SERVER['REQUEST_METHOD']
			: 'GET';
		if ( 'POST' === $request_method ) {
			$this->handle_post( $coupon, $batch, $ip, $user_agent );
			return;
		}

		$this->render_form( $coupon, $batch );
	}

	private function handle_post( object $coupon, object $batch, ?string $ip, string $user_agent ): void {
		$nonce = $this->post_string( 'fm_cash_nonce' );

		if ( ! wp_verify_nonce( $nonce, 'fm_cash_claim_' . (int) $coupon->id ) ) {
			$this->db->log_scan( (string) $coupon->qr_token, (int) $coupon->id, 'invalid_nonce', $ip, $user_agent );
			$this->render_form(
				$coupon,
				$batch,
				array( __( 'Your session expired. Please review the form and submit it again.', 'fm-cash-claims' ) ),
				$this->posted_values(),
				403
			);
			return;
		}

		$honeypot = trim( $this->post_string( 'website' ) );
		if ( '' !== $honeypot ) {
			$this->db->log_scan( (string) $coupon->qr_token, (int) $coupon->id, 'honeypot', $ip, $user_agent );
			$this->render_error(
				__( 'Claim not accepted', 'fm-cash-claims' ),
				__( 'The claim could not be submitted. Please try again from a normal browser.', 'fm-cash-claims' ),
				400
			);
			return;
		}

		$values = $this->posted_values();
		$values['claimant_phone'] = $this->normalize_phone( $values['claimant_phone'] );
		$values['claimant_pan']   = $this->normalize_pan( $values['claimant_pan'] );

		$errors = $this->validate_claimant( $values );
		if ( array() !== $errors ) {
			$this->db->log_scan( (string) $coupon->qr_token, (int) $coupon->id, 'invalid_input', $ip, $user_agent );
			$this->render_form( $coupon, $batch, $errors, $values, 422 );
			return;
		}

		$max_claims = (int) FM_Cash_Claims_Settings::get( 'max_claims_per_phone', 0 );
		if ( $max_claims > 0 && $this->db->count_claims_for_phone( $values['claimant_phone'] ) >= $max_claims ) {
			$this->db->log_scan( (string) $coupon->qr_token, (int) $coupon->id, 'phone_limit', $ip, $user_agent );
			$this->render_error(
				__( 'Claim limit reached', 'fm-cash-claims' ),
				__( 'This phone number has reached the maximum number of cash prize claims. Please contact Fresh Masala support if you believe this is a mistake.', 'fm-cash-claims' ),
				409
			);
			return;
		}

		$claim = $this->db->create_claim(
			(int) $coupon->id,
			$values['claimant_name'],
			$values['claimant_phone'],
			'' === $values['claimant_pan'] ? null : $values['claimant_pan'],
			$ip
		);

		if ( is_wp_error( $claim ) ) {
			$code = $claim->get_error_code();

			if ( 'already_claimed' === $code ) {
				$this->db->log_scan( (string) $coupon->qr_token, (int) $coupon->id, 'already_claimed_race', $ip, $user_agent );
				$existing = $this->db->get_claim_by_coupon( (int) $coupon->id );
				if ( $existing ) {
					$this->render_status( $coupon, $existing, $batch );
				} else {
					$this->render_error(
						__( 'Coupon already claimed', 'fm-cash-claims' ),
						__( 'This coupon has already been claimed. The first complete claim submission wins.', 'fm-cash-claims' ),
						409
					);
				}
				return;
			}

			$this->db->log_scan( (string) $coupon->qr_token, (int) $coupon->id, 'db_error', $ip, $user_agent );
			$this->render_error(
				__( 'Claim could not be saved', 'fm-cash-claims' ),
				__( 'We could not save your claim. Please try again. If the problem continues, contact Fresh Masala support.', 'fm-cash-claims' ),
				500
			);
			return;
		}

		$this->db->log_scan( (string) $coupon->qr_token, (int) $coupon->id, 'claimed', $ip, $user_agent );
		$this->send_admin_notification( $claim, $coupon, $batch );

		$success_key = wp_generate_password( 32, false, false );
		set_transient(
			$this->success_key_name( $success_key ),
			array(
				'claim_id'  => (int) $claim->id,
				'coupon_id' => (int) $coupon->id,
			),
			self::SUCCESS_TTL
		);

		wp_safe_redirect(
			add_query_arg(
				'success',
				$success_key,
				FM_Cash_Claims_Util::claim_url( (string) $coupon->qr_token )
			)
		);
		exit;
	}

	/**
	 * A one-time key lets the submitting browser see the success receipt without
	 * exposing claimant details to anyone else who scans the same coupon.
	 */
	private function consume_success_key( object $coupon, object $claim ): bool {
		if ( ! isset( $_GET['success'] ) || ! is_string( $_GET['success'] ) ) {
			return false;
		}

		$key = sanitize_text_field( wp_unslash( $_GET['success'] ) );
		if ( '' === $key ) {
			return false;
		}

		$stored = get_transient( $this->success_key_name( $key ) );
		if ( ! is_array( $stored ) ) {
			return false;
		}

		$claim_id  = (int) ( $stored['claim_id'] ?? 0 );
		$coupon_id = (int) ( $stored['coupon_id'] ?? 0 );

		if ( $claim_id !== (int) $claim->id || $coupon_id !== (int) $coupon->id ) {
			return false;
		}

		delete_transient( $this->success_key_name( $key ) );

		return true;
	}

	private function success_key_name( string $key ): string {
		return 'fm_cash_claim_success_' . hash( 'sha256', $key );
	}

	private function posted_values(): array {
		return array(
			'claimant_name'  => trim( $this->post_string( 'claimant_name' ) ),
			'claimant_phone' => trim( $this->post_string( 'claimant_phone' ) ),
			'claimant_pan'   => trim( $this->post_string( 'claimant_pan' ) ),
			'terms'          => isset( $_POST['terms'] )
				&& is_scalar( $_POST['terms'] )
				&& '1' === (string) wp_unslash( (string) $_POST['terms'] ),
		);
	}

	/**
	 * Read a scalar POST value without array-to-string warnings.
	 */
	private function post_string( string $key ): string {
		if ( ! isset( $_POST[ $key ] ) || ! is_string( $_POST[ $key ] ) ) {
			return '';
		}

		return sanitize_text_field( wp_unslash( $_POST[ $key ] ) );
	}

	private function validate_claimant( array $values ): array {
		$errors = array();
		$name   = trim( (string) $values['claimant_name'] );
		$phone  = (string) $values['claimant_phone'];
		$pan    = (string) $values['claimant_pan'];

		if ( mb_strlen( $name ) < 2 ) {
			$errors[] = __( 'Please enter your full name.', 'fm-cash-claims' );
		} elseif ( mb_strlen( $name ) > 120 ) {
			$errors[] = __( 'The name is too long. Please use 120 characters or fewer.', 'fm-cash-claims' );
		}

		if ( ! preg_match( '/^9\d{9}$/', $phone ) ) {
			$errors[] = __( 'Enter a valid 10-digit mobile number, for example 9801234567.', 'fm-cash-claims' );
		}

		if ( '' !== $pan && ! preg_match( '/^\d{9}$/', $pan ) ) {
			$errors[] = __( 'PAN must be exactly 9 digits, or leave it blank.', 'fm-cash-claims' );
		}

		if ( empty( $values['terms'] ) ) {
			$errors[] = __( 'Please confirm the claim declaration before submitting.', 'fm-cash-claims' );
		}

		return $errors;
	}

	private function normalize_phone( string $phone ): string {
		$digits = preg_replace( '/\D+/', '', $phone ) ?? '';

		if ( 13 === strlen( $digits ) && str_starts_with( $digits, '977' ) ) {
			$digits = substr( $digits, 3 );
		}

		if ( 11 === strlen( $digits ) && str_starts_with( $digits, '0' ) ) {
			$digits = substr( $digits, 1 );
		}

		return $digits;
	}

	private function normalize_pan( string $pan ): string {
		return preg_replace( '/[^0-9]/', '', $pan ) ?? '';
	}

	private function render_form( object $coupon, object $batch, array $errors = array(), array $old = array(), int $status = 200 ): void {
		$this->send_headers( $status );

		$settings      = FM_Cash_Claims_Settings::get_all();
		$claim_url     = FM_Cash_Claims_Util::claim_url( (string) $coupon->qr_token );
		$nonce         = wp_create_nonce( 'fm_cash_claim_' . (int) $coupon->id );
		$prize_display = FM_Cash_Claims_Util::format_amount( (float) $coupon->prize_amount, (string) $coupon->currency );

		include FM_CASH_CLAIMS_DIR . 'templates/claim-form.php';
		exit;
	}

	private function render_success( object $coupon, object $claim, object $batch ): void {
		$this->send_headers( 200 );

		$settings      = FM_Cash_Claims_Settings::get_all();
		$claim_url     = FM_Cash_Claims_Util::claim_url( (string) $coupon->qr_token );
		$prize_display = FM_Cash_Claims_Util::format_amount( (float) $coupon->prize_amount, (string) $coupon->currency );

		include FM_CASH_CLAIMS_DIR . 'templates/claim-success.php';
		exit;
	}

	private function render_status( object $coupon, object $claim, object $batch ): void {
		$this->send_headers( 200 );

		$settings      = FM_Cash_Claims_Settings::get_all();
		$claim_url     = FM_Cash_Claims_Util::claim_url( (string) $coupon->qr_token );
		$prize_display = FM_Cash_Claims_Util::format_amount( (float) $coupon->prize_amount, (string) $coupon->currency );

		include FM_CASH_CLAIMS_DIR . 'templates/claim-status.php';
		exit;
	}

	private function render_error( string $title, string $message, int $status = 400 ): void {
		$this->send_headers( $status );

		$settings = FM_Cash_Claims_Settings::get_all();

		include FM_CASH_CLAIMS_DIR . 'templates/claim-error.php';
		exit;
	}

	private function send_headers( int $status ): void {
		nocache_headers();
		status_header( $status );
		header( 'X-Robots-Tag: noindex, nofollow, noarchive', true );
		header( 'Referrer-Policy: no-referrer', true );
		header( 'X-Content-Type-Options: nosniff', true );

		add_filter( 'wp_robots', array( $this, 'filter_robots' ) );
	}

	public function filter_robots( array $robots ): array {
		$robots['noindex']   = true;
		$robots['nofollow']  = true;
		$robots['noarchive'] = true;

		return $robots;
	}

	private function send_admin_notification( object $claim, object $coupon, object $batch ): void {
		$to = (string) FM_Cash_Claims_Settings::get( 'admin_notification_email', '' );
		if ( ! is_email( $to ) ) {
			$to = (string) get_option( 'admin_email' );
		}

		if ( ! is_email( $to ) ) {
			return;
		}

		$prize_display = FM_Cash_Claims_Util::format_amount( (float) $coupon->prize_amount, (string) $coupon->currency );
		$subject       = sprintf(
			/* translators: 1: coupon code, 2: prize amount */
			__( '[Cash Claim] %1$s — %2$s', 'fm-cash-claims' ),
			(string) $coupon->coupon_code,
			$prize_display
		);

		$lines = array(
			__( 'A new cash prize claim was submitted.', 'fm-cash-claims' ),
			'',
			sprintf( __( 'Claim reference: %s', 'fm-cash-claims' ), (string) $claim->claim_ref ),
			sprintf( __( 'Batch: %s', 'fm-cash-claims' ), (string) $batch->batch_id ),
			sprintf( __( 'Coupon code: %s', 'fm-cash-claims' ), (string) $coupon->coupon_code ),
			sprintf( __( 'Prize: %s', 'fm-cash-claims' ), $prize_display ),
			sprintf( __( 'Name: %s', 'fm-cash-claims' ), (string) $claim->claimant_name ),
			sprintf( __( 'Phone: %s', 'fm-cash-claims' ), (string) $claim->claimant_phone ),
			sprintf( __( 'PAN: %s', 'fm-cash-claims' ), (string) ( $claim->claimant_pan ?: '—' ) ),
			sprintf( __( 'Submitted: %s UTC', 'fm-cash-claims' ), (string) $claim->claimed_at ),
			'',
			__( 'Open the payout dashboard:', 'fm-cash-claims' ),
			FM_Cash_Claims_Util::admin_claim_url( (int) $claim->id ),
		);

		wp_mail( $to, $subject, implode( "\n", $lines ) );
	}

	private function is_claim_request(): bool {
		if ( get_query_var( 'fm_cash_claim' ) ) {
			return true;
		}

		if ( isset( $_GET['fm_cash_claim'] ) ) {
			return true;
		}

		$claim_path   = $this->get_claim_path();
		$request_path = $this->get_request_path();

		return $request_path === $claim_path || str_starts_with( $request_path, $claim_path . '/' );
	}

	private function get_token(): string {
		$query_token = get_query_var( 'fm_cash_token' );
		$token       = is_string( $query_token ) ? $query_token : '';

		if ( '' === $token && isset( $_GET['t'] ) && is_string( $_GET['t'] ) ) {
			$token = (string) wp_unslash( $_GET['t'] );
		}

		if ( '' === $token && isset( $_GET['token'] ) && is_string( $_GET['token'] ) ) {
			$token = (string) wp_unslash( $_GET['token'] );
		}

		if ( '' === $token ) {
			$request_path = $this->get_request_path();
			$claim_path   = $this->get_claim_path();

			if ( str_starts_with( $request_path, $claim_path . '/' ) ) {
				$token = substr( $request_path, strlen( $claim_path ) + 1 );
			}
		}

		$token = sanitize_text_field( $token );

		return preg_match( '/^[A-Za-z0-9_-]{16,64}$/', $token ) ? $token : '';
	}

	private function get_claim_path(): string {
		$path = (string) wp_parse_url( home_url( '/claim/' ), PHP_URL_PATH );

		return untrailingslashit( '' === $path ? '/claim' : $path );
	}

	private function get_request_path(): string {
		$request_uri = isset( $_SERVER['REQUEST_URI'] ) && is_string( $_SERVER['REQUEST_URI'] )
			? wp_unslash( $_SERVER['REQUEST_URI'] )
			: '';

		return untrailingslashit( (string) wp_parse_url( $request_uri, PHP_URL_PATH ) );
	}
}
