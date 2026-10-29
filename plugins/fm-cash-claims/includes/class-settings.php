<?php
/**
 * Plugin settings and defaults.
 *
 * @package FM_Cash_Claims
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class FM_Cash_Claims_Settings {

	public const OPTION = 'fm_cash_claims_settings';

	private const DEFAULTS = array(
		'currency_symbol'          => 'Rs.',
		'terms_text'               => "I confirm that the details above are correct. I understand that the first complete claim submission wins, that only one claim is allowed per coupon, and that payment is made manually at the end of the day.",
		'support_phone'            => '',
		'support_email'            => '',
		'support_address'          => '',
		'admin_notification_email' => '',
		'claim_window_days'        => 0,
		'max_claims_per_phone'     => 0,
		'delete_data_on_uninstall' => 0,
	);

	public function init(): void {
		add_action( 'admin_init', array( $this, 'register_settings' ) );
	}

	public static function defaults(): array {
		return self::DEFAULTS;
	}

	public static function install_defaults(): void {
		if ( false === get_option( self::OPTION, false ) ) {
			add_option( self::OPTION, self::DEFAULTS );
		}
	}

	public static function get_all(): array {
		$stored = get_option( self::OPTION, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		return wp_parse_args( $stored, self::DEFAULTS );
	}

	public static function get( string $key, mixed $fallback = null ): mixed {
		$settings = self::get_all();

		return array_key_exists( $key, $settings ) ? $settings[ $key ] : $fallback;
	}

	public function register_settings(): void {
		register_setting(
			'fm_cash_claims_settings_group',
			self::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( $this, 'sanitize' ),
				'default'           => self::DEFAULTS,
				'show_in_rest'      => false,
			)
		);
	}

	public function sanitize( mixed $input ): array {
		$current = self::get_all();
		$input   = is_array( $input ) ? $input : array();

		$sanitized = $current;

		$sanitized['currency_symbol'] = sanitize_text_field(
			$this->input_string( $input, $current, 'currency_symbol' )
		);
		$sanitized['currency_symbol'] = mb_substr( $sanitized['currency_symbol'], 0, 8 );
		if ( '' === trim( $sanitized['currency_symbol'] ) ) {
			$sanitized['currency_symbol'] = self::DEFAULTS['currency_symbol'];
		}

		$sanitized['terms_text'] = sanitize_textarea_field(
			$this->input_string( $input, $current, 'terms_text' )
		);
		if ( '' === trim( $sanitized['terms_text'] ) ) {
			$sanitized['terms_text'] = self::DEFAULTS['terms_text'];
		}

		$sanitized['support_phone']   = mb_substr(
			sanitize_text_field( $this->input_string( $input, $current, 'support_phone' ) ),
			0,
			40
		);
		$sanitized['support_address'] = mb_substr(
			sanitize_textarea_field( $this->input_string( $input, $current, 'support_address' ) ),
			0,
			500
		);

		$support_email = sanitize_email( $this->input_string( $input, $current, 'support_email' ) );
		$admin_email   = sanitize_email(
			$this->input_string( $input, $current, 'admin_notification_email' )
		);

		$sanitized['support_email']            = is_email( $support_email ) ? $support_email : '';
		$sanitized['admin_notification_email'] = is_email( $admin_email ) ? $admin_email : '';

		$claim_window_days = isset( $input['claim_window_days'] ) && is_scalar( $input['claim_window_days'] )
			? absint( $input['claim_window_days'] )
			: absint( $current['claim_window_days'] );
		$max_claims        = isset( $input['max_claims_per_phone'] ) && is_scalar( $input['max_claims_per_phone'] )
			? absint( $input['max_claims_per_phone'] )
			: absint( $current['max_claims_per_phone'] );

		$sanitized['claim_window_days']        = min( 365, $claim_window_days );
		$sanitized['max_claims_per_phone']     = min( 1000, $max_claims );
		$sanitized['delete_data_on_uninstall'] = empty( $input['delete_data_on_uninstall'] ) ? 0 : 1;

		return $sanitized;
	}

	/**
	 * Read a scalar setting without triggering array-to-string warnings.
	 *
	 * @param array<string, mixed> $input   Submitted values.
	 * @param array<string, mixed> $current Existing values.
	 */
	private function input_string( array $input, array $current, string $key ): string {
		$value = $input[ $key ] ?? $current[ $key ] ?? '';

		return is_scalar( $value ) ? (string) $value : '';
	}
}
