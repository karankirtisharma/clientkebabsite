/**
 * Lazeez — entry point.
 *
 * Order: status/hours (always) → smooth scroll → intro (while the 3D gets
 * ready) → section animations. The 3D is never dropped: if it is not ready by
 * the end of the intro, it fades in as soon as it is.
 * With reduced motion the 3D is shown but still (no scroll animations).
 */
import { initStatus } from 'emg-topas/status';
import { setupScroll } from 'emg-topas/scroll';
import { loadIntro, revealIntro } from 'emg-topas/intro';
import { initSections } from 'emg-topas/sections';
import { initCursor } from 'emg-topas/cursor';
import { preloadAll } from 'emg-topas/preload';
import { initCredit } from 'emg-topas/credit';
import { initMap } from 'emg-topas/vmap';

const root = document.documentElement;
const data = JSON.parse(document.getElementById('emg-topas-data')?.textContent || '{}');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** State shared between the GSAP animations (write) and the 3D (read). */
const state = (window.__topas = {
	reduced,
	hero: { p: 0, mx: 0, my: 0, enter: 0 },
	build: { p: 0 },
	drinks: { p: 0 },
	rain: { active: false, reset: null },
});

function webgl() {
	try {
		const c = document.createElement('canvas');
		const ctx = window.WebGL2RenderingContext && c.getContext('webgl2');
		// Release the probe context straight away (otherwise it lingers as a 2nd WebGL context).
		ctx?.getExtension('WEBGL_lose_context')?.loseContext();
		return !!ctx;
	} catch (e) {
		return false;
	}
}

/** No 3D: load the still pictures that stand in for it (never downloaded when the 3D runs). */
function showFallbacks() {
	document.querySelectorAll('.gl-fallback[data-src], .gl-fallback img[data-src]').forEach((img) => {
		if (img.dataset.srcset) img.srcset = img.dataset.srcset;
		img.src = img.dataset.src;
	});
}

/** Starts the 3D; retries once after a one-off network failure. */
function loadGL() {
	if (data.no3d || !webgl()) return Promise.resolve(null);
	const attempt = () => import('emg-topas/gl/stage').then((m) => m.createStage(state, data));
	return attempt()
		.catch(() => new Promise((r) => setTimeout(r, 1200)).then(attempt))
		.catch((e) => {
			console.error('[Lazeez] 3D unavailable:', e);
			return null;
		});
}

/** Turns the 3D on (cross-fade with the fallback illustrations). */
function showGL(gl, late = false) {
	if (!gl) return showFallbacks();
	if (root.classList.contains('has-gl')) return;
	root.classList.add('has-gl');
	if (window.gsap && !reduced) {
		window.gsap.fromTo('[data-view] canvas', { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out' });
		// Late arrival: the hero kebab makes its entrance now.
		if (late) window.gsap.fromTo(state.hero, { enter: 0 }, { enter: 1, duration: 1.8, ease: 'power2.out' });
	} else {
		state.hero.enter = 1;
	}
}

/** Waits until the browser has really painted (the loader must show first). */
const painted = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

async function boot() {
	initStatus(data);
	initCredit();

	const { gsap, ScrollTrigger, SplitText, CustomEase } = window;
	if (reduced || !gsap || !ScrollTrigger) {
		// Static: finished kebab, drinks clinking, no rain.
		root.classList.add('reduced');
		state.build.p = 0.75;
		state.drinks.p = 1;
		state.hero.enter = 1;
		initMap({ reduced: true });
		loadGL().then(showGL);
		return;
	}
	gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
	// Mobile: the address bar showing/hiding must not recalculate the pins (jumps).
	ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load' });
	CustomEase.create('topas', 'M0,0 C0.2,0.8 0.2,1 1,1');

	const lenis = setupScroll();
	lenis.stop();
	initCursor();

	// 1. Loader first: nothing heavy starts before it is on screen.
	await painted();

	// 2. During the loader: 3D (shaders compiled, scenes rendered once) and
	//    every image (downloaded and decoded). Nothing left to load afterwards.
	const glReady = loadGL();
	let onImg = () => {};
	const images = preloadAll((f) => onImg(f));
	const gl = await loadIntro({ glReady, images, onImages: (cb) => (onImg = cb) });
	if (gl) showGL(gl);
	else glReady.then((g) => showGL(g, true));

	// 3. Animations set up under the loader (text splits, pins…), then the reveal.
	initSections(state, lenis);
	initMap({ gsap, ScrollTrigger });
	ScrollTrigger.refresh();
	await revealIntro(state);
	lenis.start();

	// Real resize: a single, deferred refresh. Height changes count too (desktop window
	// resized, DevTools opened), except small ones on touch devices (the mobile URL bar).
	let lastW = innerWidth;
	let lastH = innerHeight;
	let timer = 0;
	const coarse = matchMedia('(pointer: coarse)').matches;
	addEventListener('resize', () => {
		const dw = innerWidth !== lastW;
		const dh = Math.abs(innerHeight - lastH) > (coarse ? 150 : 0);
		if (!dw && !dh) return;
		lastW = innerWidth;
		lastH = innerHeight;
		clearTimeout(timer);
		timer = setTimeout(() => ScrollTrigger.refresh(), 250);
	});
}

boot();
