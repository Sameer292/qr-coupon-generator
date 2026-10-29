/**
 * Fresh Masala Festive Draw - Admin JavaScript
 */
(function($) {
	'use strict';

	$(document).ready(function() {
		// Confirm Draw Execution
		$('#fm-draw-form').on('submit', function(e) {
			var isRerun = $('input[name="allow_rerun"]').is(':checked');
			var promptText = isRerun ? (window.fmAdminConfig ? window.fmAdminConfig.strings.confirmRerun : 'Re-run draw?') : (window.fmAdminConfig ? window.fmAdminConfig.strings.confirmDraw : 'Run draw now?');
			if (!confirm(promptText)) {
				e.preventDefault();
				return false;
			}
		});

		// Visual feedback on direct import submit
		$('#fm-import-form').on('submit', function() {
			var $btn = $('#fm-start-import-btn');
			$btn.prop('disabled', true).text(window.fmAdminConfig ? window.fmAdminConfig.strings.importing : 'Processing...');
		});
	});
})(jQuery);
