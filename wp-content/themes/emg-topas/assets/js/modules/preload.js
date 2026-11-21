/**
 * Full load during the loader: every image on the page is downloaded and
 * decoded before the reveal, so no loading or decoding lands mid-scroll.
 * (The 3D fallback illustrations are skipped: they are only used without WebGL.)
 */
export function preloadAll(onProgress = () => {}) {
	const imgs = [...document.querySelectorAll('img')].filter((i) => !i.closest('[data-intro]') && !i.closest('.gl-fallback'));
	// Illustrations embedded in SVGs (<image>) are loaded too.
	document.querySelectorAll('svg image[href]').forEach((el) => {
		const im = new Image();
		im.src = el.getAttribute('href');
		imgs.push(im);
	});
	const total = imgs.length || 1;
	let done = 0;
	const tick = () => onProgress(++done / total);
	if (!imgs.length) {
		onProgress(1);
		return Promise.resolve();
	}
	return Promise.all(
		imgs.map((img) => {
			img.loading = 'eager';
			const loaded = img.complete && img.naturalWidth
				? Promise.resolve()
				: new Promise((r) => {
					img.addEventListener('load', r, { once: true });
					img.addEventListener('error', r, { once: true });
				});
			return loaded
				.then(() => (img.decode ? img.decode().catch(() => {}) : null))
				.then(tick);
		})
	);
}
