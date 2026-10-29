<?php
/**
 * Verification Page Controller, Routing, and Activation Handler.
 *
 * @package FM_Festive_Draw
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles the public /verify/ endpoint, rate limiting, token security, and customer activations.
 */
class FM_Verify {

	/**
	 * Database handler.
	 *
	 * @var FM_DB
	 */
	private FM_DB $db;

	/**
	 * Maximum verification requests allowed per IP per hour.
	 */
	public const RATE_LIMIT_MAX = 20;

	/**
	 * Rate limit window in seconds (1 hour).
	 */
	public const RATE_LIMIT_WINDOW = 3600;

	/**
	 * Constructor.
	 *
	 * @param FM_DB $db Database instance.
	 */
	public function __construct( FM_DB $db ) {
		$this->db = $db;

		add_action( 'init', [ $this, 'register_rewrite_rules' ] );
		add_filter( 'query_vars', [ $this, 'register_query_vars' ] );
		add_action( 'template_redirect', [ $this, 'handle_verification_request' ] );
	}

	/**
	 * Register URL rewrite rules for /verify/ and /verify/{token} endpoints.
	 */
	public function register_rewrite_rules(): void {
		add_rewrite_rule( '^verify/([A-Za-z0-9_-]{4,64})/?$', 'index.php?fm_verify=1&t=$matches[1]', 'top' );
		add_rewrite_rule( '^verify/?$', 'index.php?fm_verify=1', 'top' );
	}

	/**
	 * Register custom query variables.
	 *
	 * @param array $vars Existing query vars.
	 * @return array
	 */
	public function register_query_vars( array $vars ): array {
		$vars[] = 'fm_verify';
		$vars[] = 't';
		$vars[] = 'token';
		$vars[] = 'code';
		$vars[] = 'qr_token';
		$vars[] = 'coupon';
		$vars[] = 'coupon_code';
		return $vars;
	}

	/**
	 * Extracts raw token or coupon code flexibly from query parameters, query vars, or URI path.
	 *
	 * @return string
	 */
	public static function extract_raw_token(): string {
		$candidates = [
			get_query_var( 't' ),
			get_query_var( 'token' ),
			get_query_var( 'code' ),
			get_query_var( 'qr_token' ),
			get_query_var( 'coupon' ),
			get_query_var( 'coupon_code' ),
			$_REQUEST['t'] ?? '',
			$_REQUEST['token'] ?? '',
			$_REQUEST['code'] ?? '',
			$_REQUEST['qr_token'] ?? '',
			$_REQUEST['coupon'] ?? '',
			$_REQUEST['coupon_code'] ?? '',
			$_GET['t'] ?? '',
			$_GET['token'] ?? '',
			$_GET['code'] ?? '',
			$_GET['qr_token'] ?? '',
			$_GET['coupon'] ?? '',
			$_GET['coupon_code'] ?? '',
		];

		foreach ( $candidates as $candidate ) {
			if ( is_string( $candidate ) && '' !== trim( $candidate ) ) {
				$val = trim( $candidate );
				// If full URL was passed by a scanner app, parse query parameters or path.
				if ( str_starts_with( $val, 'http://' ) || str_starts_with( $val, 'https://' ) ) {
					$url_query = parse_url( $val, PHP_URL_QUERY );
					if ( $url_query ) {
						parse_str( $url_query, $parsed_query );
						foreach ( [ 't', 'token', 'code', 'qr_token', 'coupon', 'coupon_code' ] as $param ) {
							if ( ! empty( $parsed_query[ $param ] ) && is_string( $parsed_query[ $param ] ) ) {
								return sanitize_text_field( trim( $parsed_query[ $param ] ) );
							}
						}
					}
					$url_path = trim( (string) parse_url( $val, PHP_URL_PATH ), '/' );
					$parts    = explode( '/', $url_path );
					$idx      = array_search( 'verify', $parts, true );
					if ( false !== $idx && isset( $parts[ $idx + 1 ] ) && '' !== trim( $parts[ $idx + 1 ] ) ) {
						return sanitize_text_field( trim( $parts[ $idx + 1 ] ) );
					}
				}
				return sanitize_text_field( $val );
			}
		}

		// Fallback: Check request URI path (e.g. /verify/XYZ123 or /plugin/verify/XYZ123).
		$req_uri = $_SERVER['REQUEST_URI'] ?? '';
		$path    = trim( (string) parse_url( $req_uri, PHP_URL_PATH ), '/' );
		$parts   = explode( '/', $path );
		$idx     = array_search( 'verify', $parts, true );
		if ( false !== $idx && isset( $parts[ $idx + 1 ] ) && '' !== trim( $parts[ $idx + 1 ] ) ) {
			return sanitize_text_field( trim( $parts[ $idx + 1 ] ) );
		}

		return '';
	}

	/**
	 * Format/normalize Nepali phone number.
	 *
	 * @param string $phone Raw phone input.
	 * @return string|null 10-digit Nepali phone (e.g. 9812345678) or null if invalid.
	 */
	public static function normalize_nepali_phone( string $phone ): ?string {
		$cleaned = preg_replace( '/[\s\-\(\)]/', '', trim( $phone ) );

		// Remove +977 or 977 prefix if present.
		if ( str_starts_with( $cleaned, '+977' ) ) {
			$cleaned = substr( $cleaned, 4 );
		} elseif ( str_starts_with( $cleaned, '977' ) && strlen( $cleaned ) === 13 ) {
			$cleaned = substr( $cleaned, 3 );
		}

		// Nepali mobile format: 10 digits starting with 98 or 97.
		if ( preg_match( '/^(98|97)\d{8}$/', $cleaned ) ) {
			return $cleaned;
		}

		return null;
	}

	/**
	 * Masks a phone number for privacy display (e.g. 98XXXXXX21).
	 *
	 * @param string|null $phone 10-digit or raw phone.
	 * @return string
	 */
	public static function mask_phone( ?string $phone ): string {
		if ( empty( $phone ) ) {
			return '**********';
		}
		$clean = trim( $phone );
		$len   = strlen( $clean );
		if ( $len >= 10 ) {
			return substr( $clean, 0, 2 ) . 'XXXXXX' . substr( $clean, -2 );
		}
		return substr( $clean, 0, 2 ) . str_repeat( 'X', max( 0, $len - 4 ) ) . substr( $clean, -2 );
	}

	/**
	 * Checks and increments rate limit counter for client IP.
	 *
	 * @param string $ip Client IP address.
	 * @return bool True if within limits, False if rate limited.
	 */
	private function check_rate_limit( string $ip ): bool {
		$ip_hash      = hash( 'sha256', $ip );
		$transient_key = 'fm_rl_' . substr( $ip_hash, 0, 32 );
		$current_count = (int) get_transient( $transient_key );

		if ( $current_count >= self::RATE_LIMIT_MAX ) {
			return false;
		}

		if ( 0 === $current_count ) {
			set_transient( $transient_key, 1, self::RATE_LIMIT_WINDOW );
		} else {
			// Increment count while retaining existing expiration window.
			set_transient( $transient_key, $current_count + 1, self::RATE_LIMIT_WINDOW );
		}

		return true;
	}

	/**
	 * Intercepts verification page requests and renders standalone template.
	 */
	public function handle_verification_request(): void {
		$has_token_param = (
			! empty( get_query_var( 't' ) ) ||
			! empty( get_query_var( 'token' ) ) ||
			! empty( get_query_var( 'qr_token' ) ) ||
			! empty( get_query_var( 'coupon' ) ) ||
			! empty( get_query_var( 'coupon_code' ) ) ||
			! empty( get_query_var( 'code' ) ) ||
			isset( $_GET['t'] ) ||
			isset( $_GET['token'] ) ||
			isset( $_GET['qr_token'] ) ||
			isset( $_GET['coupon'] ) ||
			isset( $_GET['coupon_code'] ) ||
			isset( $_GET['code'] ) ||
			isset( $_GET['fm_verify'] ) ||
			'1' === get_query_var( 'fm_verify' ) ||
			false !== strpos( $_SERVER['REQUEST_URI'] ?? '', '/verify' )
		);

		if ( ! $has_token_param ) {
			return;
		}

		// Enforce HTTPS safely on production domains without breaking local/dev.
		$host     = $_SERVER['HTTP_HOST'] ?? '';
		$is_local = ( 'localhost' === $host || str_starts_with( $host, '127.0.0.1' ) || str_ends_with( $host, '.local' ) || str_ends_with( $host, '.test' ) );
		if ( ! $is_local && ! is_ssl() && ( empty( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) || 'https' !== strtolower( (string) $_SERVER['HTTP_X_FORWARDED_PROTO'] ) ) ) {
			if ( ! empty( $host ) && ! empty( $_SERVER['REQUEST_URI'] ) ) {
				$https_url = 'https://' . $host . $_SERVER['REQUEST_URI'];
				wp_safe_redirect( $https_url, 301 );
				exit;
			}
		}

		$client_ip = $this->db->get_client_ip();

		// Set essential security headers before outputting anything.
		nocache_headers();
		header( 'X-Robots-Tag: noindex, nofollow', true );
		header( 'Referrer-Policy: no-referrer', true );
		header( 'X-Content-Type-Options: nosniff', true );
		header( 'X-Frame-Options: SAMEORIGIN', true );

		// STEP 1: RATE LIMIT FIRST (prior to any database lookup).
		if ( ! $this->check_rate_limit( $client_ip ) ) {
			$raw_token = self::extract_raw_token();
			$this->db->log_scan( $raw_token, 'rate_limited', $client_ip );
			$this->render_error_page(
				__( 'Too Many Attempts', 'fm-festive-draw' ),
				__( 'Too many attempts, please try again later.', 'fm-festive-draw' ),
				429
			);
			exit;
		}

		// STEP 2: EXTRACT AND VALIDATE FORMAT.
		$raw_token = self::extract_raw_token();
		$is_valid_format = (
			preg_match( '/^[A-Za-z0-9_-]{3,64}$/', $raw_token )
		);

		if ( empty( $raw_token ) || ! $is_valid_format ) {
			$this->db->log_scan( $raw_token, 'invalid_format', $client_ip );
			$this->render_generic_invalid_coupon_page();
			exit;
		}

		// STEP 3: LOOK UP TOKEN WITH PREPARED STATEMENT.
		global $wpdb;
		$coupons_table = $this->db->get_coupons_table();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$coupon = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$coupons_table} WHERE qr_token = %s OR coupon_code = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$raw_token,
				$raw_token
			),
			ARRAY_A
		);

		if ( empty( $coupon ) ) {
			$this->db->log_scan( $raw_token, 'not_found', $client_ip );
			// Renders the EXACT same generic page as Step 2 to prevent token enumeration.
			$this->render_generic_invalid_coupon_page();
			exit;
		}

		// STEP 4: IF STATUS IS ALREADY 'activated', 'won', OR 'claimed'.
		if ( in_array( $coupon['status'], [ 'activated', 'won', 'claimed' ], true ) ) {
			$this->db->log_scan( $raw_token, 'already_used', $client_ip );
			$this->render_already_used_page( $coupon );
			exit;
		}

		// STEP 5: IF CAMPAIGN IS NOT CURRENTLY INSIDE A CONFIGURED WEEK WINDOW.
		$current_week = fm_current_week();
		if ( null === $current_week ) {
			// If admin is logged in, allow them to test/preview or alert them to set dates
			if ( current_user_can( 'manage_options' ) ) {
				$current_week = 1; // Default to week 1 for admin preview/test
			} else {
				$this->db->log_scan( $raw_token, 'outside_window', $client_ip );
				$this->render_error_page(
					__( 'Campaign Not Open', 'fm-festive-draw' ),
					__( 'The campaign is not currently open for registration.', 'fm-festive-draw' ),
					200
				);
				exit;
			}
		}

		// STEP 6 & 7: ACTIVATION FORM AND SUBMISSION.
		if ( 'POST' === ( $_SERVER['REQUEST_METHOD'] ?? 'GET' ) && isset( $_POST['fm_action'] ) && 'activate_coupon' === $_POST['fm_action'] ) {
			$this->process_activation_submission( $raw_token, $coupon, $current_week, $client_ip );
			exit;
		}

		// Render the customer activation form.
		$this->render_activation_form( $coupon, $current_week, null, $raw_token );
		exit;
	}

	/**
	 * Process form submission with row lock and server-side re-verification.
	 *
	 * @param string $raw_token   Validated QR Token.
	 * @param array  $coupon      Initial coupon row.
	 * @param int    $current_week Active week index (1-4).
	 * @param string $client_ip   Client IP string.
	 */
	private function process_activation_submission( string $raw_token, array $coupon, int $current_week, string $client_ip ): void {
		// Nonce verification.
		if ( ! isset( $_POST['fm_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['fm_nonce'] ) ), 'fm_activate_token' ) ) {
			$this->render_activation_form(
				$coupon,
				$current_week,
				__( 'Your session expired. Please submit the form again.', 'fm-festive-draw' ),
				$raw_token
			);
			return;
		}

		$participant_name = sanitize_text_field( wp_unslash( $_POST['participant_name'] ?? '' ) );
		$raw_phone        = sanitize_text_field( wp_unslash( $_POST['participant_phone'] ?? '' ) );
		$terms_accepted   = ! empty( $_POST['terms_accepted'] );

		// Validation rules.
		$errors = [];
		if ( mb_strlen( $participant_name ) < 2 || mb_strlen( $participant_name ) > 120 ) {
			$errors[] = __( 'Please enter your full name (2–120 characters).', 'fm-festive-draw' );
		}

		$normalized_phone = self::normalize_nepali_phone( $raw_phone );
		if ( null === $normalized_phone ) {
			$errors[] = __( 'Please enter a valid 10-digit Nepali mobile number (starting with 98 or 97).', 'fm-festive-draw' );
		}

		if ( ! $terms_accepted ) {
			$errors[] = __( 'You must confirm that you are 18 years or older and accept the campaign terms.', 'fm-festive-draw' );
		}

		if ( ! empty( $errors ) ) {
			$this->render_activation_form( $coupon, $current_week, implode( '<br>', $errors ), $raw_token );
			return;
		}

		global $wpdb;
		$coupons_table = $this->db->get_coupons_table();

		// Server-side atomic verification with row-level transaction lock (SELECT ... FOR UPDATE).
		$wpdb->query( 'START TRANSACTION' );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$locked_coupon = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT id, coupon_code, qr_token, status FROM {$coupons_table} WHERE id = %d OR qr_token = %s OR coupon_code = %s FOR UPDATE", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				(int) ( $coupon['id'] ?? 0 ),
				$raw_token,
				$raw_token
			),
			ARRAY_A
		);

		if ( empty( $locked_coupon ) || 'issued' !== $locked_coupon['status'] ) {
			$wpdb->query( 'ROLLBACK' );
			$this->db->log_scan( $raw_token, 'already_used', $client_ip );
			$this->render_error_page(
				__( 'Coupon Already Entered', 'fm-festive-draw' ),
				__( 'This coupon has already been entered.', 'fm-festive-draw' )
			);
			return;
		}

		// Re-verify current campaign week window inside transaction.
		$active_week = fm_current_week();
		if ( null === $active_week ) {
			$wpdb->query( 'ROLLBACK' );
			$this->db->log_scan( $raw_token, 'outside_window', $client_ip );
			$this->render_error_page(
				__( 'Campaign Closed', 'fm-festive-draw' ),
				__( 'The campaign is not currently open.', 'fm-festive-draw' )
			);
			return;
		}

		$binary_ip   = $this->db->ip_to_binary( $client_ip );
		$activated_at = current_time( 'mysql' );

		// Execute status update.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$updated = $wpdb->query(
			$wpdb->prepare(
				"UPDATE {$coupons_table} SET status = 'activated', week_number = %d, participant_name = %s, participant_phone = %s, activated_at = %s, activated_ip = %s WHERE id = %d AND status = 'issued'", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$active_week,
				$participant_name,
				$normalized_phone,
				$activated_at,
				$binary_ip,
				(int) $locked_coupon['id']
			)
		);

		if ( false === $updated || 0 === $updated ) {
			$wpdb->query( 'ROLLBACK' );
			$this->render_error_page(
				__( 'Submission Error', 'fm-festive-draw' ),
				__( 'An error occurred while saving your entry. Please try again.', 'fm-festive-draw' )
			);
			return;
		}

		$wpdb->query( 'COMMIT' );

		// Log successful activation audit.
		$this->db->log_scan( $raw_token, 'valid', $client_ip );

		// Render success screen (NEVER outputting qr_token).
		$this->render_success_page( $locked_coupon['coupon_code'], $active_week, $participant_name, $normalized_phone );
	}

	/**
	 * Generic Byte-for-Byte identical error template for invalid format & not found.
	 */
	private function render_generic_invalid_coupon_page(): void {
		$this->render_error_page(
			__( 'Invalid Coupon', 'fm-festive-draw' ),
			__( 'Invalid or unrecognized coupon. Please verify your printed card or QR code.', 'fm-festive-draw' ),
			404
		);
	}

	/**
	 * Renders Already Used notification page.
	 *
	 * @param array $coupon Coupon database row.
	 */
	private function render_already_used_page( array $coupon ): void {
		$coupon_code    = esc_html( $coupon['coupon_code'] );
		$activated_time = ! empty( $coupon['activated_at'] ) ? esc_html( wp_date( 'M j, Y g:i A', strtotime( $coupon['activated_at'] ) ) ) : __( 'Earlier', 'fm-festive-draw' );
		$masked_phone   = esc_html( self::mask_phone( $coupon['participant_phone'] ?? '' ) );

		include FM_FESTIVE_DRAW_DIR . 'templates/verify-error.php';
	}

	/**
	 * Generic error view renderer.
	 *
	 * @param string $title Error title.
	 * @param string $message Error message.
	 * @param int    $http_status HTTP status code.
	 */
	private function render_error_page( string $title, string $message, int $http_status = 200 ): void {
		status_header( $http_status );
		include FM_FESTIVE_DRAW_DIR . 'templates/verify-error.php';
	}

	/**
	 * Customer activation form renderer.
	 *
	 * @param array       $coupon       Coupon record.
	 * @param int         $current_week Active week (1-4).
	 * @param string|null $error_msg    Validation error message if any.
	 * @param string      $raw_token    Original validated token or code.
	 */
	private function render_activation_form( array $coupon, int $current_week, ?string $error_msg = null, string $raw_token = '' ): void {
		$week_config = fm_get_week_config( $current_week );
		$prizes_raw  = $week_config['prizes'] ?? '';
		$prizes      = array_filter( array_map( 'trim', explode( "\n", (string) $prizes_raw ) ) );
		$week_title  = $week_config['title'] ?? sprintf( __( 'Week %d', 'fm-festive-draw' ), $current_week );

		include FM_FESTIVE_DRAW_DIR . 'templates/verify-form.php';
	}

	/**
	 * Success celebration screen renderer.
	 *
	 * @param string $coupon_code Verified coupon code (FM-XXXXX).
	 * @param int    $week_number Active week number.
	 * @param string $name        Participant name.
	 * @param string $phone       Participant phone.
	 */
	private function render_success_page( string $coupon_code, int $week_number, string $name, string $phone ): void {
		$week_config = fm_get_week_config( $week_number );
		$prizes_raw  = $week_config['prizes'] ?? '';
		$prizes      = array_filter( array_map( 'trim', explode( "\n", (string) $prizes_raw ) ) );
		$week_title  = $week_config['title'] ?? sprintf( __( 'Week %d', 'fm-festive-draw' ), $week_number );

		$end_datetime = $week_config['end_datetime'] ?? '';
		$draw_date_str = ! empty( $end_datetime ) ? wp_date( 'l, F j, Y', strtotime( $end_datetime ) ) : __( 'End of the active week', 'fm-festive-draw' );

		include FM_FESTIVE_DRAW_DIR . 'templates/verify-success.php';
	}
}
