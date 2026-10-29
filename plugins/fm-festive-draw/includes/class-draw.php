<?php
/**
 * Prize Draw Engine & Weekly Winner Selector.
 *
 * @package FM_Festive_Draw
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles weekly prize draws, cryptographically secure winner selection, result audits, and prize claims.
 */
class FM_Draw {

	/**
	 * Database instance.
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

		add_action( 'admin_post_fm_execute_draw', [ $this, 'handle_execute_draw' ] );
		add_action( 'admin_post_fm_mark_claimed', [ $this, 'handle_mark_claimed' ] );
	}

	/**
	 * Get count of eligible activated coupons for a week.
	 *
	 * @param int $week_number Week 1-4.
	 * @return int
	 */
	public function get_eligible_count( int $week_number ): int {
		global $wpdb;
		$table = $this->db->get_coupons_table();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$table} WHERE week_number = %d AND status = 'activated'", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$week_number
			)
		);
	}

	/**
	 * Get draw history for a week or all weeks.
	 *
	 * @param int|null $week_number Week 1-4 or null.
	 * @return array
	 */
	public function get_draw_history( ?int $week_number = null ): array {
		$history = get_option( 'fm_draw_results', [] );
		if ( ! is_array( $history ) ) {
			$history = [];
		}

		if ( null !== $week_number ) {
			return $history[ $week_number ] ?? [];
		}

		return $history;
	}

	/**
	 * Execute the prize draw using cryptographically secure random_int().
	 *
	 * @param int  $week_number   Campaign week (1-4).
	 * @param int  $winner_count  Target number of winners.
	 * @param bool $allow_rerun   Whether to overwrite existing draw for the week.
	 * @return array{success: bool, message: string, winners?: array}
	 */
	public function execute_draw( int $week_number, int $winner_count, bool $allow_rerun = false ): array {
		global $wpdb;
		$table = $this->db->get_coupons_table();

		// Check if draw has already been performed for this week.
		$history = $this->get_draw_history( $week_number );
		if ( ! empty( $history ) && ! $allow_rerun ) {
			return [
				'success' => false,
				'message' => sprintf(
					__( 'A draw for Week %d has already been conducted on %s. Check the confirmation box to re-run and discard previous results.', 'fm-festive-draw' ),
					$week_number,
					esc_html( wp_date( 'Y-m-d H:i', strtotime( $history['drawn_at'] ?? '' ) ) )
				),
			];
		}

		// If re-running, revert previous 'won' entries back to 'activated'.
		if ( ! empty( $history ) && $allow_rerun ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$wpdb->query(
				$wpdb->prepare(
					"UPDATE {$table} SET status = 'activated' WHERE week_number = %d AND status = 'won'", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$week_number
				)
			);
		}

		// Fetch all eligible pool IDs and participant info.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$pool = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, coupon_code, participant_name, participant_phone, activated_at FROM {$table} WHERE week_number = %d AND status = 'activated'", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$week_number
			),
			ARRAY_A
		);

		if ( empty( $pool ) ) {
			return [
				'success' => false,
				'message' => sprintf( __( 'No activated entries found for Week %d. Cannot conduct draw.', 'fm-festive-draw' ), $week_number ),
			];
		}

		$pool_size = count( $pool );
		$num_winners = min( $winner_count, $pool_size );

		if ( $num_winners < 1 ) {
			return [
				'success' => false,
				'message' => __( 'Winner count must be at least 1.', 'fm-festive-draw' ),
			];
		}

		// Cryptographically secure selection without replacement using random_int().
		$available_indices = array_keys( $pool );
		$selected_indices  = [];

		for ( $i = 0; $i < $num_winners; $i++ ) {
			$remaining_count = count( $available_indices );
			if ( 0 === $remaining_count ) {
				break;
			}

			// Generate random index securely.
			$rand_pointer = random_int( 0, $remaining_count - 1 );
			$chosen_pool_index = $available_indices[ $rand_pointer ];

			$selected_indices[] = $chosen_pool_index;

			// Remove without replacement.
			array_splice( $available_indices, $rand_pointer, 1 );
		}

		$winners = [];
		$winner_ids = [];

		foreach ( $selected_indices as $idx ) {
			$winner_row = $pool[ $idx ];
			$winners[]   = [
				'id'                => (int) $winner_row['id'],
				'coupon_code'       => $winner_row['coupon_code'],
				'participant_name'  => $winner_row['participant_name'],
				'participant_phone' => $winner_row['participant_phone'],
				'activated_at'      => $winner_row['activated_at'],
			];
			$winner_ids[] = (int) $winner_row['id'];
		}

		// Update database status of winners to 'won'.
		if ( ! empty( $winner_ids ) ) {
			$id_placeholders = implode( ',', array_fill( 0, count( $winner_ids ), '%d' ) );
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$wpdb->query(
				$wpdb->prepare(
					"UPDATE {$table} SET status = 'won' WHERE id IN ({$id_placeholders})", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					...$winner_ids
				)
			);
		}

		// Persist audit record in options.
		$all_history = get_option( 'fm_draw_results', [] );
		if ( ! is_array( $all_history ) ) {
			$all_history = [];
		}

		$draw_record = [
			'week_number'  => $week_number,
			'drawn_at'     => current_time( 'mysql' ),
			'drawn_by'     => get_current_user_id(),
			'pool_size'    => $pool_size,
			'winner_count' => count( $winners ),
			'winners'      => $winners,
		];

		$all_history[ $week_number ] = $draw_record;
		update_option( 'fm_draw_results', $all_history );

		return [
			'success' => true,
			'message' => sprintf( __( 'Draw completed successfully! %d winners selected for Week %d.', 'fm-festive-draw' ), count( $winners ), $week_number ),
			'winners' => $winners,
		];
	}

	/**
	 * Admin action handler to execute draw.
	 */
	public function handle_execute_draw(): void {
		check_admin_referer( 'fm_run_draw_nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized access.', 'fm-festive-draw' ) );
		}

		$week_number  = isset( $_POST['week_number'] ) ? absint( $_POST['week_number'] ) : 1;
		$winner_count = isset( $_POST['winner_count'] ) ? absint( $_POST['winner_count'] ) : 5;
		$allow_rerun  = ! empty( $_POST['allow_rerun'] );

		$result = $this->execute_draw( $week_number, $winner_count, $allow_rerun );

		$redirect_url = add_query_arg(
			[
				'page'         => 'fm-draw-tool',
				'week'         => $week_number,
				'draw_status'  => $result['success'] ? 'success' : 'error',
				'draw_message' => rawurlencode( $result['message'] ),
			],
			admin_url( 'admin.php' )
		);

		wp_safe_redirect( $redirect_url );
		exit;
	}

	/**
	 * Admin action handler to mark a winning coupon as claimed.
	 */
	public function handle_mark_claimed(): void {
		$coupon_id = isset( $_GET['coupon_id'] ) ? absint( $_GET['coupon_id'] ) : 0;
		check_admin_referer( 'fm_mark_claimed_' . $coupon_id );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized access.', 'fm-festive-draw' ) );
		}

		global $wpdb;
		$table = $this->db->get_coupons_table();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$table} SET status = 'claimed' WHERE id = %d AND status = 'won'", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$coupon_id
			)
		);

		$redirect = wp_get_referer() ?: admin_url( 'admin.php?page=fm-draw-tool' );
		wp_safe_redirect( $redirect );
		exit;
	}
}
