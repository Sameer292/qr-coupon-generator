<?php
/**
 * Claims list table with filters and bulk payout.
 *
 * @package FM_Cash_Claims
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'WP_List_Table' ) ) {
	require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
}

final class FM_Cash_Claims_List_Table extends WP_List_Table {

	private FM_Cash_Claims_DB $db;
	private array $summary = array();

	public function __construct( FM_Cash_Claims_DB $db ) {
		$this->db = $db;

		parent::__construct(
			array(
				'singular' => 'claim',
				'plural'   => 'claims',
				'ajax'     => false,
			)
		);
	}

	public function get_columns(): array {
		return array(
			'cb'            => '<input type="checkbox" />',
			'claim_ref'     => __( 'Claim reference', 'fm-cash-claims' ),
			'coupon_code'   => __( 'Coupon', 'fm-cash-claims' ),
			'prize_amount'  => __( 'Prize', 'fm-cash-claims' ),
			'claimant'      => __( 'Claimant', 'fm-cash-claims' ),
			'phone'         => __( 'Phone', 'fm-cash-claims' ),
			'pan'           => __( 'PAN', 'fm-cash-claims' ),
			'status'        => __( 'Status', 'fm-cash-claims' ),
			'claimed_at'    => __( 'Submitted', 'fm-cash-claims' ),
			'actions'       => __( 'Actions', 'fm-cash-claims' ),
		);
	}

	protected function get_sortable_columns(): array {
		return array(
			'claim_ref'    => array( 'claim_ref', false ),
			'coupon_code'  => array( 'coupon_code', false ),
			'prize_amount' => array( 'prize_amount', false ),
			'status'       => array( 'status', false ),
			'claimed_at'   => array( 'claimed_at', true ),
		);
	}

	protected function get_bulk_actions(): array {
		return array(
			'mark_paid' => __( 'Mark selected as paid', 'fm-cash-claims' ),
		);
	}

	public function process_bulk_action(): void {
		if ( 'mark_paid' !== $this->current_action() ) {
			return;
		}

		check_admin_referer( 'bulk-' . $this->_args['plural'] );

		$claim_ids = isset( $_REQUEST['claim'] ) && is_array( $_REQUEST['claim'] )
			? array_map( 'sanitize_text_field', wp_unslash( $_REQUEST['claim'] ) )
			: ( isset( $_REQUEST['claim'] ) && is_scalar( $_REQUEST['claim'] )
				? array( sanitize_text_field( wp_unslash( (string) $_REQUEST['claim'] ) ) )
				: array() );
		$claim_ids = array_values( array_filter( array_map( 'absint', $claim_ids ) ) );

		if ( array() === $claim_ids ) {
			$this->store_notice( 'warning', __( 'No claims were selected.', 'fm-cash-claims' ) );
			$this->redirect_clean();
		}

		$paid   = 0;
		$failed = 0;
		$ip     = $this->db->get_client_ip();

		foreach ( $claim_ids as $claim_id ) {
			$claim  = $this->db->get_claim( $claim_id );
			$result = $this->db->mark_claim_paid(
				$claim_id,
				get_current_user_id(),
				__( 'Bulk payout from claims list', 'fm-cash-claims' )
			);

			if ( true === $result ) {
				$paid++;
				if ( $claim ) {
					$this->db->log_scan( '', (int) $claim->coupon_id, 'admin_bulk_paid', $ip, 'wp-admin' );
				}
			} else {
				$failed++;
				if ( $claim ) {
					$this->db->log_scan( '', (int) $claim->coupon_id, 'admin_bulk_failed', $ip, 'wp-admin' );
				}
			}
		}

		$message = sprintf(
			/* translators: 1: paid count, 2: failed count */
			__( 'Marked %1$d claims as paid. %2$d claims could not be updated.', 'fm-cash-claims' ),
			$paid,
			$failed
		);

		$this->store_notice( $failed > 0 ? 'warning' : 'success', $message );
		$this->redirect_clean();
	}

	public function prepare_items(): void {
		global $wpdb;

		$table  = $this->db->claims_table();
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

		$where_sql = implode( ' AND ', $where );

		$allowed_orderby = array( 'claim_ref', 'coupon_code', 'prize_amount', 'status', 'claimed_at' );
		$orderby         = isset( $_GET['orderby'] ) && is_string( $_GET['orderby'] )
			? sanitize_key( wp_unslash( $_GET['orderby'] ) )
			: 'claimed_at';
		if ( ! in_array( $orderby, $allowed_orderby, true ) ) {
			$orderby = 'claimed_at';
		}

		$order = isset( $_GET['order'] ) && is_string( $_GET['order'] ) && 'asc' === strtolower( sanitize_key( wp_unslash( $_GET['order'] ) ) ) ? 'ASC' : 'DESC';

		$count_sql = "SELECT COUNT(*) FROM {$table} WHERE {$where_sql}";
		$total     = (int) $wpdb->get_var( $params ? $wpdb->prepare( $count_sql, $params ) : $count_sql );

		$summary_sql = "SELECT status, COUNT(*) AS claim_count, COALESCE(SUM(prize_amount),0) AS claim_total FROM {$table} WHERE {$where_sql} GROUP BY status";
		$summary_rows = $wpdb->get_results( $params ? $wpdb->prepare( $summary_sql, $params ) : $summary_sql );

		$this->summary = array();
		foreach ( (array) $summary_rows as $summary_row ) {
			$this->summary[ (string) $summary_row->status ] = array(
				'count' => (int) $summary_row->claim_count,
				'total' => (float) $summary_row->claim_total,
			);
		}

		$per_page = 30;
		$paged    = isset( $_GET['paged'] ) && is_scalar( $_GET['paged'] ) ? max( 1, (int) $_GET['paged'] ) : 1;
		$offset   = ( $paged - 1 ) * $per_page;

		$query_params = $params;
		$query_params[] = $per_page;
		$query_params[] = $offset;

		$sql = "SELECT * FROM {$table} WHERE {$where_sql} ORDER BY {$orderby} {$order} LIMIT %d OFFSET %d";
		$this->items = $wpdb->get_results( $wpdb->prepare( $sql, $query_params ) );

		$this->set_pagination_args(
			array(
				'total_items' => $total,
				'per_page'    => $per_page,
				'total_pages' => (int) ceil( $total / $per_page ),
			)
		);

		$this->_column_headers = array( $this->get_columns(), array(), $this->get_sortable_columns(), 'claim_ref' );
	}

	public function get_summary(): array {
		return $this->summary;
	}

	public function get_batch_options(): array {
		global $wpdb;

		return $wpdb->get_results(
			"SELECT batch_id, label FROM {$this->db->batches_table()} ORDER BY created_at DESC"
		) ?: array();
	}

	protected function column_cb( $item ): string {
		return sprintf(
			'<input type="checkbox" name="claim[]" value="%d" />',
			(int) $item->id
		);
	}

	protected function column_claim_ref( $item ): string {
		$url = FM_Cash_Claims_Util::admin_claim_url( (int) $item->id );

		return sprintf(
			'<strong><a href="%s">%s</a></strong>',
			esc_url( $url ),
			esc_html( (string) $item->claim_ref )
		);
	}

	protected function column_coupon_code( $item ): string {
		return '<code>' . esc_html( (string) $item->coupon_code ) . '</code>';
	}

	protected function column_prize_amount( $item ): string {
		return '<strong>' . esc_html( FM_Cash_Claims_Util::format_amount( (float) $item->prize_amount, (string) $item->currency ) ) . '</strong>';
	}

	protected function column_claimant( $item ): string {
		return esc_html( (string) $item->claimant_name );
	}

	protected function column_phone( $item ): string {
		return esc_html( FM_Cash_Claims_Util::mask_phone( (string) $item->claimant_phone ) );
	}

	protected function column_pan( $item ): string {
		return esc_html( FM_Cash_Claims_Util::mask_pan( (string) $item->claimant_pan ) );
	}

	protected function column_status( $item ): string {
		return sprintf(
			'<span class="%s">%s</span>',
			esc_attr( FM_Cash_Claims_Util::status_class( (string) $item->status ) ),
			esc_html( FM_Cash_Claims_Util::status_label( (string) $item->status ) )
		);
	}

	protected function column_claimed_at( $item ): string {
		return esc_html( get_date_from_gmt( (string) $item->claimed_at, 'M j, Y g:i A' ) );
	}

	protected function column_actions( $item ): string {
		$view_url = FM_Cash_Claims_Util::admin_claim_url( (int) $item->id );
		$actions  = array(
			'view' => sprintf(
				'<a href="%s">%s</a>',
				esc_url( $view_url ),
				esc_html__( 'View', 'fm-cash-claims' )
			),
		);

		if ( 'pending' === (string) $item->status ) {
			$actions['pay'] = sprintf(
				'<a href="%s#fm-pay">%s</a>',
				esc_url( $view_url ),
				esc_html__( 'Mark paid', 'fm-cash-claims' )
			);
		}

		return $this->row_actions( $actions );
	}

	protected function extra_tablenav( $which ): void {
		if ( 'top' !== $which ) {
			return;
		}

		$status     = isset( $_GET['status'] ) && is_string( $_GET['status'] ) ? sanitize_key( wp_unslash( $_GET['status'] ) ) : '';
		$batch      = isset( $_GET['batch'] ) && is_string( $_GET['batch'] ) ? sanitize_text_field( wp_unslash( $_GET['batch'] ) ) : '';
		$claim_date = isset( $_GET['claim_date'] ) && is_string( $_GET['claim_date'] ) ? sanitize_text_field( wp_unslash( $_GET['claim_date'] ) ) : '';
		$search     = isset( $_GET['s'] ) && is_string( $_GET['s'] ) ? sanitize_text_field( wp_unslash( $_GET['s'] ) ) : '';
		?>
		<div class="alignleft actions fm-filter-row">
			<input type="hidden" name="page" value="fm-cash-claims-claims" />
			<label class="screen-reader-text" for="fm-filter-status"><?php esc_html_e( 'Filter by status', 'fm-cash-claims' ); ?></label>
			<select name="status" id="fm-filter-status">
				<option value=""><?php esc_html_e( 'All statuses', 'fm-cash-claims' ); ?></option>
				<option value="pending" <?php selected( $status, 'pending' ); ?>><?php esc_html_e( 'Pending payout', 'fm-cash-claims' ); ?></option>
				<option value="paid" <?php selected( $status, 'paid' ); ?>><?php esc_html_e( 'Paid', 'fm-cash-claims' ); ?></option>
				<option value="rejected" <?php selected( $status, 'rejected' ); ?>><?php esc_html_e( 'Rejected', 'fm-cash-claims' ); ?></option>
			</select>

			<label class="screen-reader-text" for="fm-filter-batch"><?php esc_html_e( 'Filter by batch', 'fm-cash-claims' ); ?></label>
			<select name="batch" id="fm-filter-batch">
				<option value=""><?php esc_html_e( 'All batches', 'fm-cash-claims' ); ?></option>
				<?php foreach ( $this->get_batch_options() as $batch_option ) : ?>
					<option value="<?php echo esc_attr( (string) $batch_option->batch_id ); ?>" <?php selected( $batch, (string) $batch_option->batch_id ); ?>>
						<?php echo esc_html( (string) $batch_option->batch_id ); ?>
					</option>
				<?php endforeach; ?>
			</select>

			<label class="screen-reader-text" for="fm-filter-date"><?php esc_html_e( 'Filter by claim date', 'fm-cash-claims' ); ?></label>
			<input type="date" name="claim_date" id="fm-filter-date" value="<?php echo esc_attr( $claim_date ); ?>" />

			<label class="screen-reader-text" for="fm-filter-search"><?php esc_html_e( 'Search claims', 'fm-cash-claims' ); ?></label>
			<input type="search" name="s" id="fm-filter-search" value="<?php echo esc_attr( $search ); ?>" placeholder="<?php esc_attr_e( 'Reference, code, name, phone', 'fm-cash-claims' ); ?>" />

			<?php submit_button( __( 'Filter', 'fm-cash-claims' ), 'secondary', 'filter_action', false ); ?>
			<a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=fm-cash-claims-claims' ) ); ?>"><?php esc_html_e( 'Reset', 'fm-cash-claims' ); ?></a>
		</div>
		<?php
	}

	public function no_items(): void {
		esc_html_e( 'No claims match this filter.', 'fm-cash-claims' );
	}

	private function store_notice( string $type, string $message ): void {
		set_transient(
			'fm_cash_notice_' . get_current_user_id(),
			array(
				'type'    => $type,
				'message' => $message,
				'errors'  => array(),
			),
			2 * MINUTE_IN_SECONDS
		);
	}

	private function redirect_clean(): void {
		$allowed_keys = array( 'status', 'batch', 'claim_date', 's', 'orderby', 'order', 'paged' );
		$args         = array( 'page' => 'fm-cash-claims-claims' );
		foreach ( $allowed_keys as $key ) {
			if ( isset( $_GET[ $key ] ) && is_scalar( $_GET[ $key ] ) && '' !== (string) $_GET[ $key ] ) {
				$args[ $key ] = sanitize_text_field( wp_unslash( (string) $_GET[ $key ] ) );
			}
		}

		wp_safe_redirect( add_query_arg( $args, admin_url( 'admin.php' ) ) );
		exit;
	}
}
