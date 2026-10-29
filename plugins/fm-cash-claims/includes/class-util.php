<?php
/**
 * Shared display and formatting helpers.
 *
 * @package FM_Cash_Claims
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class FM_Cash_Claims_Util {

	public static function format_amount( float $amount, string $currency = 'NPR' ): string {
		$symbol   = (string) FM_Cash_Claims_Settings::get( 'currency_symbol', 'Rs.' );
		$decimals = floor( $amount ) === $amount ? 0 : 2;

		return $symbol . ' ' . number_format_i18n( $amount, $decimals );
	}

	public static function status_label( string $status ): string {
		$labels = array(
			'pending'  => __( 'Pending payout', 'fm-cash-claims' ),
			'paid'     => __( 'Paid', 'fm-cash-claims' ),
			'rejected' => __( 'Rejected', 'fm-cash-claims' ),
			'issued'   => __( 'Unclaimed', 'fm-cash-claims' ),
			'claimed'  => __( 'Claimed', 'fm-cash-claims' ),
			'void'     => __( 'Void', 'fm-cash-claims' ),
		);

		return $labels[ $status ] ?? ucfirst( $status );
	}

	public static function status_class( string $status ): string {
		return 'fm-status fm-status-' . sanitize_html_class( $status );
	}

	public static function mask_phone( string $phone ): string {
		$length = strlen( $phone );
		if ( $length <= 4 ) {
			return $phone;
		}

		return str_repeat( '•', max( 0, $length - 4 ) ) . substr( $phone, -4 );
	}

	public static function mask_pan( ?string $pan ): string {
		$pan = trim( (string) $pan );
		if ( '' === $pan ) {
			return '—';
		}

		$length = strlen( $pan );
		if ( $length <= 3 ) {
			return $pan;
		}

		return str_repeat( '•', max( 0, $length - 3 ) ) . substr( $pan, -3 );
	}

	public static function csv_safe( string $value ): string {
		if ( '' !== $value && in_array( $value[0], array( '=', '+', '-', '@', "\t", "\r" ), true ) ) {
			return "'" . $value;
		}

		return $value;
	}

	public static function claim_url( string $token ): string {
		return add_query_arg( 't', $token, home_url( '/claim/' ) );
	}

	public static function admin_claim_url( int $claim_id ): string {
		return add_query_arg(
			array(
				'page'     => 'fm-cash-claims-claims',
				'claim_id' => $claim_id,
			),
			admin_url( 'admin.php' )
		);
	}

	public static function admin_batch_url( string $batch_id ): string {
		return add_query_arg(
			array(
				'page'     => 'fm-cash-claims-batches',
				'edit'     => $batch_id,
			),
			admin_url( 'admin.php' )
		);
	}
}
