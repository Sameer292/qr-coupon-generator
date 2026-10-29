<?php
/**
 * WordPress admin dashboard, import UI, claims, payout, audit, and settings.
 *
 * @package FM_Cash_Claims
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class FM_Cash_Claims_Admin {

	private FM_Cash_Claims_DB $db;
	private FM_Cash_Claims_Importer $importer;

	public function __construct( FM_Cash_Claims_DB $db, FM_Cash_Claims_Importer $importer ) {
		$this->db       = $db;
		$this->importer = $importer;
	}

	public function init(): void {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'admin_notices', array( $this, 'render_notices' ) );
		add_action( 'admin_init', array( $this, 'handle_claims_bulk_action' ) );

		add_action( 'admin_post_fm_cash_update_batch', array( $this, 'handle_update_batch' ) );
		add_action( 'admin_post_fm_cash_delete_batch', array( $this, 'handle_delete_batch' ) );
		add_action( 'admin_post_fm_cash_mark_paid', array( $this, 'handle_mark_paid' ) );
		add_action( 'admin_post_fm_cash_reject_claim', array( $this, 'handle_reject_claim' ) );
		add_action( 'admin_post_fm_cash_reopen_claim', array( $this, 'handle_reopen_claim' ) );
	}

	/**
	 * Handle claims-table bulk actions before any admin output is sent.
	 */
	public function handle_claims_bulk_action(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$page = isset( $_GET['page'] ) && is_string( $_GET['page'] )
			? sanitize_key( wp_unslash( $_GET['page'] ) )
			: '';
		if ( 'fm-cash-claims-claims' !== $page ) {
			return;
		}

		$action = isset( $_REQUEST['action'] ) && is_string( $_REQUEST['action'] )
			? sanitize_key( wp_unslash( $_REQUEST['action'] ) )
			: '';
		if ( 'mark_paid' !== $action ) {
			return;
		}

		require_once FM_CASH_CLAIMS_DIR . 'includes/class-list-table.php';

		$table = new FM_Cash_Claims_List_Table( $this->db );
		$table->process_bulk_action();
	}

	public function register_menu(): void {
		add_menu_page(
			__( 'Cash Claims', 'fm-cash-claims' ),
			__( 'Cash Claims', 'fm-cash-claims' ),
			'manage_options',
			'fm-cash-claims',
			array( $this, 'render_dashboard' ),
			'dashicons-money-alt',
			56
		);

		add_submenu_page(
			'fm-cash-claims',
			__( 'Dashboard', 'fm-cash-claims' ),
			__( 'Dashboard', 'fm-cash-claims' ),
			'manage_options',
			'fm-cash-claims',
			array( $this, 'render_dashboard' )
		);

		add_submenu_page(
			'fm-cash-claims',
			__( 'Batches', 'fm-cash-claims' ),
			__( 'Batches', 'fm-cash-claims' ),
			'manage_options',
			'fm-cash-claims-batches',
			array( $this, 'render_batches' )
		);

		add_submenu_page(
			'fm-cash-claims',
			__( 'Import Manifest', 'fm-cash-claims' ),
			__( 'Import Manifest', 'fm-cash-claims' ),
			'manage_options',
			'fm-cash-claims-import',
			array( $this, 'render_import' )
		);

		add_submenu_page(
			'fm-cash-claims',
			__( 'Claims & Payouts', 'fm-cash-claims' ),
			__( 'Claims & Payouts', 'fm-cash-claims' ),
			'manage_options',
			'fm-cash-claims-claims',
			array( $this, 'render_claims' )
		);

		add_submenu_page(
			'fm-cash-claims',
			__( 'Audit Log', 'fm-cash-claims' ),
			__( 'Audit Log', 'fm-cash-claims' ),
			'manage_options',
			'fm-cash-claims-audit',
			array( $this, 'render_audit' )
		);

		add_submenu_page(
			'fm-cash-claims',
			__( 'Settings', 'fm-cash-claims' ),
			__( 'Settings', 'fm-cash-claims' ),
			'manage_options',
			'fm-cash-claims-settings',
			array( $this, 'render_settings' )
		);
	}

	public function enqueue_assets( string $hook ): void {
		if ( false === strpos( $hook, 'fm-cash-claims' ) ) {
			return;
		}

		wp_enqueue_style(
			'fm-cash-claims-admin',
			FM_CASH_CLAIMS_URL . 'assets/css/admin.css',
			array(),
			FM_CASH_CLAIMS_VERSION
		);

		wp_enqueue_script(
			'fm-cash-claims-admin',
			FM_CASH_CLAIMS_URL . 'assets/js/admin.js',
			array(),
			FM_CASH_CLAIMS_VERSION,
			true
		);
	}

	public function render_notices(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$screen = get_current_screen();
		if ( ! $screen || false === strpos( (string) $screen->id, 'fm-cash-claims' ) ) {
			return;
		}

		$notice = get_transient( 'fm_cash_notice_' . get_current_user_id() );
		if ( ! is_array( $notice ) || empty( $notice['message'] ) ) {
			return;
		}

		delete_transient( 'fm_cash_notice_' . get_current_user_id() );

		$type = (string) ( $notice['type'] ?? 'info' );
		if ( ! in_array( $type, array( 'success', 'error', 'warning', 'info' ), true ) ) {
			$type = 'info';
		}

		$errors = isset( $notice['errors'] ) && is_array( $notice['errors'] ) ? $notice['errors'] : array();

		echo '<div class="notice notice-' . esc_attr( $type ) . ' is-dismissible fm-cash-notice">';
		echo '<p><strong>' . esc_html( (string) $notice['message'] ) . '</strong></p>';
		if ( array() !== $errors ) {
			echo '<ul class="fm-cash-notice-list">';
			foreach ( $errors as $error ) {
				echo '<li>' . esc_html( (string) $error ) . '</li>';
			}
			echo '</ul>';
		}
		echo '</div>';
	}

	public function render_dashboard(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to view this page.', 'fm-cash-claims' ) );
		}

		global $wpdb;

		$batches_table = $this->db->batches_table();
		$coupons_table = $this->db->coupons_table();
		$claims_table  = $this->db->claims_table();

		$total_batches  = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$batches_table}" );
		$active_batches = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$batches_table} WHERE status = 'active'" );
		$total_coupons  = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$coupons_table}" );
		$total_value    = (float) $wpdb->get_var( "SELECT COALESCE(SUM(prize_amount),0) FROM {$coupons_table}" );
		$claimed_count  = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$coupons_table} WHERE status IN ('claimed','paid')" );

		$pending  = $wpdb->get_row( "SELECT COUNT(*) AS claim_count, COALESCE(SUM(prize_amount),0) AS claim_total FROM {$claims_table} WHERE status = 'pending'" );
		$paid     = $wpdb->get_row( "SELECT COUNT(*) AS claim_count, COALESCE(SUM(prize_amount),0) AS claim_total FROM {$claims_table} WHERE status = 'paid'" );
		$rejected = $wpdb->get_row( "SELECT COUNT(*) AS claim_count FROM {$claims_table} WHERE status = 'rejected'" );

		$today         = wp_date( 'Y-m-d' );
		$today_start   = get_gmt_from_date( $today . ' 00:00:00' );
		$today_end     = get_gmt_from_date( $today . ' 23:59:59' );
		$today_pending = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT COUNT(*) AS claim_count, COALESCE(SUM(prize_amount),0) AS claim_total FROM {$claims_table} WHERE status = 'pending' AND claimed_at >= %s AND claimed_at <= %s",
				$today_start,
				$today_end
			)
		);

		$recent_claims = $wpdb->get_results( "SELECT * FROM {$claims_table} ORDER BY claimed_at DESC LIMIT 8" );
		$tier_rows     = $wpdb->get_results(
			"SELECT prize_amount, currency, COUNT(*) AS total,
				SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) AS issued,
				SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) AS claimed,
				SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid
			FROM {$coupons_table}
			GROUP BY prize_amount, currency
			ORDER BY prize_amount ASC"
		);
		$active_rows = $wpdb->get_results( "SELECT * FROM {$batches_table} WHERE status = 'active' ORDER BY created_at DESC LIMIT 5" );

		$pending_count = $pending ? (int) $pending->claim_count : 0;
		$pending_value = $pending ? (float) $pending->claim_total : 0.0;
		$paid_count    = $paid ? (int) $paid->claim_count : 0;
		$paid_value    = $paid ? (float) $paid->claim_total : 0.0;
		$rejected_count = $rejected ? (int) $rejected->claim_count : 0;
		$today_count   = $today_pending ? (int) $today_pending->claim_count : 0;
		$today_value   = $today_pending ? (float) $today_pending->claim_total : 0.0;
		?>
		<div class="wrap fm-cash-wrap">
			<div class="fm-page-head">
				<div>
					<h1><?php esc_html_e( 'Cash Claims', 'fm-cash-claims' ); ?></h1>
					<p><?php esc_html_e( 'Import cash-prize manifests, monitor claims, and settle payouts at the end of the day.', 'fm-cash-claims' ); ?></p>
				</div>
				<div class="fm-page-actions">
					<a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-import' ) ); ?>"><?php esc_html_e( 'Import manifest', 'fm-cash-claims' ); ?></a>
					<a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-claims&status=pending' ) ); ?>"><?php esc_html_e( 'Pending payouts', 'fm-cash-claims' ); ?></a>
					<a class="button" href="<?php echo esc_url( $this->export_url( array( 'status' => 'pending' ) ) ); ?>"><?php esc_html_e( 'Export pending CSV', 'fm-cash-claims' ); ?></a>
				</div>
			</div>

			<?php if ( 0 === $total_batches ) : ?>
				<div class="fm-onboarding">
					<h2><?php esc_html_e( 'Start with a manifest', 'fm-cash-claims' ); ?></h2>
					<p><?php esc_html_e( 'Generate a cash-prize batch in the Fresh Masala Coupon Generator, then import its manifest.csv here before handing out any coupon.', 'fm-cash-claims' ); ?></p>
					<ol>
						<li><?php esc_html_e( 'Open the generator and choose Cash Prize mode.', 'fm-cash-claims' ); ?></li>
						<li><?php esc_html_e( 'Set the prize tiers and generate the batch.', 'fm-cash-claims' ); ?></li>
						<li><?php esc_html_e( 'Download manifest.csv and import it here.', 'fm-cash-claims' ); ?></li>
						<li><?php esc_html_e( 'Print and distribute the tier-grouped coupon PDFs.', 'fm-cash-claims' ); ?></li>
					</ol>
					<a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-import' ) ); ?>"><?php esc_html_e( 'Import the first manifest', 'fm-cash-claims' ); ?></a>
				</div>
			<?php endif; ?>

			<div class="fm-stat-grid">
				<div class="fm-stat">
					<span><?php esc_html_e( 'Total coupons', 'fm-cash-claims' ); ?></span>
					<strong><?php echo esc_html( number_format_i18n( $total_coupons ) ); ?></strong>
					<small><?php echo esc_html( sprintf( _n( '%s active batch', '%s active batches', $active_batches, 'fm-cash-claims' ), number_format_i18n( $active_batches ) ) ); ?></small>
				</div>
				<div class="fm-stat">
					<span><?php esc_html_e( 'Payout exposure', 'fm-cash-claims' ); ?></span>
					<strong><?php echo esc_html( FM_Cash_Claims_Util::format_amount( $total_value ) ); ?></strong>
					<small><?php echo esc_html( sprintf( _n( '%s coupon claimed or paid', '%s coupons claimed or paid', $claimed_count, 'fm-cash-claims' ), number_format_i18n( $claimed_count ) ) ); ?></small>
				</div>
				<div class="fm-stat fm-stat-pending">
					<span><?php esc_html_e( 'Pending payout', 'fm-cash-claims' ); ?></span>
					<strong><?php echo esc_html( FM_Cash_Claims_Util::format_amount( $pending_value ) ); ?></strong>
					<small><?php echo esc_html( sprintf( _n( '%s claim waiting', '%s claims waiting', $pending_count, 'fm-cash-claims' ), number_format_i18n( $pending_count ) ) ); ?></small>
				</div>
				<div class="fm-stat fm-stat-paid">
					<span><?php esc_html_e( 'Paid out', 'fm-cash-claims' ); ?></span>
					<strong><?php echo esc_html( FM_Cash_Claims_Util::format_amount( $paid_value ) ); ?></strong>
					<small><?php echo esc_html( sprintf( _n( '%s paid claim', '%s paid claims', $paid_count, 'fm-cash-claims' ), number_format_i18n( $paid_count ) ) ); ?></small>
				</div>
			</div>

			<div class="fm-today-banner">
				<div>
					<strong><?php esc_html_e( 'Today at a glance', 'fm-cash-claims' ); ?></strong>
					<span><?php esc_html_e( 'Pending claims submitted today, ready for the end-of-day payout run.', 'fm-cash-claims' ); ?></span>
				</div>
				<div class="fm-today-figures">
					<span><b><?php echo esc_html( number_format_i18n( $today_count ) ); ?></b> <?php esc_html_e( 'claims', 'fm-cash-claims' ); ?></span>
					<span><b><?php echo esc_html( FM_Cash_Claims_Util::format_amount( $today_value ) ); ?></b> <?php esc_html_e( 'pending value', 'fm-cash-claims' ); ?></span>
					<a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-claims&status=pending&claim_date=' . rawurlencode( $today ) ) ); ?>"><?php esc_html_e( 'Open today’s payout list', 'fm-cash-claims' ); ?></a>
				</div>
			</div>

			<div class="fm-dashboard-grid">
				<section class="fm-panel">
					<div class="fm-panel-head">
						<h2><?php esc_html_e( 'Prize tier status', 'fm-cash-claims' ); ?></h2>
					</div>
					<?php if ( array() === $tier_rows ) : ?>
						<p class="fm-muted"><?php esc_html_e( 'No coupons have been imported yet.', 'fm-cash-claims' ); ?></p>
					<?php else : ?>
						<table class="widefat striped fm-table">
							<thead>
								<tr>
									<th><?php esc_html_e( 'Prize', 'fm-cash-claims' ); ?></th>
									<th><?php esc_html_e( 'Total', 'fm-cash-claims' ); ?></th>
									<th><?php esc_html_e( 'Unclaimed', 'fm-cash-claims' ); ?></th>
									<th><?php esc_html_e( 'Claimed', 'fm-cash-claims' ); ?></th>
									<th><?php esc_html_e( 'Paid', 'fm-cash-claims' ); ?></th>
								</tr>
							</thead>
							<tbody>
								<?php foreach ( $tier_rows as $tier_row ) : ?>
									<tr>
										<td><strong><?php echo esc_html( FM_Cash_Claims_Util::format_amount( (float) $tier_row->prize_amount, (string) $tier_row->currency ) ); ?></strong></td>
										<td><?php echo esc_html( number_format_i18n( (int) $tier_row->total ) ); ?></td>
										<td><?php echo esc_html( number_format_i18n( (int) $tier_row->issued ) ); ?></td>
										<td><?php echo esc_html( number_format_i18n( (int) $tier_row->claimed ) ); ?></td>
										<td><?php echo esc_html( number_format_i18n( (int) $tier_row->paid ) ); ?></td>
									</tr>
								<?php endforeach; ?>
							</tbody>
						</table>
					<?php endif; ?>
				</section>

				<section class="fm-panel">
					<div class="fm-panel-head">
						<h2><?php esc_html_e( 'Active batches', 'fm-cash-claims' ); ?></h2>
						<a href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-batches' ) ); ?>"><?php esc_html_e( 'View all', 'fm-cash-claims' ); ?></a>
					</div>
					<?php if ( array() === $active_rows ) : ?>
						<p class="fm-muted"><?php esc_html_e( 'No active batches. Import a manifest or reopen a batch.', 'fm-cash-claims' ); ?></p>
					<?php else : ?>
						<ul class="fm-batch-list">
							<?php foreach ( $active_rows as $active_row ) : ?>
								<li>
									<div>
										<strong><?php echo esc_html( (string) $active_row->batch_id ); ?></strong>
										<span><?php echo esc_html( FM_Cash_Claims_Util::format_amount( (float) $active_row->total_value, (string) $active_row->currency ) ); ?> · <?php echo esc_html( number_format_i18n( (int) $active_row->total_coupons ) ); ?> <?php esc_html_e( 'coupons', 'fm-cash-claims' ); ?></span>
									</div>
									<a href="<?php echo esc_url( FM_Cash_Claims_Util::admin_batch_url( (string) $active_row->batch_id ) ); ?>"><?php esc_html_e( 'Manage', 'fm-cash-claims' ); ?></a>
								</li>
							<?php endforeach; ?>
						</ul>
					<?php endif; ?>
				</section>
			</div>

			<section class="fm-panel">
				<div class="fm-panel-head">
					<h2><?php esc_html_e( 'Recent claims', 'fm-cash-claims' ); ?></h2>
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-claims' ) ); ?>"><?php esc_html_e( 'View all claims', 'fm-cash-claims' ); ?></a>
				</div>
				<?php if ( array() === $recent_claims ) : ?>
					<p class="fm-muted"><?php esc_html_e( 'No claims have been submitted yet.', 'fm-cash-claims' ); ?></p>
				<?php else : ?>
					<table class="widefat striped fm-table">
						<thead>
							<tr>
								<th><?php esc_html_e( 'Reference', 'fm-cash-claims' ); ?></th>
								<th><?php esc_html_e( 'Coupon', 'fm-cash-claims' ); ?></th>
								<th><?php esc_html_e( 'Prize', 'fm-cash-claims' ); ?></th>
								<th><?php esc_html_e( 'Claimant', 'fm-cash-claims' ); ?></th>
								<th><?php esc_html_e( 'Status', 'fm-cash-claims' ); ?></th>
								<th><?php esc_html_e( 'Submitted', 'fm-cash-claims' ); ?></th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $recent_claims as $recent_claim ) : ?>
								<tr>
									<td><a href="<?php echo esc_url( FM_Cash_Claims_Util::admin_claim_url( (int) $recent_claim->id ) ); ?>"><strong><?php echo esc_html( (string) $recent_claim->claim_ref ); ?></strong></a></td>
									<td><code><?php echo esc_html( (string) $recent_claim->coupon_code ); ?></code></td>
									<td><?php echo esc_html( FM_Cash_Claims_Util::format_amount( (float) $recent_claim->prize_amount, (string) $recent_claim->currency ) ); ?></td>
									<td><?php echo esc_html( (string) $recent_claim->claimant_name ); ?><br /><small><?php echo esc_html( FM_Cash_Claims_Util::mask_phone( (string) $recent_claim->claimant_phone ) ); ?></small></td>
									<td><span class="<?php echo esc_attr( FM_Cash_Claims_Util::status_class( (string) $recent_claim->status ) ); ?>"><?php echo esc_html( FM_Cash_Claims_Util::status_label( (string) $recent_claim->status ) ); ?></span></td>
									<td><?php echo esc_html( get_date_from_gmt( (string) $recent_claim->claimed_at, 'M j, Y g:i A' ) ); ?></td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php endif; ?>
			</section>

			<?php if ( $rejected_count > 0 ) : ?>
				<p class="fm-muted"><?php echo esc_html( sprintf( _n( '%s rejected claim is retained for audit.', '%s rejected claims are retained for audit.', $rejected_count, 'fm-cash-claims' ), number_format_i18n( $rejected_count ) ) ); ?></p>
			<?php endif; ?>
		</div>
		<?php
	}

	public function render_batches(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to view this page.', 'fm-cash-claims' ) );
		}

		$edit = isset( $_GET['edit'] ) && is_string( $_GET['edit'] )
			? sanitize_text_field( wp_unslash( $_GET['edit'] ) )
			: '';
		if ( '' !== $edit ) {
			$this->render_batch_edit( $edit );
			return;
		}

		global $wpdb;

		$batches_table = $this->db->batches_table();
		$coupons_table = $this->db->coupons_table();
		$claims_table  = $this->db->claims_table();

		$rows = $wpdb->get_results(
			"SELECT b.*,
				(SELECT COUNT(*) FROM {$coupons_table} c WHERE c.batch_id = b.batch_id) AS coupon_count,
				(SELECT COUNT(*) FROM {$claims_table} cl WHERE cl.batch_id = b.batch_id) AS claim_count,
				(SELECT COUNT(*) FROM {$claims_table} cl2 WHERE cl2.batch_id = b.batch_id AND cl2.status = 'pending') AS pending_count,
				(SELECT COALESCE(SUM(prize_amount),0) FROM {$claims_table} cl3 WHERE cl3.batch_id = b.batch_id AND cl3.status = 'paid') AS paid_value
			FROM {$batches_table} b
			ORDER BY b.created_at DESC"
		);
		?>
		<div class="wrap fm-cash-wrap">
			<div class="fm-page-head">
				<div>
					<h1><?php esc_html_e( 'Batches', 'fm-cash-claims' ); ?></h1>
					<p><?php esc_html_e( 'Each imported manifest creates one batch. Only import a manifest once.', 'fm-cash-claims' ); ?></p>
				</div>
				<div class="fm-page-actions">
					<a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-import' ) ); ?>"><?php esc_html_e( 'Import manifest', 'fm-cash-claims' ); ?></a>
				</div>
			</div>

			<?php if ( array() === $rows ) : ?>
				<div class="fm-onboarding">
					<h2><?php esc_html_e( 'No batches imported yet', 'fm-cash-claims' ); ?></h2>
					<p><?php esc_html_e( 'Import a generator manifest.csv to create your first cash-prize batch.', 'fm-cash-claims' ); ?></p>
					<a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-import' ) ); ?>"><?php esc_html_e( 'Import manifest', 'fm-cash-claims' ); ?></a>
				</div>
			<?php else : ?>
				<table class="widefat striped fm-table fm-batches-table">
					<thead>
						<tr>
							<th><?php esc_html_e( 'Batch', 'fm-cash-claims' ); ?></th>
							<th><?php esc_html_e( 'Status', 'fm-cash-claims' ); ?></th>
							<th><?php esc_html_e( 'Coupons', 'fm-cash-claims' ); ?></th>
							<th><?php esc_html_e( 'Payout value', 'fm-cash-claims' ); ?></th>
							<th><?php esc_html_e( 'Claims', 'fm-cash-claims' ); ?></th>
							<th><?php esc_html_e( 'Claim window', 'fm-cash-claims' ); ?></th>
							<th><?php esc_html_e( 'Imported', 'fm-cash-claims' ); ?></th>
							<th><?php esc_html_e( 'Actions', 'fm-cash-claims' ); ?></th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ( $rows as $row ) : ?>
							<?php
							$window = __( 'Always open', 'fm-cash-claims' );
							if ( ! empty( $row->claim_start ) || ! empty( $row->claim_end ) ) {
								$start  = ! empty( $row->claim_start ) ? get_date_from_gmt( (string) $row->claim_start, 'M j, Y g:i A' ) : __( 'Now', 'fm-cash-claims' );
								$end    = ! empty( $row->claim_end ) ? get_date_from_gmt( (string) $row->claim_end, 'M j, Y g:i A' ) : __( 'No end', 'fm-cash-claims' );
								$window = $start . ' → ' . $end;
							}
							$delete_url = wp_nonce_url(
								add_query_arg(
									array(
										'action'   => 'fm_cash_delete_batch',
										'batch_id' => (string) $row->batch_id,
									),
									admin_url( 'admin-post.php' )
								),
								'fm_cash_delete_batch_' . (string) $row->batch_id
							);
							?>
							<tr>
								<td>
									<strong><?php echo esc_html( (string) $row->batch_id ); ?></strong>
									<?php if ( ! empty( $row->label ) && $row->label !== $row->batch_id ) : ?>
										<br /><small><?php echo esc_html( (string) $row->label ); ?></small>
									<?php endif; ?>
								</td>
								<td><span class="<?php echo esc_attr( FM_Cash_Claims_Util::status_class( (string) $row->status ) ); ?>"><?php echo esc_html( FM_Cash_Claims_Util::status_label( (string) $row->status ) ); ?></span></td>
								<td><?php echo esc_html( number_format_i18n( (int) $row->coupon_count ) ); ?></td>
								<td><strong><?php echo esc_html( FM_Cash_Claims_Util::format_amount( (float) $row->total_value, (string) $row->currency ) ); ?></strong></td>
								<td>
									<?php echo esc_html( number_format_i18n( (int) $row->claim_count ) ); ?>
									<?php if ( (int) $row->pending_count > 0 ) : ?>
										<br /><small class="fm-warning-text"><?php echo esc_html( sprintf( _n( '%s pending', '%s pending', (int) $row->pending_count, 'fm-cash-claims' ), number_format_i18n( (int) $row->pending_count ) ) ); ?></small>
									<?php endif; ?>
								</td>
								<td><small><?php echo esc_html( $window ); ?></small></td>
								<td><?php echo esc_html( get_date_from_gmt( (string) $row->created_at, 'M j, Y g:i A' ) ); ?></td>
								<td class="fm-actions-cell">
									<a class="button button-small" href="<?php echo esc_url( FM_Cash_Claims_Util::admin_batch_url( (string) $row->batch_id ) ); ?>"><?php esc_html_e( 'Edit', 'fm-cash-claims' ); ?></a>
									<a class="button button-small" href="<?php echo esc_url( add_query_arg( array( 'page' => 'fm-cash-claims-claims', 'batch' => (string) $row->batch_id ), admin_url( 'admin.php' ) ) ); ?>"><?php esc_html_e( 'Claims', 'fm-cash-claims' ); ?></a>
									<a class="button button-small" href="<?php echo esc_url( $this->export_url( array( 'batch' => (string) $row->batch_id ) ) ); ?>"><?php esc_html_e( 'Export', 'fm-cash-claims' ); ?></a>
									<?php if ( 0 === (int) $row->claim_count ) : ?>
										<a class="button button-small fm-danger-link" href="<?php echo esc_url( $delete_url ); ?>" data-fm-confirm="<?php esc_attr_e( 'Delete this batch and all of its coupons? This cannot be undone.', 'fm-cash-claims' ); ?>"><?php esc_html_e( 'Delete', 'fm-cash-claims' ); ?></a>
									<?php endif; ?>
								</td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
			<?php endif; ?>
		</div>
		<?php
	}

	private function render_batch_edit( string $batch_id ): void {
		$batch = $this->db->get_batch( $batch_id );
		if ( ! $batch ) {
			?>
			<div class="wrap fm-cash-wrap">
				<h1><?php esc_html_e( 'Batch not found', 'fm-cash-claims' ); ?></h1>
				<p><a href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-batches' ) ); ?>"><?php esc_html_e( '← Back to batches', 'fm-cash-claims' ); ?></a></p>
			</div>
			<?php
			return;
		}

		global $wpdb;

		$claim_count = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$this->db->claims_table()} WHERE batch_id = %s",
				$batch_id
			)
		);

		$claim_start = ! empty( $batch->claim_start ) ? get_date_from_gmt( (string) $batch->claim_start, 'Y-m-d\TH:i' ) : '';
		$claim_end   = ! empty( $batch->claim_end ) ? get_date_from_gmt( (string) $batch->claim_end, 'Y-m-d\TH:i' ) : '';
		?>
		<div class="wrap fm-cash-wrap">
			<p><a href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-batches' ) ); ?>"><?php esc_html_e( '← Back to batches', 'fm-cash-claims' ); ?></a></p>
			<div class="fm-page-head">
				<div>
					<h1><?php echo esc_html( (string) $batch->batch_id ); ?></h1>
					<p><?php esc_html_e( 'Control when this batch can be claimed and whether it is visible to the public claim page.', 'fm-cash-claims' ); ?></p>
				</div>
				<div class="fm-page-actions">
					<a class="button" href="<?php echo esc_url( add_query_arg( array( 'page' => 'fm-cash-claims-claims', 'batch' => (string) $batch->batch_id ), admin_url( 'admin.php' ) ) ); ?>"><?php esc_html_e( 'View claims', 'fm-cash-claims' ); ?></a>
					<a class="button" href="<?php echo esc_url( $this->export_url( array( 'batch' => (string) $batch->batch_id ) ) ); ?>"><?php esc_html_e( 'Export claims', 'fm-cash-claims' ); ?></a>
				</div>
			</div>

			<div class="fm-two-col">
				<section class="fm-panel">
					<div class="fm-panel-head"><h2><?php esc_html_e( 'Batch settings', 'fm-cash-claims' ); ?></h2></div>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="fm-form">
						<input type="hidden" name="action" value="fm_cash_update_batch" />
						<input type="hidden" name="batch_id" value="<?php echo esc_attr( (string) $batch->batch_id ); ?>" />
						<?php wp_nonce_field( 'fm_cash_update_batch_' . (string) $batch->batch_id ); ?>

						<label>
							<span><?php esc_html_e( 'Internal label', 'fm-cash-claims' ); ?></span>
							<input type="text" name="label" value="<?php echo esc_attr( (string) $batch->label ); ?>" maxlength="120" />
						</label>

						<label>
							<span><?php esc_html_e( 'Status', 'fm-cash-claims' ); ?></span>
							<select name="status">
								<option value="active" <?php selected( (string) $batch->status, 'active' ); ?>><?php esc_html_e( 'Active — claims allowed', 'fm-cash-claims' ); ?></option>
								<option value="closed" <?php selected( (string) $batch->status, 'closed' ); ?>><?php esc_html_e( 'Closed — no new claims', 'fm-cash-claims' ); ?></option>
								<option value="void" <?php selected( (string) $batch->status, 'void' ); ?>><?php esc_html_e( 'Void — campaign unavailable', 'fm-cash-claims' ); ?></option>
							</select>
						</label>

						<label>
							<span><?php esc_html_e( 'Claim start (optional)', 'fm-cash-claims' ); ?></span>
							<input type="datetime-local" name="claim_start" value="<?php echo esc_attr( $claim_start ); ?>" />
							<small><?php esc_html_e( 'Leave empty to allow claims immediately.', 'fm-cash-claims' ); ?></small>
						</label>

						<label>
							<span><?php esc_html_e( 'Claim end (optional)', 'fm-cash-claims' ); ?></span>
							<input type="datetime-local" name="claim_end" value="<?php echo esc_attr( $claim_end ); ?>" />
							<small><?php esc_html_e( 'Leave empty for no automatic end. Times use the site timezone.', 'fm-cash-claims' ); ?></small>
						</label>

						<div class="fm-form-actions">
							<button type="submit" class="button button-primary"><?php esc_html_e( 'Save batch settings', 'fm-cash-claims' ); ?></button>
							<a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-batches' ) ); ?>"><?php esc_html_e( 'Cancel', 'fm-cash-claims' ); ?></a>
						</div>
					</form>
				</section>

				<section class="fm-panel">
					<div class="fm-panel-head"><h2><?php esc_html_e( 'Batch summary', 'fm-cash-claims' ); ?></h2></div>
					<dl class="fm-summary-list">
						<div><dt><?php esc_html_e( 'Coupons', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( number_format_i18n( (int) $batch->total_coupons ) ); ?></dd></div>
						<div><dt><?php esc_html_e( 'Payout value', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( FM_Cash_Claims_Util::format_amount( (float) $batch->total_value, (string) $batch->currency ) ); ?></dd></div>
						<div><dt><?php esc_html_e( 'Claims', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( number_format_i18n( $claim_count ) ); ?></dd></div>
						<div><dt><?php esc_html_e( 'Currency', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( (string) $batch->currency ); ?></dd></div>
						<div><dt><?php esc_html_e( 'Imported', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( get_date_from_gmt( (string) $batch->created_at, 'M j, Y g:i A' ) ); ?></dd></div>
					</dl>
					<?php if ( 0 === $claim_count ) : ?>
						<hr />
						<p class="fm-muted"><?php esc_html_e( 'This batch has no claims. You can delete it and import the manifest again if needed.', 'fm-cash-claims' ); ?></p>
						<a class="button fm-danger-link" href="<?php echo esc_url( wp_nonce_url( add_query_arg( array( 'action' => 'fm_cash_delete_batch', 'batch_id' => (string) $batch->batch_id ), admin_url( 'admin-post.php' ) ), 'fm_cash_delete_batch_' . (string) $batch->batch_id ) ); ?>" data-fm-confirm="<?php esc_attr_e( 'Delete this batch and all of its coupons? This cannot be undone.', 'fm-cash-claims' ); ?>"><?php esc_html_e( 'Delete batch', 'fm-cash-claims' ); ?></a>
					<?php endif; ?>
				</section>
			</div>
		</div>
		<?php
	}

	public function render_import(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to view this page.', 'fm-cash-claims' ) );
		}

		$preview = $this->importer->get_preview();
		$is_preview_request = isset( $_GET['preview'] ) && is_string( $_GET['preview'] ) && '1' === $_GET['preview'];
		?>
		<div class="wrap fm-cash-wrap">
			<div class="fm-page-head">
				<div>
					<h1><?php esc_html_e( 'Import Manifest', 'fm-cash-claims' ); ?></h1>
					<p><?php esc_html_e( 'Upload the generator manifest.csv. The manifest contains every secret QR token, so treat it as confidential.', 'fm-cash-claims' ); ?></p>
				</div>
				<div class="fm-page-actions">
					<a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-batches' ) ); ?>"><?php esc_html_e( 'View batches', 'fm-cash-claims' ); ?></a>
				</div>
			</div>

			<?php if ( $is_preview_request && is_array( $preview ) ) : ?>
				<section class="fm-panel fm-import-preview">
					<div class="fm-panel-head">
						<h2><?php esc_html_e( 'Confirm import', 'fm-cash-claims' ); ?></h2>
						<span class="fm-status fm-status-pending"><?php esc_html_e( 'Not written yet', 'fm-cash-claims' ); ?></span>
					</div>

					<p><?php esc_html_e( 'Review the batch summary below. Nothing has been written to the database yet.', 'fm-cash-claims' ); ?></p>

					<dl class="fm-summary-list fm-summary-list-inline">
						<div><dt><?php esc_html_e( 'Batch ID', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( (string) $preview['batch_id'] ); ?></dd></div>
						<div><dt><?php esc_html_e( 'Manifest file', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( (string) $preview['filename'] ); ?></dd></div>
						<div><dt><?php esc_html_e( 'Coupons', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( number_format_i18n( (int) $preview['total'] ) ); ?></dd></div>
						<div><dt><?php esc_html_e( 'Payout exposure', 'fm-cash-claims' ); ?></dt><dd><strong><?php echo esc_html( FM_Cash_Claims_Util::format_amount( (float) $preview['total_value'], (string) $preview['currency'] ) ); ?></strong></dd></div>
					</dl>

					<h3><?php esc_html_e( 'Prize tiers', 'fm-cash-claims' ); ?></h3>
					<table class="widefat striped fm-table">
						<thead>
							<tr>
								<th><?php esc_html_e( 'Prize amount', 'fm-cash-claims' ); ?></th>
								<th><?php esc_html_e( 'Coupons', 'fm-cash-claims' ); ?></th>
								<th><?php esc_html_e( 'Tier value', 'fm-cash-claims' ); ?></th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( (array) $preview['tiers'] as $tier ) : ?>
								<tr>
									<td><strong><?php echo esc_html( FM_Cash_Claims_Util::format_amount( (float) $tier['amount'], (string) $preview['currency'] ) ); ?></strong></td>
									<td><?php echo esc_html( number_format_i18n( (int) $tier['quantity'] ) ); ?></td>
									<td><?php echo esc_html( FM_Cash_Claims_Util::format_amount( (float) $tier['amount'] * (int) $tier['quantity'], (string) $preview['currency'] ) ); ?></td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>

					<h3><?php esc_html_e( 'Sample rows', 'fm-cash-claims' ); ?></h3>
					<table class="widefat striped fm-table">
						<thead>
							<tr>
								<th><?php esc_html_e( 'Coupon', 'fm-cash-claims' ); ?></th>
								<th><?php esc_html_e( 'Token (masked)', 'fm-cash-claims' ); ?></th>
								<th><?php esc_html_e( 'Prize', 'fm-cash-claims' ); ?></th>
								<th><?php esc_html_e( 'Generated', 'fm-cash-claims' ); ?></th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( (array) $preview['sample'] as $sample ) : ?>
								<tr>
									<td><code><?php echo esc_html( (string) $sample['coupon_code'] ); ?></code></td>
									<td><code><?php echo esc_html( (string) $sample['qr_token'] ); ?></code></td>
									<td><?php echo esc_html( FM_Cash_Claims_Util::format_amount( (float) $sample['prize_amount'], (string) $sample['currency'] ) ); ?></td>
									<td><?php echo esc_html( get_date_from_gmt( (string) $sample['generated_at'], 'M j, Y g:i A' ) ); ?></td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>

					<div class="fm-import-actions">
						<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
							<input type="hidden" name="action" value="fm_cash_import_confirm" />
							<input type="hidden" name="import_key" value="<?php echo esc_attr( (string) $preview['key'] ); ?>" />
							<?php wp_nonce_field( 'fm_cash_import_confirm' ); ?>
							<button type="submit" class="button button-primary button-hero" data-fm-confirm="<?php esc_attr_e( 'Import this batch now? Make sure the manifest has not been imported before.', 'fm-cash-claims' ); ?>">
								<?php esc_html_e( 'Import this batch', 'fm-cash-claims' ); ?>
							</button>
						</form>

						<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
							<input type="hidden" name="action" value="fm_cash_import_cancel" />
							<?php wp_nonce_field( 'fm_cash_import_cancel' ); ?>
							<button type="submit" class="button"><?php esc_html_e( 'Cancel preview', 'fm-cash-claims' ); ?></button>
						</form>
					</div>

					<p class="fm-muted"><?php esc_html_e( 'After import, distribute the printed coupons. Do not upload the same manifest twice.', 'fm-cash-claims' ); ?></p>
				</section>
			<?php else : ?>
				<?php if ( $is_preview_request && ! is_array( $preview ) ) : ?>
					<div class="notice notice-warning inline"><p><?php esc_html_e( 'The import preview expired. Please upload the manifest again.', 'fm-cash-claims' ); ?></p></div>
				<?php endif; ?>

				<div class="fm-two-col">
					<section class="fm-panel">
						<div class="fm-panel-head"><h2><?php esc_html_e( 'Upload manifest.csv', 'fm-cash-claims' ); ?></h2></div>
						<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" enctype="multipart/form-data" class="fm-form">
							<input type="hidden" name="action" value="fm_cash_import_preview" />
							<?php wp_nonce_field( 'fm_cash_import_preview' ); ?>
							<label>
								<span><?php esc_html_e( 'Manifest file', 'fm-cash-claims' ); ?></span>
								<input type="file" name="manifest" accept=".csv,.txt,text/csv,text/plain" required />
								<small><?php echo esc_html( sprintf( __( 'Maximum upload size: %s', 'fm-cash-claims' ), size_format( wp_max_upload_size() ) ) ); ?></small>
							</label>
							<div class="fm-form-actions">
								<button type="submit" class="button button-primary"><?php esc_html_e( 'Validate and preview', 'fm-cash-claims' ); ?></button>
							</div>
						</form>
					</section>

					<section class="fm-panel">
						<div class="fm-panel-head"><h2><?php esc_html_e( 'Expected format', 'fm-cash-claims' ); ?></h2></div>
						<p><?php esc_html_e( 'The generator produces a six-column manifest. The header must match exactly:', 'fm-cash-claims' ); ?></p>
						<pre class="fm-code">coupon_code,qr_token,batch_id,prize_amount,currency,generated_at</pre>
						<ul class="fm-checklist">
							<li><?php esc_html_e( 'Maximum 20,000 coupons per batch.', 'fm-cash-claims' ); ?></li>
							<li><?php esc_html_e( 'QR tokens must be 32 Base64URL characters.', 'fm-cash-claims' ); ?></li>
							<li><?php esc_html_e( 'Duplicate coupon codes or tokens are rejected.', 'fm-cash-claims' ); ?></li>
							<li><?php esc_html_e( 'A batch ID can only be imported once.', 'fm-cash-claims' ); ?></li>
							<li><?php esc_html_e( 'The preview is temporary; confirm it before it expires.', 'fm-cash-claims' ); ?></li>
						</ul>
					</section>
				</div>

				<div class="fm-security-note">
					<strong><?php esc_html_e( 'Keep the manifest private', 'fm-cash-claims' ); ?></strong>
					<p><?php esc_html_e( 'The manifest contains the secret token for every coupon. Anyone with a token can open its claim page. Upload it over HTTPS, import it before distribution, and delete local copies after a successful import.', 'fm-cash-claims' ); ?></p>
				</div>
			<?php endif; ?>
		</div>
		<?php
	}

	public function render_claims(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to view this page.', 'fm-cash-claims' ) );
		}

		$claim_id = isset( $_GET['claim_id'] ) && is_scalar( $_GET['claim_id'] ) ? absint( $_GET['claim_id'] ) : 0;
		if ( $claim_id > 0 ) {
			$this->render_claim_detail( $claim_id );
			return;
		}

		require_once FM_CASH_CLAIMS_DIR . 'includes/class-list-table.php';

		$table = new FM_Cash_Claims_List_Table( $this->db );
		$table->prepare_items();
		$summary = $table->get_summary();

		$pending_count = (int) ( $summary['pending']['count'] ?? 0 );
		$pending_total = (float) ( $summary['pending']['total'] ?? 0 );
		$paid_count    = (int) ( $summary['paid']['count'] ?? 0 );
		$paid_total    = (float) ( $summary['paid']['total'] ?? 0 );
		$rejected_count = (int) ( $summary['rejected']['count'] ?? 0 );
		$rejected_total = (float) ( $summary['rejected']['total'] ?? 0 );
		?>
		<div class="wrap fm-cash-wrap">
			<div class="fm-page-head">
				<div>
					<h1><?php esc_html_e( 'Claims & Payouts', 'fm-cash-claims' ); ?></h1>
					<p><?php esc_html_e( 'Review claims, mark them paid after manual settlement, and export the end-of-day payout list.', 'fm-cash-claims' ); ?></p>
				</div>
				<div class="fm-page-actions">
					<a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-claims&status=pending' ) ); ?>"><?php esc_html_e( 'Pending only', 'fm-cash-claims' ); ?></a>
					<a class="button" href="<?php echo esc_url( $this->export_url() ); ?>"><?php esc_html_e( 'Export current view', 'fm-cash-claims' ); ?></a>
				</div>
			</div>

			<div class="fm-stat-grid fm-stat-grid-compact">
				<div class="fm-stat fm-stat-pending">
					<span><?php esc_html_e( 'Pending payout', 'fm-cash-claims' ); ?></span>
					<strong><?php echo esc_html( FM_Cash_Claims_Util::format_amount( $pending_total ) ); ?></strong>
					<small><?php echo esc_html( sprintf( _n( '%s claim', '%s claims', $pending_count, 'fm-cash-claims' ), number_format_i18n( $pending_count ) ) ); ?></small>
				</div>
				<div class="fm-stat fm-stat-paid">
					<span><?php esc_html_e( 'Paid', 'fm-cash-claims' ); ?></span>
					<strong><?php echo esc_html( FM_Cash_Claims_Util::format_amount( $paid_total ) ); ?></strong>
					<small><?php echo esc_html( sprintf( _n( '%s claim', '%s claims', $paid_count, 'fm-cash-claims' ), number_format_i18n( $paid_count ) ) ); ?></small>
				</div>
				<div class="fm-stat">
					<span><?php esc_html_e( 'Rejected', 'fm-cash-claims' ); ?></span>
					<strong><?php echo esc_html( FM_Cash_Claims_Util::format_amount( $rejected_total ) ); ?></strong>
					<small><?php echo esc_html( sprintf( _n( '%s claim', '%s claims', $rejected_count, 'fm-cash-claims' ), number_format_i18n( $rejected_count ) ) ); ?></small>
				</div>
			</div>

			<form method="get" action="<?php echo esc_url( admin_url( 'admin.php' ) ); ?>">
				<input type="hidden" name="page" value="fm-cash-claims-claims" />
				<?php $table->display(); ?>
			</form>
		</div>
		<?php
	}

	private function render_claim_detail( int $claim_id ): void {
		$claim = $this->db->get_claim( $claim_id );
		if ( ! $claim ) {
			?>
			<div class="wrap fm-cash-wrap">
				<h1><?php esc_html_e( 'Claim not found', 'fm-cash-claims' ); ?></h1>
				<p><a href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-claims' ) ); ?>"><?php esc_html_e( '← Back to claims', 'fm-cash-claims' ); ?></a></p>
			</div>
			<?php
			return;
		}

		$coupon = $this->db->get_coupon( (int) $claim->coupon_id );
		$batch  = $this->db->get_batch( (string) $claim->batch_id );
		$status = (string) $claim->status;

		$paid_by = '';
		if ( ! empty( $claim->paid_by ) ) {
			$user = get_userdata( (int) $claim->paid_by );
			if ( $user ) {
				$paid_by = (string) $user->display_name;
			}
		}

		$submitted_display = get_date_from_gmt( (string) $claim->claimed_at, 'M j, Y g:i A' );
		$paid_display      = ! empty( $claim->paid_at ) ? get_date_from_gmt( (string) $claim->paid_at, 'M j, Y g:i A' ) : '';
		$public_url        = $coupon ? FM_Cash_Claims_Util::claim_url( (string) $coupon->qr_token ) : '';
		?>
		<div class="wrap fm-cash-wrap">
			<p class="fm-no-print"><a href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-claims' ) ); ?>"><?php esc_html_e( '← Back to claims', 'fm-cash-claims' ); ?></a></p>

			<div class="fm-page-head fm-no-print">
				<div>
					<h1><?php echo esc_html( (string) $claim->claim_ref ); ?></h1>
					<p><?php esc_html_e( 'Review the claimant details and record the manual payout.', 'fm-cash-claims' ); ?></p>
				</div>
				<div class="fm-page-actions">
					<span class="<?php echo esc_attr( FM_Cash_Claims_Util::status_class( $status ) ); ?>"><?php echo esc_html( FM_Cash_Claims_Util::status_label( $status ) ); ?></span>
					<button type="button" class="button" data-fm-print><?php esc_html_e( 'Print payout slip', 'fm-cash-claims' ); ?></button>
					<?php if ( '' !== $public_url ) : ?>
						<a class="button" href="<?php echo esc_url( $public_url ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Open public page', 'fm-cash-claims' ); ?></a>
					<?php endif; ?>
				</div>
			</div>

			<div class="fm-payout-slip">
				<div class="fm-slip-head">
					<div>
						<span class="fm-slip-brand">FRESH MASALA</span>
						<h2><?php esc_html_e( 'Cash prize payout slip', 'fm-cash-claims' ); ?></h2>
					</div>
					<div class="fm-slip-ref">
						<span><?php esc_html_e( 'Claim reference', 'fm-cash-claims' ); ?></span>
						<strong><?php echo esc_html( (string) $claim->claim_ref ); ?></strong>
					</div>
				</div>

				<div class="fm-slip-prize">
					<span><?php esc_html_e( 'Prize', 'fm-cash-claims' ); ?></span>
					<strong><?php echo esc_html( FM_Cash_Claims_Util::format_amount( (float) $claim->prize_amount, (string) $claim->currency ) ); ?></strong>
					<span class="<?php echo esc_attr( FM_Cash_Claims_Util::status_class( $status ) ); ?>"><?php echo esc_html( FM_Cash_Claims_Util::status_label( $status ) ); ?></span>
				</div>

				<dl class="fm-claim-detail-grid">
					<div><dt><?php esc_html_e( 'Claimant', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( (string) $claim->claimant_name ); ?></dd></div>
					<div><dt><?php esc_html_e( 'Phone', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( (string) $claim->claimant_phone ); ?></dd></div>
					<div><dt><?php esc_html_e( 'PAN', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( '' !== (string) $claim->claimant_pan ? (string) $claim->claimant_pan : '—' ); ?></dd></div>
					<div><dt><?php esc_html_e( 'Coupon', 'fm-cash-claims' ); ?></dt><dd><code><?php echo esc_html( (string) $claim->coupon_code ); ?></code></dd></div>
					<div><dt><?php esc_html_e( 'Batch', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( (string) $claim->batch_id ); ?></dd></div>
					<div><dt><?php esc_html_e( 'Submitted', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( $submitted_display ); ?></dd></div>
					<div><dt><?php esc_html_e( 'Claim IP', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( (string) ( $claim->claim_ip ?: '—' ) ); ?></dd></div>
					<div><dt><?php esc_html_e( 'Coupon status', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( $coupon ? FM_Cash_Claims_Util::status_label( (string) $coupon->status ) : '—' ); ?></dd></div>
					<?php if ( '' !== $paid_display ) : ?>
						<div><dt><?php esc_html_e( 'Paid at', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( $paid_display ); ?></dd></div>
						<div><dt><?php esc_html_e( 'Paid by', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( '' !== $paid_by ? $paid_by : '—' ); ?></dd></div>
					<?php endif; ?>
				</dl>

				<?php if ( ! empty( $claim->payment_note ) ) : ?>
					<div class="fm-slip-note"><strong><?php esc_html_e( 'Payment note', 'fm-cash-claims' ); ?></strong><span><?php echo esc_html( (string) $claim->payment_note ); ?></span></div>
				<?php endif; ?>

				<?php if ( ! empty( $claim->rejection_reason ) ) : ?>
					<div class="fm-slip-note fm-slip-note-danger"><strong><?php esc_html_e( 'Rejection reason', 'fm-cash-claims' ); ?></strong><span><?php echo esc_html( (string) $claim->rejection_reason ); ?></span></div>
				<?php endif; ?>

				<div class="fm-slip-signatures">
					<div><span><?php esc_html_e( 'Paid by (signature)', 'fm-cash-claims' ); ?></span></div>
					<div><span><?php esc_html_e( 'Received by (signature)', 'fm-cash-claims' ); ?></span></div>
				</div>
			</div>

			<div class="fm-two-col fm-no-print">
				<?php if ( 'pending' === $status ) : ?>
					<section class="fm-panel" id="fm-pay">
						<div class="fm-panel-head"><h2><?php esc_html_e( 'Mark as paid', 'fm-cash-claims' ); ?></h2></div>
						<p class="fm-muted"><?php esc_html_e( 'Only mark this claim paid after you have handed over the cash. This updates the coupon to paid and records the admin user.', 'fm-cash-claims' ); ?></p>
						<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="fm-form">
							<input type="hidden" name="action" value="fm_cash_mark_paid" />
							<input type="hidden" name="claim_id" value="<?php echo esc_attr( (string) $claim->id ); ?>" />
							<?php wp_nonce_field( 'fm_cash_mark_paid_' . (int) $claim->id ); ?>
							<label>
								<span><?php esc_html_e( 'Payment note (optional)', 'fm-cash-claims' ); ?></span>
								<textarea name="payment_note" rows="3" maxlength="255" placeholder="<?php esc_attr_e( 'Cash handed at counter, receipt number, etc.', 'fm-cash-claims' ); ?>"></textarea>
							</label>
							<button type="submit" class="button button-primary" data-fm-confirm="<?php esc_attr_e( 'Confirm that the cash has been handed over and mark this claim paid?', 'fm-cash-claims' ); ?>"><?php esc_html_e( 'Mark as paid', 'fm-cash-claims' ); ?></button>
						</form>
					</section>

					<section class="fm-panel">
						<div class="fm-panel-head"><h2><?php esc_html_e( 'Reject claim', 'fm-cash-claims' ); ?></h2></div>
						<p class="fm-muted"><?php esc_html_e( 'Rejecting keeps the coupon claimed. Use this for suspected fraud or an invalid claim. You can reopen a rejected claim later.', 'fm-cash-claims' ); ?></p>
						<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="fm-form">
							<input type="hidden" name="action" value="fm_cash_reject_claim" />
							<input type="hidden" name="claim_id" value="<?php echo esc_attr( (string) $claim->id ); ?>" />
							<?php wp_nonce_field( 'fm_cash_reject_claim_' . (int) $claim->id ); ?>
							<label>
								<span><?php esc_html_e( 'Rejection reason', 'fm-cash-claims' ); ?> <b>*</b></span>
								<textarea name="rejection_reason" rows="3" maxlength="255" required></textarea>
							</label>
							<button type="submit" class="button fm-danger-link" data-fm-confirm="<?php esc_attr_e( 'Reject this claim? The coupon will remain claimed.', 'fm-cash-claims' ); ?>"><?php esc_html_e( 'Reject claim', 'fm-cash-claims' ); ?></button>
						</form>
					</section>
				<?php elseif ( 'rejected' === $status ) : ?>
					<section class="fm-panel">
						<div class="fm-panel-head"><h2><?php esc_html_e( 'Reopen claim', 'fm-cash-claims' ); ?></h2></div>
						<p class="fm-muted"><?php esc_html_e( 'Reopening deletes the rejected claim and makes the coupon claimable again. The scan audit log is preserved.', 'fm-cash-claims' ); ?></p>
						<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="fm-form">
							<input type="hidden" name="action" value="fm_cash_reopen_claim" />
							<input type="hidden" name="claim_id" value="<?php echo esc_attr( (string) $claim->id ); ?>" />
							<?php wp_nonce_field( 'fm_cash_reopen_claim_' . (int) $claim->id ); ?>
							<button type="submit" class="button button-primary" data-fm-confirm="<?php esc_attr_e( 'Reopen this claim and make the coupon claimable again?', 'fm-cash-claims' ); ?>"><?php esc_html_e( 'Reopen claim', 'fm-cash-claims' ); ?></button>
						</form>
					</section>
				<?php else : ?>
					<section class="fm-panel">
						<div class="fm-panel-head"><h2><?php esc_html_e( 'Paid claim', 'fm-cash-claims' ); ?></h2></div>
						<p class="fm-muted"><?php esc_html_e( 'This claim has been settled. Paid claims cannot be reopened from this screen.', 'fm-cash-claims' ); ?></p>
					</section>
				<?php endif; ?>

				<section class="fm-panel">
					<div class="fm-panel-head"><h2><?php esc_html_e( 'Batch context', 'fm-cash-claims' ); ?></h2></div>
					<dl class="fm-summary-list">
						<div><dt><?php esc_html_e( 'Batch ID', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( (string) $claim->batch_id ); ?></dd></div>
						<div><dt><?php esc_html_e( 'Batch label', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( $batch ? (string) $batch->label : '—' ); ?></dd></div>
						<div><dt><?php esc_html_e( 'Batch status', 'fm-cash-claims' ); ?></dt><dd><?php echo esc_html( $batch ? FM_Cash_Claims_Util::status_label( (string) $batch->status ) : '—' ); ?></dd></div>
						<div><dt><?php esc_html_e( 'Coupon', 'fm-cash-claims' ); ?></dt><dd><code><?php echo esc_html( (string) $claim->coupon_code ); ?></code></dd></div>
					</dl>
					<?php if ( $batch ) : ?>
						<p><a class="button" href="<?php echo esc_url( FM_Cash_Claims_Util::admin_batch_url( (string) $batch->batch_id ) ); ?>"><?php esc_html_e( 'Manage batch', 'fm-cash-claims' ); ?></a></p>
					<?php endif; ?>
				</section>
			</div>
		</div>
		<?php
	}

	public function render_audit(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to view this page.', 'fm-cash-claims' ) );
		}

		global $wpdb;

		$log_table     = $this->db->scan_log_table();
		$coupons_table = $this->db->coupons_table();
		$per_page      = 50;
		$paged         = isset( $_GET['paged'] ) && is_scalar( $_GET['paged'] ) ? max( 1, (int) $_GET['paged'] ) : 1;
		$result_filter = isset( $_GET['result'] ) && is_string( $_GET['result'] )
			? sanitize_key( wp_unslash( $_GET['result'] ) )
			: '';

		$where  = '1=1';
		$params = array();

		if ( '' !== $result_filter ) {
			$where   .= ' AND l.result = %s';
			$params[] = $result_filter;
		}

		$count_sql = "SELECT COUNT(*) FROM {$log_table} l WHERE {$where}";
		$total     = (int) $wpdb->get_var( $params ? $wpdb->prepare( $count_sql, $params ) : $count_sql );

		$query_params   = $params;
		$query_params[] = $per_page;
		$query_params[] = ( $paged - 1 ) * $per_page;

		$sql = "SELECT l.*, c.coupon_code
			FROM {$log_table} l
			LEFT JOIN {$coupons_table} c ON c.id = l.coupon_id
			WHERE {$where}
			ORDER BY l.scanned_at DESC
			LIMIT %d OFFSET %d";

		$rows = $wpdb->get_results( $wpdb->prepare( $sql, $query_params ) );
		$results = $wpdb->get_col( "SELECT DISTINCT result FROM {$log_table} ORDER BY result ASC" );

		$filter_args = array( 'page' => 'fm-cash-claims-audit' );
		if ( '' !== $result_filter ) {
			$filter_args['result'] = $result_filter;
		}
		$base = add_query_arg( $filter_args, admin_url( 'admin.php' ) );
		$base = add_query_arg( 'paged', '%#%', $base );

		$pagination = paginate_links(
			array(
				'base'      => $base,
				'format'    => '',
				'current'   => $paged,
				'total'     => (int) ceil( $total / $per_page ),
				'prev_text' => '‹',
				'next_text' => '›',
			)
		);
		?>
		<div class="wrap fm-cash-wrap">
			<div class="fm-page-head">
				<div>
					<h1><?php esc_html_e( 'Audit Log', 'fm-cash-claims' ); ?></h1>
					<p><?php esc_html_e( 'Scan attempts and admin payout actions. Raw tokens are never stored; the log keeps a SHA-256 hash.', 'fm-cash-claims' ); ?></p>
				</div>
			</div>

			<form method="get" action="<?php echo esc_url( admin_url( 'admin.php' ) ); ?>" class="fm-filter-bar">
				<input type="hidden" name="page" value="fm-cash-claims-audit" />
				<select name="result">
					<option value=""><?php esc_html_e( 'All results', 'fm-cash-claims' ); ?></option>
					<?php foreach ( (array) $results as $result_option ) : ?>
						<option value="<?php echo esc_attr( (string) $result_option ); ?>" <?php selected( $result_filter, (string) $result_option ); ?>><?php echo esc_html( ucwords( str_replace( '_', ' ', (string) $result_option ) ) ); ?></option>
					<?php endforeach; ?>
				</select>
				<button type="submit" class="button"><?php esc_html_e( 'Filter', 'fm-cash-claims' ); ?></button>
				<a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-audit' ) ); ?>"><?php esc_html_e( 'Reset', 'fm-cash-claims' ); ?></a>
			</form>

			<table class="widefat striped fm-table">
				<thead>
					<tr>
						<th><?php esc_html_e( 'Time', 'fm-cash-claims' ); ?></th>
						<th><?php esc_html_e( 'Result', 'fm-cash-claims' ); ?></th>
						<th><?php esc_html_e( 'Coupon', 'fm-cash-claims' ); ?></th>
						<th><?php esc_html_e( 'Token hash', 'fm-cash-claims' ); ?></th>
						<th><?php esc_html_e( 'IP address', 'fm-cash-claims' ); ?></th>
						<th><?php esc_html_e( 'User agent', 'fm-cash-claims' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php if ( array() === $rows ) : ?>
						<tr><td colspan="6"><?php esc_html_e( 'No scan records match this filter.', 'fm-cash-claims' ); ?></td></tr>
					<?php else : ?>
						<?php foreach ( $rows as $row ) : ?>
							<tr>
								<td><?php echo esc_html( get_date_from_gmt( (string) $row->scanned_at, 'M j, Y g:i:s A' ) ); ?></td>
								<td><code><?php echo esc_html( (string) $row->result ); ?></code></td>
								<td><?php echo esc_html( ! empty( $row->coupon_code ) ? (string) $row->coupon_code : '—' ); ?></td>
								<td><code title="<?php echo esc_attr( (string) $row->token_hash ); ?>"><?php echo esc_html( substr( (string) $row->token_hash, 0, 12 ) . '…' ); ?></code></td>
								<td><?php echo esc_html( (string) ( $row->ip_address ?: '—' ) ); ?></td>
								<td><small><?php echo esc_html( (string) ( $row->user_agent ?: '—' ) ); ?></small></td>
							</tr>
						<?php endforeach; ?>
					<?php endif; ?>
				</tbody>
			</table>

			<?php if ( $pagination ) : ?>
				<div class="tablenav"><div class="tablenav-pages"><?php echo wp_kses_post( (string) $pagination ); ?></div></div>
			<?php endif; ?>
		</div>
		<?php
	}

	public function render_settings(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to view this page.', 'fm-cash-claims' ) );
		}

		$settings = FM_Cash_Claims_Settings::get_all();
		?>
		<div class="wrap fm-cash-wrap">
			<div class="fm-page-head">
				<div>
					<h1><?php esc_html_e( 'Settings', 'fm-cash-claims' ); ?></h1>
					<p><?php esc_html_e( 'Claim page copy, support contacts, fraud controls, and data retention.', 'fm-cash-claims' ); ?></p>
				</div>
			</div>

			<?php settings_errors(); ?>

			<form method="post" action="<?php echo esc_url( admin_url( 'options.php' ) ); ?>" class="fm-settings-form">
				<?php settings_fields( 'fm_cash_claims_settings_group' ); ?>

				<div class="fm-two-col">
					<section class="fm-panel">
						<div class="fm-panel-head"><h2><?php esc_html_e( 'Claim page', 'fm-cash-claims' ); ?></h2></div>
						<div class="fm-form">
							<label>
								<span><?php esc_html_e( 'Currency symbol', 'fm-cash-claims' ); ?></span>
								<input type="text" name="fm_cash_claims_settings[currency_symbol]" value="<?php echo esc_attr( (string) $settings['currency_symbol'] ); ?>" maxlength="8" />
							</label>
							<label>
								<span><?php esc_html_e( 'Claim declaration', 'fm-cash-claims' ); ?></span>
								<textarea name="fm_cash_claims_settings[terms_text]" rows="5"><?php echo esc_textarea( (string) $settings['terms_text'] ); ?></textarea>
								<small><?php esc_html_e( 'Shown above the required checkbox on the claim form.', 'fm-cash-claims' ); ?></small>
							</label>
							<label>
								<span><?php esc_html_e( 'Support phone', 'fm-cash-claims' ); ?></span>
								<input type="text" name="fm_cash_claims_settings[support_phone]" value="<?php echo esc_attr( (string) $settings['support_phone'] ); ?>" maxlength="40" />
							</label>
							<label>
								<span><?php esc_html_e( 'Support email', 'fm-cash-claims' ); ?></span>
								<input type="email" name="fm_cash_claims_settings[support_email]" value="<?php echo esc_attr( (string) $settings['support_email'] ); ?>" maxlength="120" />
							</label>
							<label>
								<span><?php esc_html_e( 'Support address', 'fm-cash-claims' ); ?></span>
								<textarea name="fm_cash_claims_settings[support_address]" rows="3"><?php echo esc_textarea( (string) $settings['support_address'] ); ?></textarea>
							</label>
						</div>
					</section>

					<section class="fm-panel">
						<div class="fm-panel-head"><h2><?php esc_html_e( 'Operations', 'fm-cash-claims' ); ?></h2></div>
						<div class="fm-form">
							<label>
								<span><?php esc_html_e( 'Admin notification email', 'fm-cash-claims' ); ?></span>
								<input type="email" name="fm_cash_claims_settings[admin_notification_email]" value="<?php echo esc_attr( (string) $settings['admin_notification_email'] ); ?>" maxlength="120" />
								<small><?php esc_html_e( 'Leave empty to use the site admin email. A notification is sent on each successful claim.', 'fm-cash-claims' ); ?></small>
							</label>
							<label>
								<span><?php esc_html_e( 'Claim window (days)', 'fm-cash-claims' ); ?></span>
								<input type="number" name="fm_cash_claims_settings[claim_window_days]" value="<?php echo esc_attr( (string) $settings['claim_window_days'] ); ?>" min="0" max="365" />
								<small><?php esc_html_e( 'Applied to newly imported batches. 0 means no automatic end date. Existing batches can be changed on the batch edit screen.', 'fm-cash-claims' ); ?></small>
							</label>
							<label>
								<span><?php esc_html_e( 'Maximum claims per phone', 'fm-cash-claims' ); ?></span>
								<input type="number" name="fm_cash_claims_settings[max_claims_per_phone]" value="<?php echo esc_attr( (string) $settings['max_claims_per_phone'] ); ?>" min="0" max="1000" />
								<small><?php esc_html_e( '0 means unlimited. Rejected claims do not count toward the limit.', 'fm-cash-claims' ); ?></small>
							</label>
							<label class="fm-checkbox-label">
								<input type="checkbox" name="fm_cash_claims_settings[delete_data_on_uninstall]" value="1" <?php checked( ! empty( $settings['delete_data_on_uninstall'] ) ); ?> />
								<span><?php esc_html_e( 'Delete all plugin tables and settings when the plugin is uninstalled.', 'fm-cash-claims' ); ?></span>
							</label>
						</div>
					</section>
				</div>

				<section class="fm-panel">
					<div class="fm-panel-head"><h2><?php esc_html_e( 'Claim page address', 'fm-cash-claims' ); ?></h2></div>
					<p><?php esc_html_e( 'The plugin serves the public claim form at:', 'fm-cash-claims' ); ?> <code><?php echo esc_html( home_url( '/claim/' ) ); ?></code></p>
					<p class="fm-muted"><?php esc_html_e( 'The QR code on each coupon points to this address with a secret token. If the address returns a 404, open Settings → Permalinks and save once to flush the rewrite rules. Do not change the claim base URL in the generator after printing coupons.', 'fm-cash-claims' ); ?></p>
				</section>

				<?php submit_button( __( 'Save settings', 'fm-cash-claims' ) ); ?>
			</form>
		</div>
		<?php
	}

	public function handle_update_batch(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to update this batch.', 'fm-cash-claims' ) );
		}

		$batch_id = isset( $_POST['batch_id'] ) && is_string( $_POST['batch_id'] )
			? sanitize_text_field( wp_unslash( $_POST['batch_id'] ) )
			: '';
		check_admin_referer( 'fm_cash_update_batch_' . $batch_id );

		$batch = $this->db->get_batch( $batch_id );
		if ( ! $batch ) {
			$this->store_notice( 'error', __( 'Batch not found.', 'fm-cash-claims' ) );
			$this->redirect( admin_url( 'admin.php?page=fm-cash-claims-batches' ) );
		}

		$label  = isset( $_POST['label'] ) && is_string( $_POST['label'] )
			? sanitize_text_field( wp_unslash( $_POST['label'] ) )
			: '';
		$status = isset( $_POST['status'] ) && is_string( $_POST['status'] )
			? sanitize_key( wp_unslash( $_POST['status'] ) )
			: 'active';
		if ( ! in_array( $status, array( 'active', 'closed', 'void' ), true ) ) {
			$status = 'active';
		}

		$start_raw = isset( $_POST['claim_start'] ) && is_string( $_POST['claim_start'] )
			? sanitize_text_field( wp_unslash( $_POST['claim_start'] ) )
			: '';
		$end_raw   = isset( $_POST['claim_end'] ) && is_string( $_POST['claim_end'] )
			? sanitize_text_field( wp_unslash( $_POST['claim_end'] ) )
			: '';

		$start = $this->local_input_to_gmt( $start_raw );
		$end   = $this->local_input_to_gmt( $end_raw );

		if ( is_wp_error( $start ) || is_wp_error( $end ) ) {
			$message = is_wp_error( $start ) ? $start->get_error_message() : ( is_wp_error( $end ) ? $end->get_error_message() : '' );
			$this->store_notice( 'error', $message );
			$this->redirect( FM_Cash_Claims_Util::admin_batch_url( $batch_id ) );
		}

		if ( is_string( $start ) && is_string( $end ) && $end < $start ) {
			$this->store_notice( 'error', __( 'The claim end time must be after the claim start time.', 'fm-cash-claims' ) );
			$this->redirect( FM_Cash_Claims_Util::admin_batch_url( $batch_id ) );
		}

		global $wpdb;

		$updated = $wpdb->update(
			$this->db->batches_table(),
			array(
				'label'       => mb_substr( $label, 0, 120 ),
				'status'      => $status,
				'claim_start' => $start,
				'claim_end'   => $end,
				'updated_at'  => $this->db->now(),
			),
			array( 'batch_id' => $batch_id ),
			array( '%s', '%s', '%s', '%s', '%s' ),
			array( '%s' )
		);

		if ( false === $updated ) {
			$this->store_notice( 'error', __( 'The batch settings could not be saved.', 'fm-cash-claims' ) );
		} else {
			$this->store_notice( 'success', __( 'Batch settings saved.', 'fm-cash-claims' ) );
		}

		$this->redirect( FM_Cash_Claims_Util::admin_batch_url( $batch_id ) );
	}

	public function handle_delete_batch(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to delete this batch.', 'fm-cash-claims' ) );
		}

		$batch_id = isset( $_GET['batch_id'] ) && is_string( $_GET['batch_id'] )
			? sanitize_text_field( wp_unslash( $_GET['batch_id'] ) )
			: '';
		check_admin_referer( 'fm_cash_delete_batch_' . $batch_id );

		$result = $this->db->delete_batch( $batch_id );
		if ( is_wp_error( $result ) ) {
			$this->store_notice( 'error', $result->get_error_message() );
		} else {
			$this->store_notice( 'success', __( 'Batch deleted.', 'fm-cash-claims' ) );
		}

		$this->redirect( admin_url( 'admin.php?page=fm-cash-claims-batches' ) );
	}

	public function handle_mark_paid(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to update this claim.', 'fm-cash-claims' ) );
		}

		$claim_id = isset( $_POST['claim_id'] ) && is_scalar( $_POST['claim_id'] ) ? absint( $_POST['claim_id'] ) : 0;
		check_admin_referer( 'fm_cash_mark_paid_' . $claim_id );

		$claim = $this->db->get_claim( $claim_id );
		if ( ! $claim ) {
			$this->store_notice( 'error', __( 'Claim not found.', 'fm-cash-claims' ) );
			$this->redirect( admin_url( 'admin.php?page=fm-cash-claims-claims' ) );
		}

		$note   = isset( $_POST['payment_note'] ) && is_string( $_POST['payment_note'] )
			? sanitize_textarea_field( wp_unslash( $_POST['payment_note'] ) )
			: '';
		$result = $this->db->mark_claim_paid( $claim_id, get_current_user_id(), $note );

		if ( is_wp_error( $result ) ) {
			$this->db->log_scan( '', (int) $claim->coupon_id, 'admin_paid_failed', $this->db->get_client_ip(), 'wp-admin' );
			$this->store_notice( 'error', $result->get_error_message() );
		} else {
			$this->db->log_scan( '', (int) $claim->coupon_id, 'admin_paid', $this->db->get_client_ip(), 'wp-admin' );
			$this->store_notice( 'success', __( 'Claim marked as paid. The coupon is now paid.', 'fm-cash-claims' ) );
		}

		$this->redirect( FM_Cash_Claims_Util::admin_claim_url( $claim_id ) );
	}

	public function handle_reject_claim(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to update this claim.', 'fm-cash-claims' ) );
		}

		$claim_id = isset( $_POST['claim_id'] ) && is_scalar( $_POST['claim_id'] ) ? absint( $_POST['claim_id'] ) : 0;
		check_admin_referer( 'fm_cash_reject_claim_' . $claim_id );

		$reason = isset( $_POST['rejection_reason'] ) && is_string( $_POST['rejection_reason'] )
			? sanitize_textarea_field( wp_unslash( $_POST['rejection_reason'] ) )
			: '';
		if ( '' === trim( $reason ) ) {
			$this->store_notice( 'error', __( 'Enter a rejection reason.', 'fm-cash-claims' ) );
			$this->redirect( FM_Cash_Claims_Util::admin_claim_url( $claim_id ) );
		}

		$claim  = $this->db->get_claim( $claim_id );
		$result = $this->db->reject_claim( $claim_id, $reason );

		if ( is_wp_error( $result ) ) {
			$this->store_notice( 'error', $result->get_error_message() );
		} else {
			if ( $claim ) {
				$this->db->log_scan( '', (int) $claim->coupon_id, 'admin_rejected', $this->db->get_client_ip(), 'wp-admin' );
			}
			$this->store_notice( 'success', __( 'Claim rejected. The coupon remains claimed.', 'fm-cash-claims' ) );
		}

		$this->redirect( FM_Cash_Claims_Util::admin_claim_url( $claim_id ) );
	}

	public function handle_reopen_claim(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to update this claim.', 'fm-cash-claims' ) );
		}

		$claim_id = isset( $_POST['claim_id'] ) && is_scalar( $_POST['claim_id'] ) ? absint( $_POST['claim_id'] ) : 0;
		check_admin_referer( 'fm_cash_reopen_claim_' . $claim_id );

		$claim  = $this->db->get_claim( $claim_id );
		$result = $this->db->reopen_claim( $claim_id );

		if ( is_wp_error( $result ) ) {
			$this->store_notice( 'error', $result->get_error_message() );
			$this->redirect( FM_Cash_Claims_Util::admin_claim_url( $claim_id ) );
		}

		if ( $claim ) {
			$this->db->log_scan( '', (int) $claim->coupon_id, 'admin_reopened', $this->db->get_client_ip(), 'wp-admin' );
		}

		$this->store_notice( 'success', __( 'Claim reopened. The coupon is claimable again.', 'fm-cash-claims' ) );
		$this->redirect( admin_url( 'admin.php?page=fm-cash-claims-claims' ) );
	}

	private function export_url( array $extra = array() ): string {
		$args = array( 'action' => 'fm_cash_export_claims' );

		foreach ( array( 'status', 'batch', 'claim_date', 's' ) as $key ) {
			if ( isset( $_GET[ $key ] ) && is_string( $_GET[ $key ] ) && '' !== $_GET[ $key ] ) {
				$args[ $key ] = sanitize_text_field( wp_unslash( $_GET[ $key ] ) );
			}
		}

		$args = array_merge( $args, $extra );

		return wp_nonce_url( add_query_arg( $args, admin_url( 'admin-post.php' ) ), 'fm_cash_export_claims' );
	}

	private function local_input_to_gmt( string $value ): string|WP_Error|null {
		$value = trim( $value );
		if ( '' === $value ) {
			return null;
		}

		if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $value ) ) {
			return new WP_Error( 'invalid_datetime', __( 'Enter a valid date and time.', 'fm-cash-claims' ) );
		}

		$local = str_replace( 'T', ' ', $value ) . ':00';
		$gmt   = get_gmt_from_date( $local );

		if ( '0000-00-00 00:00:00' === $gmt ) {
			return new WP_Error( 'invalid_datetime', __( 'Enter a valid date and time.', 'fm-cash-claims' ) );
		}

		return $gmt;
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

	private function redirect( string $url ): void {
		wp_safe_redirect( $url );
		exit;
	}
}
