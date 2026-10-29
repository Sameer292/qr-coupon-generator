/**
 * Fresh Masala claim page interactions.
 */
document.addEventListener('DOMContentLoaded', () => {
	document.querySelectorAll('[data-fm-print]').forEach((button) => {
		button.addEventListener('click', () => {
			window.print();
		});
	});
});
