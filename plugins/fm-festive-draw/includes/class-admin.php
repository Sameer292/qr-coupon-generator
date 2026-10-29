<?php
/**
 * Admin Menus, Dashboard, WP_List_Table, Settings, and CSV Export.
 *
 * @package FM_Festive_Draw
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'WP_List_Table' ) ) {
	require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
}

/**
 * Coupons WP_List_Table.
 */
class FM_Coupons_List_Table extends WP_List_Table {

	private FM_DB $db;

	public function __construct( FM_DB $db ) {
		parent::__construct(
			[
				'singular' => 'coupon',
				'plural'   => 'coupons',
				'ajax'     => false,
			]
		);
		$this->db = $db;
	}

	public function get_columns(): array {
		return [
			'coupon_code'       => __( 'Coupon Code', 'fm-festive-draw' ),
			'status'            => __( 'Status', 'fm-festive-draw' ),
			'week_number'       => __( 'Week', 'fm-festive-draw' ),
			'participant_name'  => __( 'Participant Name', 'fm-festive-draw' ),
			'participant_phone' => __( 'Phone Number', 'fm-festive-draw' ),
			'batch_id'          => __( 'Batch ID', 'fm-festive-draw' ),
			'activated_at'      => __( 'Activated At', 'fm-festive-draw' ),
			'actions'           => __( 'Actions', 'fm-festive-draw' ),
		];
	}

	public function get_sortable_columns(): array {
		return [
			'coupon_code'  => [ 'coupon_code', false ],
			'status'       => [ 'status', false ],
			'week_number'  => [ 'week_number', false ],
			'activated_at' => [ 'activated_at', true ],
		];
	}

	public function get_column_info() {
		return [
			$this->get_columns(),
			[],
			$this->get_sortable_columns(),
			$this->get_primary_column_name(),
		];
	}

	protected function get_primary_column_name(): string {
		return 'coupon_code';
	}

	public function column_default( $item, $column_name ) {
		switch ( $column_name ) {
			case 'batch_id':
				return esc_html( (string) ( $item['batch_id'] ?? '' ) );
			case 'week_number':
				return ! empty( $item['week_number'] ) ? esc_html( sprintf( __( 'Week %d', 'fm-festive-draw' ), (int) $item['week_number'] ) ) : '&mdash;';
			case 'participant_name':
				return ! empty( $item['participant_name'] ) ? esc_html( (string) $item['participant_name'] ) : '&mdash;';
			case 'participant_phone':
				return ! empty( $item['participant_phone'] ) ? '<code>' . esc_html( (string) $item['participant_phone'] ) . '</code>' : '&mdash;';
			case 'activated_at':
				return ! empty( $item['activated_at'] ) ? esc_html( wp_date( 'M j, Y g:i A', strtotime( (string) $item['activated_at'] ) ) ) : '&mdash;';
			default:
				return isset( $item[ $column_name ] ) ? esc_html( (string) $item[ $column_name ] ) : '';
		}
	}

	public function column_coupon_code( $item ): string {
		return sprintf( '<strong class="fm-code-badge">%s</strong>', esc_html( (string) ( $item['coupon_code'] ?? '' ) ) );
	}

	public function column_status( $item ): string {
		$status = (string) ( $item['status'] ?? 'issued' );
		$class  = match ( $status ) {
			'activated' => 'fm-badge-success',
			'won'       => 'fm-badge-gold',
			'claimed'   => 'fm-badge-purple',
			'void'      => 'fm-badge-danger',
			default     => 'fm-badge-neutral',
		};

		return sprintf( '<span class="fm-badge %s">%s</span>', esc_attr( $class ), esc_html( ucfirst( $status ) ) );
	}

	public function column_actions( $item ): string {
		if ( 'won' === ( $item['status'] ?? '' ) ) {
			$claim_url = wp_nonce_url(
				admin_url( 'admin-post.php?action=fm_mark_claimed&coupon_id=' . (int) $item['id'] ),
				'fm_mark_claimed_' . (int) $item['id']
			);
			return sprintf(
				'<a href="%s" class="button button-small button-secondary" onclick="return confirm(\'%s\');">%s</a>',
				esc_url( $claim_url ),
				esc_js( __( 'Mark this winning coupon as claimed?', 'fm-festive-draw' ) ),
				esc_html__( 'Mark Claimed', 'fm-festive-draw' )
			);
		}

		return '&mdash;';
	}

	public function extra_tablenav( $which ): void {
		if ( 'top' !== $which ) {
			return;
		}

		$current_status = sanitize_text_field( $_GET['filter_status'] ?? '' );
		$current_week   = isset( $_GET['filter_week'] ) && '' !== $_GET['filter_week'] ? absint( $_GET['filter_week'] ) : '';

		echo '<div class="alignleft actions">';
		echo '<select name="filter_status">';
		echo '<option value="">' . esc_html__( 'All Statuses', 'fm-festive-draw' ) . '</option>';
		foreach ( [ 'issued', 'activated', 'won', 'claimed', 'void' ] as $st ) {
			printf( '<option value="%s" %s>%s</option>', esc_attr( $st ), selected( $current_status, $st, false ), esc_html( ucfirst( $st ) ) );
		}
		echo '</select>';

		echo '<select name="filter_week">';
		echo '<option value="">' . esc_html__( 'All Weeks', 'fm-festive-draw' ) . '</option>';
		for ( $w = 1; $w <= 4; $w++ ) {
			printf( '<option value="%d" %s>%s</option>', $w, selected( (string) $current_week, (string) $w, false ), esc_html( sprintf( __( 'Week %d', 'fm-festive-draw' ), $w ) ) );
		}
		echo '</select>';

		submit_button( __( 'Filter', 'fm-festive-draw' ), 'button', 'filter_action', false );
		echo '</div>';
	}

	public function prepare_items(): void {
		global $wpdb;
		$table = $this->db->get_coupons_table();

		$columns               = $this->get_columns();
		$hidden                = [];
		$sortable              = $this->get_sortable_columns();
		$this->_column_headers = [ $columns, $hidden, $sortable, $this->get_primary_column_name() ];

		$per_page     = 25;
		$current_page = $this->get_pagenum();
		$offset       = ( $current_page - 1 ) * $per_page;

		$where_clauses = [ '1=1' ];
		$params        = [];

		// Filter by status.
		if ( ! empty( $_GET['filter_status'] ) ) {
			$where_clauses[] = 'status = %s';
			$params[]        = sanitize_text_field( $_GET['filter_status'] );
		}

		// Filter by week.
		if ( isset( $_GET['filter_week'] ) && '' !== $_GET['filter_week'] ) {
			$where_clauses[] = 'week_number = %d';
			$params[]        = absint( $_GET['filter_week'] );
		}

		// Search query (coupon_code, participant_phone, participant_name).
		if ( ! empty( $_REQUEST['s'] ) ) {
			$search          = '%' . $wpdb->esc_like( sanitize_text_field( wp_unslash( $_REQUEST['s'] ) ) ) . '%';
			$where_clauses[] = '(coupon_code LIKE %s OR participant_phone LIKE %s OR participant_name LIKE %s)';
			$params[]        = $search;
			$params[]        = $search;
			$params[]        = $search;
		}

		$where_sql = implode( ' AND ', $where_clauses );

		// Sorting.
		$orderby = sanitize_sql_orderby( ( $_GET['orderby'] ?? 'id' ) . ' ' . ( $_GET['order'] ?? 'DESC' ) );
		if ( empty( $orderby ) ) {
			$orderby = 'id DESC';
		}

		// Total count query.
		$count_sql = "SELECT COUNT(*) FROM {$table} WHERE {$where_sql}";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$total_items = ! empty( $params )
			? (int) $wpdb->get_var( $wpdb->prepare( $count_sql, ...$params ) ) // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			: (int) $wpdb->get_var( $count_sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		// Items query.
		$items_sql = "SELECT * FROM {$table} WHERE {$where_sql} ORDER BY {$orderby} LIMIT %d OFFSET %d";
		$query_params = array_merge( $params, [ $per_page, $offset ] );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$this->items = $wpdb->get_results(
			$wpdb->prepare( $items_sql, ...$query_params ), // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			ARRAY_A
		);

		$this->set_pagination_args(
			[
				'total_items' => $total_items,
				'per_page'    => $per_page,
				'total_pages' => ceil( $total_items / $per_page ),
			]
		);
	}
}

/**
 * Scan Audit Log WP_List_Table.
 */
class FM_Scan_Log_List_Table extends WP_List_Table {

	private FM_DB $db;

	public function __construct( FM_DB $db ) {
		parent::__construct(
			[
				'singular' => 'scan_log',
				'plural'   => 'scan_logs',
				'ajax'     => false,
			]
		);
		$this->db = $db;
	}

	public function get_columns(): array {
		return [
			'scanned_at' => __( 'Timestamp', 'fm-festive-draw' ),
			'result'     => __( 'Result Code', 'fm-festive-draw' ),
			'ip_address' => __( 'IP Address', 'fm-festive-draw' ),
			'qr_token'   => __( 'Token (Masked)', 'fm-festive-draw' ),
			'user_agent' => __( 'User Agent', 'fm-festive-draw' ),
		];
	}

	public function get_sortable_columns(): array {
		return [
			'scanned_at' => [ 'scanned_at', true ],
			'result'     => [ 'result', false ],
		];
	}

	public function get_column_info() {
		return [
			$this->get_columns(),
			[],
			$this->get_sortable_columns(),
			$this->get_primary_column_name(),
		];
	}

	protected function get_primary_column_name(): string {
		return 'scanned_at';
	}

	public function column_default( $item, $column_name ) {
		switch ( $column_name ) {
			case 'scanned_at':
				return esc_html( wp_date( 'Y-m-d H:i:s', strtotime( (string) $item['scanned_at'] ) ) );
			case 'user_agent':
				return '<span title="' . esc_attr( (string) ( $item['user_agent'] ?? '' ) ) . '">' . esc_html( wp_html_excerpt( (string) ( $item['user_agent'] ?? '' ), 40, '&hellip;' ) ) . '</span>';
			default:
				return isset( $item[ $column_name ] ) ? esc_html( (string) $item[ $column_name ] ) : '';
		}
	}

	public function column_qr_token( $item ): string {
		$tok = (string) ( $item['qr_token'] ?? '' );
		return esc_html( substr( $tok, 0, 6 ) . '...' . substr( $tok, -4 ) );
	}

	public function column_ip_address( $item ): string {
		$ip = $this->db->binary_to_ip( $item['ip_address'] );
		return esc_html( $ip ?? 'Unknown' );
	}

	public function column_result( $item ): string {
		$res   = (string) ( $item['result'] ?? '' );
		$class = match ( $res ) {
			'valid'          => 'fm-badge-success',
			'already_used'   => 'fm-badge-gold',
			'rate_limited'   => 'fm-badge-danger',
			'outside_window' => 'fm-badge-purple',
			default          => 'fm-badge-neutral',
		};

		return sprintf( '<span class="fm-badge %s">%s</span>', esc_attr( $class ), esc_html( $res ) );
	}

	public function prepare_items(): void {
		global $wpdb;
		$table = $this->db->get_scan_log_table();

		$columns               = $this->get_columns();
		$hidden                = [];
		$sortable              = $this->get_sortable_columns();
		$this->_column_headers = [ $columns, $hidden, $sortable, $this->get_primary_column_name() ];

		$per_page     = 30;
		$current_page = $this->get_pagenum();
		$offset       = ( $current_page - 1 ) * $per_page;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$total_items = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$this->items = $wpdb->get_results(
			$wpdb->prepare( "SELECT * FROM {$table} ORDER BY id DESC LIMIT %d OFFSET %d", $per_page, $offset ),
			ARRAY_A
		);

		$this->set_pagination_args(
			[
				'total_items' => $total_items,
				'per_page'    => $per_page,
				'total_pages' => ceil( $total_items / $per_page ),
			]
		);
	}
}

/**
 * Main Admin Class managing navigation, rendering views, settings, and CSV export.
 */
class FM_Admin {

	/**
	 * Database handler.
	 *
	 * @var FM_DB
	 */
	private FM_DB $db;

	/**
	 * Constructor.
	 *
	 * @param FM_DB $db Database instance.
	 */
	public function __construct( FM_DB $db ) {
		$this->db = $db;

		add_action( 'admin_menu', [ $this, 'register_admin_menus' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_assets' ] );
		add_action( 'admin_post_fm_export_coupons', [ $this, 'handle_csv_export' ] );
		add_action( 'admin_post_fm_save_settings', [ $this, 'handle_save_settings' ] );
		add_action( 'admin_post_fm_direct_csv_import', [ $this, 'handle_direct_csv_import' ] );
		add_action( 'admin_post_fm_reset_database', [ $this, 'handle_reset_database' ] );
		add_action( 'admin_post_fm_sync_dates', [ $this, 'handle_sync_dates' ] );
	}

	/**
	 * Register menu items.
	 */
	public function register_admin_menus(): void {
		add_menu_page(
			__( 'Festive Draw', 'fm-festive-draw' ),
			__( 'Festive Draw', 'fm-festive-draw' ),
			'manage_options',
			'fm-festive-draw',
			[ $this, 'render_dashboard_page' ],
			'dashicons-tickets-alt',
			26
		);

		add_submenu_page(
			'fm-festive-draw',
			__( 'Coupons Dashboard', 'fm-festive-draw' ),
			__( 'Dashboard', 'fm-festive-draw' ),
			'manage_options',
			'fm-festive-draw',
			[ $this, 'render_dashboard_page' ]
		);

		add_submenu_page(
			'fm-festive-draw',
			__( 'Import CSV Manifest', 'fm-festive-draw' ),
			__( 'Import CSV', 'fm-festive-draw' ),
			'manage_options',
			'fm-csv-import',
			[ $this, 'render_import_page' ]
		);

		add_submenu_page(
			'fm-festive-draw',
			__( 'Weekly Draw Tool', 'fm-festive-draw' ),
			__( 'Run Draw', 'fm-festive-draw' ),
			'manage_options',
			'fm-draw-tool',
			[ $this, 'render_draw_page' ]
		);

		add_submenu_page(
			'fm-festive-draw',
			__( 'Scan Audit Log', 'fm-festive-draw' ),
			__( 'Audit Log', 'fm-festive-draw' ),
			'manage_options',
			'fm-scan-log',
			[ $this, 'render_scan_log_page' ]
		);

		add_submenu_page(
			'fm-festive-draw',
			__( 'Campaign Settings', 'fm-festive-draw' ),
			__( 'Settings', 'fm-festive-draw' ),
			'manage_options',
			'fm-draw-settings',
			[ $this, 'render_settings_page' ]
		);
	}

	/**
	 * Enqueue admin stylesheets and scripts.
	 *
	 * @param string $hook_suffix Admin page hook.
	 */
	public function enqueue_admin_assets( string $hook_suffix ): void {
		if ( false === strpos( $hook_suffix, 'fm-' ) && false === strpos( $hook_suffix, 'fm_festive' ) ) {
			return;
		}

		wp_enqueue_style( 'fm-admin-css', FM_FESTIVE_DRAW_URL . 'assets/admin.css', [], FM_FESTIVE_DRAW_VERSION );
		wp_enqueue_script( 'fm-admin-js', FM_FESTIVE_DRAW_URL . 'assets/admin.js', [ 'jquery' ], FM_FESTIVE_DRAW_VERSION, true );

		wp_localize_script(
			'fm-admin-js',
			'fmAdminConfig',
			[
				'ajaxUrl'     => admin_url( 'admin-ajax.php' ),
				'importNonce' => wp_create_nonce( 'fm_import_nonce' ),
				'strings'     => [
					'confirmDraw'   => __( 'Are you sure you want to conduct the prize draw now? This will permanently assign winners.', 'fm-festive-draw' ),
					'confirmRerun'  => __( 'WARNING: A draw for this week already exists! Re-running will discard previous winners. Proceed?', 'fm-festive-draw' ),
					'importing'     => __( 'Processing CSV in batches...', 'fm-festive-draw' ),
					'importDone'    => __( 'Import completed successfully!', 'fm-festive-draw' ),
					'importFailed'  => __( 'Import failed: ', 'fm-festive-draw' ),
				],
			]
		);
	}

	/**
	 * Get summary counts by status and by week.
	 *
	 * @return array
	 */
	public function get_dashboard_counts(): array {
		global $wpdb;
		$table = $this->db->get_coupons_table();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$status_rows = $wpdb->get_results(
			"SELECT status, COUNT(*) as cnt FROM {$table} GROUP BY status",
			ARRAY_A
		);

		$counts = [
			'issued'    => 0,
			'activated' => 0,
			'won'       => 0,
			'claimed'   => 0,
			'void'      => 0,
			'total'     => 0,
			'weeks'     => [ 1 => 0, 2 => 0, 3 => 0, 4 => 0 ],
		];

		if ( ! empty( $status_rows ) ) {
			foreach ( $status_rows as $row ) {
				$st = $row['status'];
				$c  = (int) $row['cnt'];
				if ( isset( $counts[ $st ] ) ) {
					$counts[ $st ] = $c;
				}
				$counts['total'] += $c;
			}
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$week_rows = $wpdb->get_results(
			"SELECT week_number, COUNT(*) as cnt FROM {$table} WHERE week_number IS NOT NULL GROUP BY week_number",
			ARRAY_A
		);

		if ( ! empty( $week_rows ) ) {
			foreach ( $week_rows as $w_row ) {
				$w = (int) $w_row['week_number'];
				if ( isset( $counts['weeks'][ $w ] ) ) {
					$counts['weeks'][ $w ] = (int) $w_row['cnt'];
				}
			}
		}

		return $counts;
	}

	/**
	 * Renders main admin dashboard page with statistics, WP_List_Table, and export form.
	 */
	public function render_dashboard_page(): void {
		$counts = $this->get_dashboard_counts();
		$list_table = new FM_Coupons_List_Table( $this->db );
		$list_table->prepare_items();
		$active_week = fm_current_week();
		?>
		<div class="wrap fm-admin-wrap">
			<h1 class="wp-heading-inline">
				<span class="dashicons dashicons-tickets-alt" style="font-size:28px;vertical-align:middle;margin-right:6px;color:#d97706;"></span>
				<?php esc_html_e( 'Fresh Masala Festive Draw Dashboard', 'fm-festive-draw' ); ?>
			</h1>
			<hr class="wp-header-end">

			<!-- Status Ribbon -->
			<div class="fm-status-ribbon">
				<div class="fm-ribbon-badge">
					<strong><?php esc_html_e( 'Current Status:', 'fm-festive-draw' ); ?></strong>
					<?php if ( null !== $active_week ) : ?>
						<span class="fm-badge fm-badge-success"><?php printf( esc_html__( 'Week %d is LIVE', 'fm-festive-draw' ), $active_week ); ?></span>
					<?php else : ?>
						<span class="fm-badge fm-badge-neutral"><?php esc_html_e( 'Campaign Closed / Outside Window', 'fm-festive-draw' ); ?></span>
					<?php endif; ?>
				</div>
				<div class="fm-ribbon-tz">
					<span class="dashicons dashicons-clock"></span>
					<?php printf( esc_html__( 'Site Timezone: %s (Now: %s)', 'fm-festive-draw' ), esc_html( wp_timezone_string() ), esc_html( wp_date( 'Y-m-d H:i:s' ) ) ); ?>
				</div>
			</div>

			<!-- KPI Cards -->
			<div class="fm-kpi-grid">
				<div class="fm-kpi-card">
					<div class="fm-kpi-title"><?php esc_html_e( 'Total Manifest Pool', 'fm-festive-draw' ); ?></div>
					<div class="fm-kpi-val"><?php echo esc_html( number_format_i18n( $counts['total'] ) ); ?></div>
					<div class="fm-kpi-sub"><?php printf( esc_html__( '%d unactivated in circulation', 'fm-festive-draw' ), $counts['issued'] ); ?></div>
				</div>
				<div class="fm-kpi-card fm-kpi-card-green">
					<div class="fm-kpi-title"><?php esc_html_e( 'Activated Entries', 'fm-festive-draw' ); ?></div>
					<div class="fm-kpi-val"><?php echo esc_html( number_format_i18n( $counts['activated'] ) ); ?></div>
					<div class="fm-kpi-sub"><?php esc_html_e( 'Eligible for upcoming draws', 'fm-festive-draw' ); ?></div>
				</div>
				<div class="fm-kpi-card fm-kpi-card-gold">
					<div class="fm-kpi-title"><?php esc_html_e( 'Winners Selected', 'fm-festive-draw' ); ?></div>
					<div class="fm-kpi-val"><?php echo esc_html( number_format_i18n( $counts['won'] ) ); ?></div>
					<div class="fm-kpi-sub"><?php esc_html_e( 'Awaiting prize claim', 'fm-festive-draw' ); ?></div>
				</div>
				<div class="fm-kpi-card fm-kpi-card-purple">
					<div class="fm-kpi-title"><?php esc_html_e( 'Prizes Claimed', 'fm-festive-draw' ); ?></div>
					<div class="fm-kpi-val"><?php echo esc_html( number_format_i18n( $counts['claimed'] ) ); ?></div>
					<div class="fm-kpi-sub"><?php esc_html_e( 'Verified with ID & coupon', 'fm-festive-draw' ); ?></div>
				</div>
			</div>

			<!-- Weekly Progress Bar Cards -->
			<div class="fm-week-pill-grid">
				<?php for ( $w = 1; $w <= 4; $w++ ) :
					$w_cfg = fm_get_week_config( $w );
					$w_title = $w_cfg['title'] ?? sprintf( __( 'Week %d', 'fm-festive-draw' ), $w );
					$w_count = $counts['weeks'][ $w ] ?? 0;
					$is_live = ( $active_week === $w );
				?>
					<div class="fm-week-pill-card <?php echo $is_live ? 'fm-week-live' : ''; ?>">
						<div class="fm-week-header">
							<strong><?php echo esc_html( $w_title ); ?></strong>
							<?php if ( $is_live ) : ?>
								<span class="fm-live-dot" title="Currently Active"></span>
							<?php endif; ?>
						</div>
						<div class="fm-week-count"><?php echo esc_html( number_format_i18n( $w_count ) ); ?> <small><?php esc_html_e( 'Entries', 'fm-festive-draw' ); ?></small></div>
					</div>
				<?php endfor; ?>
			</div>

			<!-- Export Bar -->
			<div class="fm-export-bar">
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="fm-inline-form">
					<input type="hidden" name="action" value="fm_export_coupons">
					<?php wp_nonce_field( 'fm_export_coupons_nonce' ); ?>
					<strong><span class="dashicons dashicons-download" style="vertical-align:text-bottom;"></span> <?php esc_html_e( 'Export Activated Entries:', 'fm-festive-draw' ); ?></strong>
					<select name="export_week">
						<option value="all"><?php esc_html_e( 'All Campaign Weeks', 'fm-festive-draw' ); ?></option>
						<option value="1"><?php esc_html_e( 'Week 1', 'fm-festive-draw' ); ?></option>
						<option value="2"><?php esc_html_e( 'Week 2', 'fm-festive-draw' ); ?></option>
						<option value="3"><?php esc_html_e( 'Week 3', 'fm-festive-draw' ); ?></option>
						<option value="4"><?php esc_html_e( 'Week 4', 'fm-festive-draw' ); ?></option>
					</select>
					<button type="submit" class="button button-primary"><?php esc_html_e( 'Download CSV Export', 'fm-festive-draw' ); ?></button>
				</form>
			</div>

			<!-- Coupons WP_List_Table -->
			<form id="fm-coupons-table-form" method="get">
				<input type="hidden" name="page" value="fm-festive-draw" />
				<?php
				$list_table->search_box( __( 'Search Coupons or Phone', 'fm-festive-draw' ), 'fm-search' );
				$list_table->display();
				?>
			</form>
		</div>
		<?php
	}

	/**
	 * Renders CSV manifest upload and streaming importer screen.
	 */
	public function render_import_page(): void {
		$summary = get_transient( 'fm_last_import_summary' );
		if ( false !== $summary ) {
			delete_transient( 'fm_last_import_summary' );
		}

		global $wpdb;
		$coupons_table = $this->db->get_coupons_table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$current_total = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$coupons_table}" );
		?>
		<div class="wrap fm-admin-wrap">
			<h1><?php esc_html_e( 'Import Printed Coupons CSV Manifest', 'fm-festive-draw' ); ?></h1>
			<p class="description">
				<?php esc_html_e( 'Upload the CSV manifest produced by the generator tool. The importer streams and processes 5000+ records in atomic batches while skipping duplicates.', 'fm-festive-draw' ); ?>
			</p>

			<?php if ( isset( $_GET['reset_done'] ) ) : ?>
				<div class="notice notice-success is-dismissible" style="padding:12px;font-size:14px;">
					<strong><?php esc_html_e( '✓ Database Reset Successful:', 'fm-festive-draw' ); ?></strong>
					<?php printf( esc_html__( 'All coupons, audit logs, and winner records were permanently deleted (%d coupons wiped). The database is clean and ready for a fresh manifest upload.', 'fm-festive-draw' ), (int) ( $_GET['coupons_deleted'] ?? 0 ) ); ?>
				</div>
			<?php endif; ?>

			<?php if ( ! empty( $summary ) && is_array( $summary ) ) : ?>
				<div class="notice notice-<?php echo $summary['success'] ? 'success' : 'error'; ?> is-dismissible" style="padding:15px;">
					<h3><?php echo esc_html( $summary['message'] ); ?></h3>
					<ul>
						<li><strong><?php esc_html_e( 'Rows Read:', 'fm-festive-draw' ); ?></strong> <?php echo (int) $summary['rows_read']; ?></li>
						<li><strong><?php esc_html_e( 'Coupons Inserted:', 'fm-festive-draw' ); ?></strong> <?php echo (int) $summary['inserted']; ?></li>
						<li><strong><?php esc_html_e( 'Duplicates Skipped:', 'fm-festive-draw' ); ?></strong> <?php echo (int) $summary['duplicates']; ?></li>
						<li><strong><?php esc_html_e( 'Invalid Rows:', 'fm-festive-draw' ); ?></strong> <?php echo (int) $summary['invalid']; ?></li>
					</ul>
					<?php if ( ! empty( $summary['errors'] ) ) : ?>
						<h4><?php esc_html_e( 'Rejection Details (First 20):', 'fm-festive-draw' ); ?></h4>
						<ol style="margin-left:20px;list-style:decimal;">
							<?php foreach ( $summary['errors'] as $err ) : ?>
								<li><?php echo esc_html( $err ); ?></li>
							<?php endforeach; ?>
						</ol>
					<?php endif; ?>
				</div>
			<?php endif; ?>

			<div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:20px;">
				<!-- Manifest Upload Form Card -->
				<div class="fm-card" style="flex:2;min-width:320px;">
					<h2 style="margin-top:0;"><?php esc_html_e( 'Upload Manifest (.csv)', 'fm-festive-draw' ); ?></h2>
					<p>
						<?php esc_html_e( 'Expected Header Columns:', 'fm-festive-draw' ); ?>
						<code>coupon_code,qr_token,batch_id,generated_at</code>
					</p>

					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" enctype="multipart/form-data" id="fm-import-form">
						<input type="hidden" name="action" value="fm_direct_csv_import">
						<?php wp_nonce_field( 'fm_direct_import_nonce' ); ?>

						<table class="form-table">
							<tr>
								<th scope="row"><label for="fm_csv_file"><?php esc_html_e( 'Select CSV File', 'fm-festive-draw' ); ?></label></th>
								<td>
									<input type="file" name="fm_csv_file" id="fm_csv_file" accept=".csv" required class="regular-text">
									<p class="description"><?php esc_html_e( 'Accepts any standard CSV exported from the QR Coupon Generator app.', 'fm-festive-draw' ); ?></p>
								</td>
							</tr>
						</table>

						<p class="submit">
							<button type="submit" class="button button-primary button-large" id="fm-start-import-btn">
								<span class="dashicons dashicons-upload" style="vertical-align:middle;"></span>
								<?php esc_html_e( 'Import Manifest Now', 'fm-festive-draw' ); ?>
							</button>
						</p>
					</form>
				</div>

				<!-- Database Reset / Fresh Start Tool Card -->
				<div class="fm-card" style="flex:1;min-width:280px;border-left:4px solid #ef4444;background:#fffaf0;">
					<h2 style="margin-top:0;color:#991b1b;">
						<span class="dashicons dashicons-trash" style="vertical-align:middle;color:#dc2626;"></span>
						<?php esc_html_e( 'Fresh Start / Reset', 'fm-festive-draw' ); ?>
					</h2>
					<p style="font-size:13px;color:#4b5563;">
						<?php esc_html_e( 'Currently in Database:', 'fm-festive-draw' ); ?> <strong><?php echo esc_html( number_format_i18n( $current_total ) ); ?> <?php esc_html_e( 'coupons', 'fm-festive-draw' ); ?></strong>.
					</p>
					<p style="font-size:13px;color:#b91c1c;">
						<?php esc_html_e( 'Want to wipe previous data and re-upload? This button immediately clears all coupons, registrations, and winner history.', 'fm-festive-draw' ); ?>
					</p>

					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" onsubmit="return confirm('⚠️ DANGER: Are you sure you want to permanently delete ALL coupons, activations, winner history, and scan logs from the database?\n\nThis action cannot be undone. Click OK to start fresh.');">
						<input type="hidden" name="action" value="fm_reset_database">
						<?php wp_nonce_field( 'fm_reset_database_nonce' ); ?>
						<button type="submit" class="button button-danger" style="background:#dc2626;color:#ffffff;border-color:#b91c1c;font-weight:600;padding:6px 14px;height:auto;">
							<?php esc_html_e( '🗑️ Clear Database & Start Fresh', 'fm-festive-draw' ); ?>
						</button>
					</form>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Handles synchronous / direct streaming CSV upload.
	 */
	public function handle_direct_csv_import(): void {
		check_admin_referer( 'fm_direct_import_nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized.', 'fm-festive-draw' ) );
		}

		if ( empty( $_FILES['fm_csv_file'] ) ) {
			wp_die( esc_html__( 'No file uploaded.', 'fm-festive-draw' ) );
		}

		$importer = fm_festive_draw()->importer;
		$val_res  = $importer->validate_uploaded_file( $_FILES['fm_csv_file'] );

		if ( is_wp_error( $val_res ) ) {
			set_transient(
				'fm_last_import_summary',
				[
					'success'    => false,
					'message'    => $val_res->get_error_message(),
					'rows_read'  => 0,
					'inserted'   => 0,
					'duplicates' => 0,
					'invalid'    => 0,
					'errors'     => [],
				],
				60
			);
			wp_safe_redirect( admin_url( 'admin.php?page=fm-csv-import' ) );
			exit;
		}

		$result = $importer->import_file( $_FILES['fm_csv_file']['tmp_name'] );
		set_transient( 'fm_last_import_summary', $result, 120 );

		wp_safe_redirect( admin_url( 'admin.php?page=fm-csv-import' ) );
		exit;
	}

	/**
	 * Renders Prize Draw Tool Screen.
	 */
	public function render_draw_page(): void {
		$draw_handler = fm_festive_draw()->draw;
		$selected_week = isset( $_GET['week'] ) ? absint( $_GET['week'] ) : ( fm_current_week() ?: 1 );
		$week_config   = fm_get_week_config( $selected_week );
		$eligible_cnt  = $draw_handler->get_eligible_count( $selected_week );
		$history       = $draw_handler->get_draw_history( $selected_week );
		$has_drawn     = ! empty( $history );

		$draw_status  = sanitize_text_field( $_GET['draw_status'] ?? '' );
		$draw_message = sanitize_text_field( wp_unslash( $_GET['draw_message'] ?? '' ) );
		?>
		<div class="wrap fm-admin-wrap">
			<h1><?php esc_html_e( 'Weekly Prize Draw Tool', 'fm-festive-draw' ); ?></h1>
			<p class="description"><?php esc_html_e( 'Conduct cryptographically secure random draws for each campaign week with auditable logging and prize claim management.', 'fm-festive-draw' ); ?></p>

			<?php if ( ! empty( $draw_message ) ) : ?>
				<div class="notice notice-<?php echo 'success' === $draw_status ? 'success' : 'error'; ?> is-dismissible">
					<p><?php echo esc_html( $draw_message ); ?></p>
				</div>
			<?php endif; ?>

			<!-- Week Selector Tabs -->
			<div class="fm-tab-nav" style="margin:20px 0 15px;">
				<?php for ( $w = 1; $w <= 4; $w++ ) :
					$is_cur = ( $w === $selected_week );
					$w_url  = add_query_arg( [ 'page' => 'fm-draw-tool', 'week' => $w ], admin_url( 'admin.php' ) );
				?>
					<a href="<?php echo esc_url( $w_url ); ?>" class="button <?php echo $is_cur ? 'button-primary' : 'button-secondary'; ?>">
						<?php printf( esc_html__( 'Week %d Draw', 'fm-festive-draw' ), $w ); ?>
					</a>
				<?php endfor; ?>
			</div>

			<div class="fm-grid-2col">
				<!-- Draw Control Box -->
				<div class="fm-card">
					<h2><?php printf( esc_html__( 'Draw Controls — Week %d', 'fm-festive-draw' ), $selected_week ); ?></h2>
					<p><strong><?php esc_html_e( 'Week Theme:', 'fm-festive-draw' ); ?></strong> <?php echo esc_html( $week_config['title'] ?? '' ); ?></p>

					<div class="fm-info-box">
						<span class="dashicons dashicons-groups" style="font-size:32px;color:#0284c7;margin-right:10px;"></span>
						<div>
							<div style="font-size:22px;font-weight:700;color:#0f172a;"><?php echo esc_html( number_format_i18n( $eligible_cnt ) ); ?></div>
							<div style="color:#64748b;"><?php esc_html_e( 'Eligible Activated Entries in Pool', 'fm-festive-draw' ); ?></div>
						</div>
					</div>

					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" id="fm-draw-form">
						<input type="hidden" name="action" value="fm_execute_draw">
						<input type="hidden" name="week_number" value="<?php echo (int) $selected_week; ?>">
						<?php wp_nonce_field( 'fm_run_draw_nonce' ); ?>

						<table class="form-table">
							<tr>
								<th scope="row"><label for="winner_count"><?php esc_html_e( 'Number of Winners', 'fm-festive-draw' ); ?></label></th>
								<td>
									<input type="number" name="winner_count" id="winner_count" value="<?php echo (int) ( $week_config['winner_count'] ?? 5 ); ?>" min="1" max="100" class="small-text" required>
									<p class="description"><?php esc_html_e( 'Default is configured in settings.', 'fm-festive-draw' ); ?></p>
								</td>
							</tr>

							<?php if ( $has_drawn ) : ?>
								<tr>
									<th scope="row"><?php esc_html_e( 'Re-run Draw', 'fm-festive-draw' ); ?></th>
									<td>
										<label style="color:#dc2626;font-weight:600;">
											<input type="checkbox" name="allow_rerun" value="1">
											<?php esc_html_e( 'Re-run and discard previous draw results for this week', 'fm-festive-draw' ); ?>
										</label>
									</td>
								</tr>
							<?php endif; ?>
						</table>

						<p class="submit">
							<button type="submit" class="button button-primary button-large fm-btn-gold" id="fm-run-draw-btn" <?php disabled( $eligible_cnt < 1 ); ?> onclick="return confirm( <?php echo wp_json_encode( $has_drawn ? __( 'WARNING: A draw was already recorded. Re-running will overwrite existing winners. Proceed?', 'fm-festive-draw' ) : __( 'Are you ready to run the cryptographic draw for this week?', 'fm-festive-draw' ) ); ?> );">
								<span class="dashicons dashicons-awards" style="vertical-align:middle;"></span>
								<?php echo $has_drawn ? esc_html__( 'Re-Run Week Draw', 'fm-festive-draw' ) : esc_html__( 'Run Prize Draw Now', 'fm-festive-draw' ); ?>
							</button>
						</p>
					</form>
				</div>

				<!-- Week Prize Showcase -->
				<div class="fm-card">
					<h2><?php esc_html_e( 'Week Prize Showcase', 'fm-festive-draw' ); ?></h2>
					<pre style="background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;white-space:pre-wrap;font-family:inherit;font-size:14px;color:#334155;"><?php echo esc_html( $week_config['prizes'] ?? __( 'No prizes configured.', 'fm-festive-draw' ) ); ?></pre>
				</div>
			</div>

			<!-- Winners Announcement Board -->
			<?php if ( $has_drawn ) :
				$winners = $history['winners'] ?? [];
			?>
				<div class="fm-card" style="margin-top:25px;">
					<h2>
						<span class="dashicons dashicons-trophy" style="color:#d97706;font-size:24px;vertical-align:middle;"></span>
						<?php printf( esc_html__( 'Recorded Draw Results for Week %d', 'fm-festive-draw' ), $selected_week ); ?>
					</h2>
					<p class="description">
						<?php printf( esc_html__( 'Conducted on %s by Admin User #%d across a pool of %d entries.', 'fm-festive-draw' ), esc_html( wp_date( 'Y-m-d H:i:s', strtotime( $history['drawn_at'] ?? '' ) ) ), (int) ( $history['drawn_by'] ?? 1 ), (int) ( $history['pool_size'] ?? 0 ) ); ?>
					</p>

					<table class="wp-list-table widefat fixed striped">
						<thead>
							<tr>
								<th>#</th>
								<th><?php esc_html_e( 'Winning Coupon Code', 'fm-festive-draw' ); ?></th>
								<th><?php esc_html_e( 'Winner Full Name', 'fm-festive-draw' ); ?></th>
								<th><?php esc_html_e( 'Mobile Number', 'fm-festive-draw' ); ?></th>
								<th><?php esc_html_e( 'Activated On', 'fm-festive-draw' ); ?></th>
								<th><?php esc_html_e( 'Claim Action', 'fm-festive-draw' ); ?></th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $winners as $idx => $win ) :
								$cid = (int) $win['id'];
								global $wpdb;
								$table = $this->db->get_coupons_table();
								// phpcs:ignore WordPress.DB.DirectDatabaseQuery
								$current_st = $wpdb->get_var( $wpdb->prepare( "SELECT status FROM {$table} WHERE id = %d", $cid ) );
								$is_claimed = ( 'claimed' === $current_st );
							?>
								<tr>
									<td><strong><?php echo $idx + 1; ?></strong></td>
									<td><strong class="fm-code-badge"><?php echo esc_html( $win['coupon_code'] ); ?></strong></td>
									<td><?php echo esc_html( $win['participant_name'] ); ?></td>
									<td><code><?php echo esc_html( $win['participant_phone'] ); ?></code></td>
									<td><?php echo esc_html( wp_date( 'M j, Y g:i A', strtotime( $win['activated_at'] ) ) ); ?></td>
									<td>
										<?php if ( $is_claimed ) : ?>
											<span class="fm-badge fm-badge-purple"><?php esc_html_e( '✓ Claimed', 'fm-festive-draw' ); ?></span>
										<?php else :
											$claim_url = wp_nonce_url(
												admin_url( 'admin-post.php?action=fm_mark_claimed&coupon_id=' . $cid ),
												'fm_mark_claimed_' . $cid
											);
										?>
											<a href="<?php echo esc_url( $claim_url ); ?>" class="button button-small button-primary" onclick="return confirm( <?php echo wp_json_encode( __( 'Confirm winner presented coupon & ID to mark as claimed?', 'fm-festive-draw' ) ); ?> );">
												<?php esc_html_e( 'Mark as Claimed', 'fm-festive-draw' ); ?>
											</a>
										<?php endif; ?>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				</div>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Renders Scan Audit Trail screen.
	 */
	public function render_scan_log_page(): void {
		$table = new FM_Scan_Log_List_Table( $this->db );
		$table->prepare_items();
		?>
		<div class="wrap fm-admin-wrap">
			<h1><?php esc_html_e( 'Verification Scan Audit Log', 'fm-festive-draw' ); ?></h1>
			<p class="description"><?php esc_html_e( 'Immutable audit log of all customer QR scan attempts, rate limiting events, and activations.', 'fm-festive-draw' ); ?></p>

			<form id="fm-scan-log-form" method="get">
				<input type="hidden" name="page" value="fm-scan-log" />
				<?php $table->display(); ?>
			</form>
		</div>
		<?php
	}

	/**
	 * Renders Campaign Week Settings page.
	 */
	public function render_settings_page(): void {
		$weeks = fm_get_week_config();
		$delete_on_uninstall = (bool) get_option( 'fm_delete_data_on_uninstall', false );
		?>
		<div class="wrap fm-admin-wrap">
			<h1><?php esc_html_e( 'Campaign Week Windows & Prize Configuration', 'fm-festive-draw' ); ?></h1>
			<p class="description">
				<?php printf( esc_html__( 'All campaign window dates are evaluated strictly in the Nepal local timezone: %s (UTC+5:45).', 'fm-festive-draw' ), esc_html( wp_timezone_string() ) ); ?>
			</p>

			<?php if ( isset( $_GET['dates_synced'] ) ) : ?>
				<div class="notice notice-success is-dismissible" style="padding:12px;font-size:14px;">
					<strong><?php esc_html_e( '✓ Campaign Dates Synchronized:', 'fm-festive-draw' ); ?></strong>
					<?php esc_html_e( 'Weeks 1–4 have been updated to start from today. Scanning coupons will now register without date expiration errors.', 'fm-festive-draw' ); ?>
				</div>
			<?php endif; ?>

			<!-- Quick Sync Helper Bar -->
			<div class="fm-card" style="margin-top:15px;background:#f0fdf4;border-left:4px solid #16a34a;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:15px;">
				<div>
					<strong style="color:#166534;font-size:15px;"><?php esc_html_e( '⚡ Quick Campaign Date Sync', 'fm-festive-draw' ); ?></strong>
					<p style="margin:4px 0 0;font-size:13px;color:#15803d;">
						<?php esc_html_e( 'Automatically adjust all 4 campaign week dates to start from today so coupon scans are recognized immediately.', 'fm-festive-draw' ); ?>
					</p>
				</div>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<input type="hidden" name="action" value="fm_sync_dates">
					<?php wp_nonce_field( 'fm_sync_dates_nonce' ); ?>
					<button type="submit" class="button button-secondary" style="font-weight:600;">
						<span class="dashicons dashicons-update" style="vertical-align:middle;"></span>
						<?php esc_html_e( 'Sync Weeks 1–4 to Current Month', 'fm-festive-draw' ); ?>
					</button>
				</form>
			</div>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="fm_save_settings">
				<?php wp_nonce_field( 'fm_settings_nonce' ); ?>

				<?php for ( $w = 1; $w <= 4; $w++ ) :
					$w_data = $weeks[ $w ] ?? [];
				?>
					<div class="fm-card" style="margin-top:20px;">
						<h2 style="margin-top:0;border-bottom:1px solid #e2e8f0;padding-bottom:10px;">
							<?php printf( esc_html__( 'Campaign Window: Week %d', 'fm-festive-draw' ), $w ); ?>
						</h2>

						<table class="form-table">
							<tr>
								<th scope="row"><label for="week_title_<?php echo $w; ?>"><?php esc_html_e( 'Week Title / Theme', 'fm-festive-draw' ); ?></label></th>
								<td>
									<input type="text" name="weeks[<?php echo $w; ?>][title]" id="week_title_<?php echo $w; ?>" value="<?php echo esc_attr( $w_data['title'] ?? '' ); ?>" class="regular-text" required>
								</td>
							</tr>
							<tr>
								<th scope="row"><label for="week_start_<?php echo $w; ?>"><?php esc_html_e( 'Start Date & Time', 'fm-festive-draw' ); ?></label></th>
								<td>
									<input type="text" name="weeks[<?php echo $w; ?>][start_datetime]" id="week_start_<?php echo $w; ?>" value="<?php echo esc_attr( $w_data['start_datetime'] ?? '' ); ?>" class="regular-text" placeholder="YYYY-MM-DD HH:MM:SS" required>
									<p class="description"><?php esc_html_e( 'Format: YYYY-MM-DD HH:MM:SS (Nepal Time)', 'fm-festive-draw' ); ?></p>
								</td>
							</tr>
							<tr>
								<th scope="row"><label for="week_end_<?php echo $w; ?>"><?php esc_html_e( 'End Date & Time', 'fm-festive-draw' ); ?></label></th>
								<td>
									<input type="text" name="weeks[<?php echo $w; ?>][end_datetime]" id="week_end_<?php echo $w; ?>" value="<?php echo esc_attr( $w_data['end_datetime'] ?? '' ); ?>" class="regular-text" placeholder="YYYY-MM-DD HH:MM:SS" required>
									<p class="description"><?php esc_html_e( 'Format: YYYY-MM-DD HH:MM:SS (Nepal Time)', 'fm-festive-draw' ); ?></p>
								</td>
							</tr>
							<tr>
								<th scope="row"><label for="week_winners_<?php echo $w; ?>"><?php esc_html_e( 'Winner Count', 'fm-festive-draw' ); ?></label></th>
								<td>
									<input type="number" name="weeks[<?php echo $w; ?>][winner_count]" id="week_winners_<?php echo $w; ?>" value="<?php echo (int) ( $w_data['winner_count'] ?? 5 ); ?>" min="1" max="100" class="small-text" required>
									<p class="description"><?php esc_html_e( 'Default winners drawn for this week.', 'fm-festive-draw' ); ?></p>
								</td>
							</tr>
							<tr>
								<th scope="row"><label for="week_prizes_<?php echo $w; ?>"><?php esc_html_e( 'Prize List (One per line)', 'fm-festive-draw' ); ?></label></th>
								<td>
									<textarea name="weeks[<?php echo $w; ?>][prizes]" id="week_prizes_<?php echo $w; ?>" rows="5" class="large-text code"><?php echo esc_textarea( $w_data['prizes'] ?? '' ); ?></textarea>
								</td>
							</tr>
						</table>
					</div>
				<?php endfor; ?>

				<!-- Uninstallation Safety Box -->
				<div class="fm-card" style="margin-top:20px;border-left:4px solid #ef4444;">
					<h2 style="margin-top:0;color:#991b1b;"><?php esc_html_e( 'Data Preservation & Uninstall Safety', 'fm-festive-draw' ); ?></h2>
					<p><?php esc_html_e( 'By default, WordPress plugin deactivation and deletion will NEVER delete your coupon database or scan logs.', 'fm-festive-draw' ); ?></p>
					<label style="color:#b91c1c;font-weight:600;">
						<input type="checkbox" name="delete_data_on_uninstall" value="1" <?php checked( $delete_on_uninstall ); ?>>
						<?php esc_html_e( 'Delete all campaign database tables and options upon plugin uninstall (DANGER: Cannot be undone!)', 'fm-festive-draw' ); ?>
					</label>
				</div>

				<p class="submit">
					<button type="submit" class="button button-primary button-large"><?php esc_html_e( 'Save All Campaign Settings', 'fm-festive-draw' ); ?></button>
				</p>
			</form>
		</div>
		<?php
	}

	/**
	 * Handles saving settings form.
	 */
	public function handle_save_settings(): void {
		check_admin_referer( 'fm_settings_nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized.', 'fm-festive-draw' ) );
		}

		$raw_weeks = $_POST['weeks'] ?? [];
		$clean_weeks = [];

		for ( $w = 1; $w <= 4; $w++ ) {
			if ( isset( $raw_weeks[ $w ] ) ) {
				$clean_weeks[ $w ] = [
					'title'          => sanitize_text_field( $raw_weeks[ $w ]['title'] ?? '' ),
					'start_datetime' => sanitize_text_field( $raw_weeks[ $w ]['start_datetime'] ?? '' ),
					'end_datetime'   => sanitize_text_field( $raw_weeks[ $w ]['end_datetime'] ?? '' ),
					'winner_count'   => max( 1, absint( $raw_weeks[ $w ]['winner_count'] ?? 5 ) ),
					'prizes'         => sanitize_textarea_field( $raw_weeks[ $w ]['prizes'] ?? '' ),
				];
			}
		}

		update_option( 'fm_campaign_weeks', $clean_weeks );

		$delete_on_uninstall = ! empty( $_POST['delete_data_on_uninstall'] );
		update_option( 'fm_delete_data_on_uninstall', $delete_on_uninstall );

		// Flush rewrite rules gently so /verify/ and /verify/{token} take effect.
		flush_rewrite_rules( false );

		wp_safe_redirect( add_query_arg( [ 'page' => 'fm-draw-settings', 'updated' => '1' ], admin_url( 'admin.php' ) ) );
		exit;
	}

	/**
	 * Handles CSV Export of activated entries.
	 */
	public function handle_csv_export(): void {
		check_admin_referer( 'fm_export_coupons_nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized access.', 'fm-festive-draw' ) );
		}

		$week_param = sanitize_text_field( $_POST['export_week'] ?? 'all' );
		global $wpdb;
		$table = $this->db->get_coupons_table();

		$where = "status IN ('activated', 'won', 'claimed')";
		$params = [];

		if ( 'all' !== $week_param && in_array( (int) $week_param, [ 1, 2, 3, 4 ], true ) ) {
			$where   .= ' AND week_number = %d';
			$params[] = (int) $week_param;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$query = ! empty( $params )
			? $wpdb->prepare( "SELECT coupon_code, participant_name, participant_phone, week_number, status, activated_at FROM {$table} WHERE {$where} ORDER BY week_number ASC, activated_at ASC", ...$params ) // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			: "SELECT coupon_code, participant_name, participant_phone, week_number, status, activated_at FROM {$table} WHERE {$where} ORDER BY week_number ASC, activated_at ASC"; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$results = $wpdb->get_results( $query, ARRAY_A );

		$filename = sprintf( 'fm-festive-draw-entries-%s-%s.csv', $week_param, wp_date( 'Y-m-d-His' ) );

		header( 'Content-Type: text/csv; charset=UTF-8' );
		header( 'Content-Disposition: attachment; filename="' . $filename . '"' );
		header( 'Pragma: no-cache' );
		header( 'Expires: 0' );

		$output = fopen( 'php://output', 'w' );
		// Output UTF-8 BOM for Excel compatibility.
		fputs( $output, "\xEF\xBB\xBF" );

		// Header.
		fputcsv( $output, [ 'Coupon Code', 'Participant Name', 'Phone Number', 'Week Number', 'Status', 'Activated At' ] );

		if ( ! empty( $results ) ) {
			foreach ( $results as $row ) {
				fputcsv(
					$output,
					[
						$row['coupon_code'],
						$row['participant_name'],
						$row['participant_phone'],
						$row['week_number'],
						$row['status'],
						$row['activated_at'],
					]
				);
			}
		}

		fclose( $output );
		exit;
	}

	/**
	 * Handles complete database reset action.
	 */
	public function handle_reset_database(): void {
		check_admin_referer( 'fm_reset_database_nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized access.', 'fm-festive-draw' ) );
		}

		$result = $this->db->reset_all_data();

		wp_safe_redirect(
			add_query_arg(
				[
					'page'             => 'fm-csv-import',
					'reset_done'       => '1',
					'coupons_deleted'  => $result['coupons_deleted'],
				],
				admin_url( 'admin.php' )
			)
		);
		exit;
	}

	/**
	 * Handles campaign date synchronization to current month.
	 */
	public function handle_sync_dates(): void {
		check_admin_referer( 'fm_sync_dates_nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized access.', 'fm-festive-draw' ) );
		}

		$this->db->sync_campaign_weeks_to_now();
		flush_rewrite_rules( false );

		wp_safe_redirect(
			add_query_arg(
				[
					'page'         => 'fm-draw-settings',
					'dates_synced' => '1',
				],
				admin_url( 'admin.php' )
			)
		);
		exit;
	}
}
