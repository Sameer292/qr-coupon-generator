/**
 * Fresh Masala Festive Draw - Mobile Client Verification Script
 */
document.addEventListener('DOMContentLoaded', function() {
	var form = document.getElementById('fm-activation-form');
	var phoneInput = document.getElementById('participant_phone');
	var submitBtn = document.getElementById('fm-submit-btn');

	if (phoneInput) {
		phoneInput.addEventListener('input', function(e) {
			var val = e.target.value.replace(/[^\d+]/g, '');
			if (val.startsWith('+977')) {
				val = val.substring(4);
			} else if (val.startsWith('977') && val.length > 10) {
				val = val.substring(3);
			}
			e.target.value = val;
		});
	}

	if (form && submitBtn) {
		form.addEventListener('submit', function() {
			submitBtn.disabled = true;
			submitBtn.style.opacity = '0.7';
			var span = submitBtn.querySelector('span');
			if (span) {
				span.textContent = 'Submitting Entry...';
			}
		});
	}
});
