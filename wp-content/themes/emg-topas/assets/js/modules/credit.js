/**
 * Footer easter eggs: on hover each line flips to a cheekier one (CSS).
 * The more you insist, the more the chef has to say.
 * (Keys match the data-credit attributes in the footer.)
 */
const LINES = {
	emedias: [
		null,
		'Big portions? Guilty as charged.',
		null,
		'True story: one regular comes in every single day he works. Legend.',
		null,
		'Still here? The garlic sauce is calling…',
		'Righto. Go read the reviews, then come hungry.',
	],
	piqo: [
		null,
		'Locally owned, family run, garlic powered.',
		null,
		'We’ve lost count of the snack packs. Sorry, not sorry.',
		null,
		'“Lazeez” means delicious. Coincidence? We think not.',
		'Enough chat. Come in and say g’day!',
	],
};

export function initCredit() {
	document.querySelectorAll('[data-credit]').forEach((link) => {
		const bubble = link.querySelector('[data-credit-bubble]');
		const lines = LINES[link.dataset.credit] || [];
		if (!bubble || !lines.length) return;
		let count = 0;
		let timer = 0;
		link.addEventListener('pointerenter', () => {
			const line = lines[count % lines.length];
			count++;
			if (!line) return;
			bubble.textContent = line;
			bubble.classList.add('is-on');
			clearTimeout(timer);
			timer = setTimeout(() => bubble.classList.remove('is-on'), 3800);
		});
	});
}
