<?php
/** Run with WP-CLI eval-file after activating FM Cash Claims. */

$_SERVER['SERVER_NAME'] = 'localhost';

$coupon = (object) array(
	'id' => 1, 'coupon_code' => 'FM-54321', 'qr_token' => str_repeat( 'a', 32 ),
	'prize_amount' => '2837.49', 'currency' => 'NPR',
);
$batch = (object) array( 'batch_id' => 'PRIVATE-BATCH-ID' );
$settings = FM_Cash_Claims_Settings::get_all();
$claim_url = FM_Cash_Claims_Util::claim_url( $coupon->qr_token );
$nonce = wp_create_nonce( 'fm_cash_claim_1' );
$old = array( 'claimant_name' => '<script>alert(1)</script>' );
$prize_display = FM_Cash_Claims_Util::format_amount( (float) $coupon->prize_amount, $coupon->currency );

foreach ( array( array(), array( 'Please enter a valid phone number.' ) ) as $errors ) {
	ob_start();
	include FM_CASH_CLAIMS_DIR . 'templates/claim-form.php';
	$html = ob_get_clean();
	foreach ( array( '2837.49', '2,837.49', 'PRIVATE-BATCH-ID', 'Plugin Preview', '<script>alert(1)</script>' ) as $hidden ) {
		if ( str_contains( $html, $hidden ) ) {
			throw new RuntimeException( 'Claim form leaked: ' . $hidden );
		}
	}
	if ( ! str_contains( $html, 'fm_cash_nonce' ) || ! str_contains( $html, 'Claim &amp; reveal my prize' ) || ! str_contains( $html, '&lt;script&gt;' ) ) {
		throw new RuntimeException( 'Claim controls or escaped draft missing.' );
	}
	if ( $errors && ! str_contains( $html, $errors[0] ) ) {
		throw new RuntimeException( 'Validation errors missing.' );
	}
}

$claim = (object) array(
	'claimant_name' => 'Private Claimant', 'claimant_phone' => '9800000123',
	'claim_ref' => 'CLM-PRIVATE-REFERENCE', 'claimed_at' => '2026-11-02 00:00:00',
	'status' => 'pending', 'paid_at' => null,
);
ob_start();
include FM_CASH_CLAIMS_DIR . 'templates/claim-success.php';
$html = ob_get_clean();
if ( ! str_contains( $html, $prize_display ) || ! str_contains( $html, 'data-fm-reveal' ) || ! str_contains( $html, $claim->claim_ref ) ) {
	throw new RuntimeException( 'Successful claim must reveal the saved prize and reference.' );
}

ob_start();
include FM_CASH_CLAIMS_DIR . 'templates/claim-status.php';
$html = ob_get_clean();
foreach ( array( 'data-fm-reveal', $claim->claimant_name, $claim->claimant_phone, $claim->claim_ref ) as $hidden ) {
	if ( str_contains( $html, $hidden ) ) {
		throw new RuntimeException( 'Repeat status leaked private details or replayed the reveal.' );
	}
}
echo "PASS claim templates: amount hidden on forms and errors, revealed on success, repeat status private.\n";
