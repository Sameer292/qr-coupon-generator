/**
 * FM Cash Claims admin interactions.
 */
document.addEventListener('DOMContentLoaded', () => {
	document.addEventListener('click', (event) => {
		const target = event.target.closest('[data-fm-confirm]');
		if (!target) {
			return;
		}

		const message = target.getAttribute('data-fm-confirm');
		if (message && !window.confirm(message)) {
			event.preventDefault();
			event.stopPropagation();
		}
	});

	document.querySelectorAll('[data-fm-print]').forEach((button) => {
		button.addEventListener('click', () => {
			window.print();
		});
	});
});
