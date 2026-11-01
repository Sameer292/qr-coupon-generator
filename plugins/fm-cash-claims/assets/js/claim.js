/**
 * Fresh Masala claim page interactions.
 */
document.addEventListener('DOMContentLoaded', () => {
	const form = document.querySelector('.fm-claim-form');
	const submit = form?.querySelector('[type="submit"]');
	const label = submit?.innerHTML;
	form?.addEventListener('submit', (event) => {
		if (!submit || event.defaultPrevented) return;
		if (submit.disabled) {
			event.preventDefault();
			return;
		}
		submit.disabled = true;
		submit.textContent = submit.dataset.fmSubmitting;
		form.setAttribute('aria-busy', 'true');
	});
	window.addEventListener('pageshow', () => {
		if (!submit) return;
		submit.disabled = false;
		submit.innerHTML = label;
		form?.removeAttribute('aria-busy');
	});

	const reveal = document.querySelector('[data-fm-reveal]');
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	if (reveal && !reducedMotion.matches && typeof reveal.animate === 'function') {
		reveal.classList.add('fm-reveal-playing');
		// Always uncover the saved prize, even if animation events do not arrive.
		const finish = () => reveal.classList.remove('fm-reveal-playing');
		window.setTimeout(finish, 1800);
		reducedMotion.addEventListener('change', finish, { once: true });
		reveal.addEventListener('animationend', (event) => {
			if (event.animationName !== 'fm-prize-in') return;
			finish();
			for (let i = 0; i < 18; i += 1) {
				const piece = document.createElement('i');
				piece.className = 'fm-prize-confetti';
				piece.setAttribute('aria-hidden', 'true');
				piece.style.backgroundColor = i % 2 ? '#edc47b' : '#faf3e5';
				reveal.append(piece);
				const flight = piece.animate([
					{ transform: 'translate(0, 0) rotate(0deg)', opacity: 0 },
					{ opacity: 1, offset: 0.1 },
					{ transform: `translate(${(Math.random() - 0.5) * 440}px, ${120 + Math.random() * 180}px) rotate(${(Math.random() - 0.5) * 720}deg)`, opacity: 0 },
				], { duration: 1100, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
				flight.finished.then(() => piece.remove()).catch(() => piece.remove());
			}
		});
	}

	document.querySelectorAll('[data-fm-print]').forEach((button) => {
		button.addEventListener('click', () => {
			window.print();
		});
	});
});
