/**
 * Smooth scroll (Lenis) synced with GSAP ScrollTrigger.
 */
export function setupScroll() {
	const { gsap, ScrollTrigger, Lenis } = window;
	if (!Lenis) {
		return { stop() {}, start() {}, scrollTo: (t) => document.querySelector(t)?.scrollIntoView(), on() {} };
	}
	// lerp 0.06: with a notched mouse wheel, each notch blends into the next instead of
	// surging then crawling (0.09 dropped to ~12% speed between notches; 0.06 keeps ~24%).
	const lenis = new Lenis({ lerp: 0.06, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
	lenis.on('scroll', ScrollTrigger.update);
	gsap.ticker.add((time) => lenis.raf(time * 1000));
	gsap.ticker.lagSmoothing(0);
	window.__lenis = lenis;

	document.addEventListener('click', (e) => {
		const a = e.target.closest('a[href^="#"]');
		if (!a) return;
		const id = a.getAttribute('href');
		const target = id.length > 1 ? document.querySelector(id) : null;
		if (!target && id !== '#top') return;
		e.preventDefault();
		lenis.scrollTo(target || 0, { duration: 1.6 });
	});
	return lenis;
}
