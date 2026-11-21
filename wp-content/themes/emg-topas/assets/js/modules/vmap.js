/**
 * Wellington Point map: the plain card fades while the OpenStreetMap plan
 * draws itself, outward from Lazeez Kebabs & Açaí.
 *
 * Incremental canvas drawing: each frame only strokes the new bits of line
 * (nothing is redrawn), so it stays very light, even on mobile.
 */
const T = 3.4; // total duration (s)

function prepare(data) {
	const maxD = Math.max(...data.roads.map((r) => r.d), ...data.buildings.map((b) => b.d), 1);
	const items = [];
	const add = (it, kind) => {
		const p = it.p;
		const seg = [0];
		for (let i = 2; i < p.length; i += 2) seg.push(seg[seg.length - 1] + Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]));
		const len = seg[seg.length - 1];
		let start;
		let dur;
		if (kind === 'water') {
			start = 0.2;
			dur = 2.2;
		} else if (kind === 'road') {
			start = (it.d / maxD) * T * 0.55;
			dur = 0.35 + Math.min(1.1, len / 1300);
		} else {
			start = 0.25 + (it.d / maxD) * T * 0.62;
			dur = 0.45;
		}
		items.push({ kind, p, seg, len, start, dur, w: it.w || 1.6, faint: !!it.dash, done: 0, filled: false });
	};
	data.water.forEach((w) => add(w, 'water'));
	data.roads.forEach((r) => add(r, 'road'));
	data.buildings.forEach((b) => add(b, 'building'));
	return items;
}

/** Point at distance L along the polyline. */
function pointAt(it, L) {
	const { p, seg } = it;
	let i = 1;
	while (i < seg.length - 1 && seg[i] < L) i++;
	const k = (L - seg[i - 1]) / (seg[i] - seg[i - 1] || 1);
	const a = (i - 1) * 2;
	return [p[a] + (p[a + 2] - p[a]) * k, p[a + 1] + (p[a + 3] - p[a + 1]) * k, i];
}

// Drawn on the light plan (the plain card fades out): brand maroon roads,
// açaí-purple water, thin-lined buildings.
function style(ctx, it) {
	if (it.kind === 'water') {
		ctx.strokeStyle = 'rgba(90, 42, 107, .9)';
		ctx.lineWidth = it.w;
	} else if (it.kind === 'road') {
		ctx.strokeStyle = it.faint ? 'rgba(110, 16, 22, .35)' : it.w >= 6 ? '#9E1B22' : 'rgba(110, 16, 22, .82)';
		ctx.lineWidth = it.w;
	} else {
		ctx.strokeStyle = 'rgba(110, 16, 22, .7)';
		ctx.lineWidth = 2;
	}
}

/** Strokes the [from, to] stretch of one item. */
function stroke(ctx, it, from, to) {
	if (to <= from) return;
	const [x0, y0, i0] = pointAt(it, from);
	const [x1, y1, i1] = pointAt(it, to);
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	for (let i = i0; i < i1; i++) ctx.lineTo(it.p[i * 2], it.p[i * 2 + 1]);
	ctx.lineTo(x1, y1);
	style(ctx, it);
	ctx.stroke();
}

function fill(ctx, it) {
	ctx.beginPath();
	ctx.moveTo(it.p[0], it.p[1]);
	for (let i = 2; i < it.p.length; i += 2) ctx.lineTo(it.p[i], it.p[i + 1]);
	ctx.closePath();
	ctx.fillStyle = 'rgba(244, 180, 33, .28)';
	ctx.fill();
}

export function initMap({ gsap, ScrollTrigger, reduced }) {
	const fig = document.querySelector('[data-vmap]');
	const canvas = fig?.querySelector('[data-vmap-canvas]');
	const json = document.getElementById('vmap-data');
	if (!fig || !canvas || !json) return;
	const data = JSON.parse(json.textContent);
	const items = prepare(data);
	const pois = [...fig.querySelectorAll('.vmap__poi')].map((el) => ({ el, d: Number(el.dataset.d) }));
	const maxD = Math.max(...pois.map((p) => p.d), 1);
	const ctx = canvas.getContext('2d');
	let t = 0;
	let running = false;

	const setup = () => {
		const r = canvas.getBoundingClientRect();
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.round(r.width * dpr);
		canvas.height = Math.round(r.height * dpr);
		const s = canvas.width / data.w;
		ctx.setTransform(s, 0, 0, s, 0, 0);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
	};

	/** Advances the drawing to time tt (adds only what is missing). */
	const advance = (tt) => {
		for (const it of items) {
			if (tt <= it.start || it.done >= it.len) continue;
			const f = Math.min(1, (tt - it.start) / it.dur);
			const to = it.len * (1 - (1 - f) ** 2);
			stroke(ctx, it, it.done, to);
			it.done = to;
			if (f >= 1 && it.kind === 'building' && !it.filled) {
				fill(ctx, it);
				it.filled = true;
			}
		}
		for (const p of pois) {
			if (!p.on && tt > 0.4 + (p.d / maxD) * T * 0.75) {
				p.on = true;
				p.el.classList.add('is-on');
			}
		}
	};

	/** Redraws everything (after a resize) up to the current time. */
	const redraw = () => {
		setup();
		items.forEach((it) => {
			it.done = 0;
			it.filled = false;
		});
		advance(t);
	};

	setup();
	new ResizeObserver(() => redraw()).observe(canvas);

	const tick = () => {
		t += gsap.ticker.deltaRatio(60) / 60;
		advance(t);
		if (t > T + 1) {
			gsap.ticker.remove(tick);
			running = false;
		}
	};
	const play = () => {
		if (running || t > 0) return;
		fig.classList.add('is-drawing');
		running = true;
		gsap.ticker.add(tick);
	};

	if (reduced || !ScrollTrigger) {
		fig.classList.add('is-drawing');
		t = T + 1;
		advance(t);
		pois.forEach((p) => p.el.classList.add('is-on'));
		return;
	}
	ScrollTrigger.create({ trigger: fig, start: 'top 72%', once: true, onEnter: play });
}
