/**
 * Textures générées au chargement (canvas 2D) : aucune image à télécharger pour la 3D.
 * Le drapeau et l'étiquette de la canette sont peints avec la police Barlow Condensed
 * déjà chargée par la page.
 */
import * as THREE from 'three';
import { fbm, noise3, rng, smoothstep } from 'emg-topas/gl/noise';

export const INK = {
	red: '#9E1B22',
	maroon: '#6E1016',
	char: '#3B1A12',
	chilli: '#E2481F',
	saffron: '#F28A1E',
	gold: '#F4B421',
	acai: '#5A2A6B',
	cream: '#F4EFE4',
	pita: '#EEE7DA',
	parsley: '#4C7A2C',
};

function canvas(w, h) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	return c;
}

function tex(c, { srgb = true, repeat = false } = {}) {
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
	t.anisotropy = 4;
	if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.needsUpdate = true;
	return t;
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Peint une image pixel par pixel : fn(u, v) -> [r, g, b, bump]. */
function paint(w, h, fn) {
	const col = canvas(w, h);
	const bmp = canvas(w, h);
	const cc = col.getContext('2d');
	const bc = bmp.getContext('2d');
	const ci = cc.createImageData(w, h);
	const bi = bc.createImageData(w, h);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const [r, g, b, k] = fn(x / w, y / h, x, y);
			const i = (y * w + x) * 4;
			ci.data[i] = r; ci.data[i + 1] = g; ci.data[i + 2] = b; ci.data[i + 3] = 255;
			const kk = Math.max(0, Math.min(255, k * 255));
			bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = kk; bi.data[i + 3] = 255;
		}
	}
	cc.putImageData(ci, 0, 0);
	bc.putImageData(bi, 0, 0);
	return { col, bmp };
}

/** Dessine le même tracé sur plusieurs contextes (couleur + relief). */
function both(pairs, draw) {
	for (const [ctx, style] of pairs) {
		ctx.save();
		draw(ctx, style);
		ctx.restore();
	}
}

/** Police du site (Barlow Condensed 800), attendue avant de peindre. */
const FONT = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", Impact, sans-serif';
async function fontReady() {
	try {
		if (!document.fonts) return;
		await Promise.race([
			document.fonts.load(`800 200px ${FONT}`, 'LAZEEZ'),
			new Promise((r) => setTimeout(r, 2500)),
		]);
		await document.fonts.ready;
	} catch (e) {
		/* police de secours */
	}
}

/** Mot écrit à une largeur et une hauteur données (centré sur cx, cy). */
function word(ctx, text, cx, cy, maxW, maxH) {
	let size = 400;
	ctx.font = `800 ${size}px ${FONT}`;
	const m = ctx.measureText(text);
	const hh = (m.actualBoundingBoxAscent || size * 0.7) + (m.actualBoundingBoxDescent || 0);
	size *= Math.min(maxW / m.width, maxH / hh);
	ctx.font = `800 ${size}px ${FONT}`;
	const m2 = ctx.measureText(text);
	const a = m2.actualBoundingBoxAscent || size * 0.7;
	const d = m2.actualBoundingBoxDescent || 0;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'alphabetic';
	ctx.fillText(text, cx, cy + (a - d) / 2);
}

/* ---------------------------------------------------------------------------
   Galette libanaise
   ------------------------------------------------------------------------ */
/**
 * Galette (UV planaires, centre 0.5) : face intérieure pâle et farinée, face extérieure
 * dorée à la poêle (taches toastées, cloques brunies, points de brûlé).
 */
export function flatbread() {
	const W = 384;
	const inC = canvas(W, W);
	const outC = canvas(W, W);
	const bmp = canvas(W, W);
	const ii = inC.getContext('2d').createImageData(W, W);
	const oi = outC.getContext('2d').createImageData(W, W);
	const bi = bmp.getContext('2d').createImageData(W, W);
	const pale = hex('#F2E3C0');
	const paleB = hex('#E5CC99');
	const toastIn = hex('#D7AA68');
	const flour = hex('#FAF3E3');
	const gold = hex('#ECCE93');
	const goldB = hex('#DDB06E');
	const toast = hex('#B9722D');
	const brown = hex('#7B4219');
	const charC = hex('#2E170A');
	for (let y = 0; y < W; y++) {
		for (let x = 0; x < W; x++) {
			const u = x / W;
			const v = y / W;
			const n = fbm(u * 5, v * 5, 1.3, 4);
			const blot = smoothstep(0.0, 0.62, fbm(u * 3.4 + 3, v * 3.4, 2.2, 3));
			const blister = smoothstep(0.42, 0.86, noise3(u * 15, v * 15, 3.1));
			const fl = smoothstep(0.2, 0.8, noise3(u * 6 + 9, v * 6, 5.5));
			const fine = noise3(u * 48, v * 48, 2.2);
			// Face intérieure.
			let a = mix(pale, paleB, smoothstep(-0.5, 0.6, n) * 0.55);
			a = mix(a, toastIn, blot * 0.2 + blister * blot * 0.35);
			a = mix(a, flour, fl * 0.45);
			// Face extérieure (secours si la photo ne charge pas) : taches de poêle.
			let b = mix(gold, goldB, smoothstep(-0.5, 0.6, n));
			b = mix(b, toast, blot * 0.5);
			b = mix(b, brown, blister * (0.25 + blot * 0.6));
			const speck = smoothstep(0.72, 0.92, noise3(u * 60, v * 60, 9.3)) * (0.3 + blot);
			b = mix(b, charC, Math.min(1, speck) * 0.55);
			b = mix(b, flour, fl * 0.18 * (1 - blot));
			const i = (y * W + x) * 4;
			ii.data[i] = a[0] + fine * 6; ii.data[i + 1] = a[1] + fine * 5; ii.data[i + 2] = a[2] + fine * 4; ii.data[i + 3] = 255;
			oi.data[i] = b[0] + fine * 8; oi.data[i + 1] = b[1] + fine * 6; oi.data[i + 2] = b[2] + fine * 4; oi.data[i + 3] = 255;
			const k = Math.max(0, Math.min(1, 0.5 + blister * 0.3 + n * 0.12 + fine * 0.05)) * 255;
			bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = k; bi.data[i + 3] = 255;
		}
	}
	inC.getContext('2d').putImageData(ii, 0, 0);
	outC.getContext('2d').putImageData(oi, 0, 0);
	bmp.getContext('2d').putImageData(bi, 0, 0);
	return { inMap: tex(inC), outMap: tex(outC), bump: tex(bmp, { srgb: false }) };
}

/* ---------------------------------------------------------------------------
   Papier d'aluminium : froissures fines (relief) et brillance irrégulière
   ------------------------------------------------------------------------ */
export function foil() {
	const W = 256;
	// Périodique en u (le tour du rouleau) : bruit échantillonné sur un cylindre.
	const crease = (u, v) => {
		const a = u * Math.PI * 2;
		const cx = Math.cos(a) * 1.6;
		const cz = Math.sin(a) * 1.6;
		let s = 0;
		let f = 1;
		let w = 0.6;
		for (let k = 0; k < 4; k++) {
			s += w * (1 - Math.abs(noise3(cx * f + k * 7, v * 5 * f, cz * f))) ** 4;
			f *= 2.2;
			w *= 0.55;
		}
		return s;
	};
	const { bmp } = paint(W, W, (u, v) => {
		const c = crease(u, v);
		return [0, 0, 0, 0.25 + c * 0.65];
	});
	const { bmp: rough } = paint(128, 128, (u, v) => {
		const a = u * Math.PI * 2;
		const n = fbm(Math.cos(a) * 2, v * 4, Math.sin(a) * 2, 3);
		return [0, 0, 0, 0.45 + 0.4 * smoothstep(-0.5, 0.6, n)];
	});
	return { bump: tex(bmp, { srgb: false }), rough: tex(rough, { srgb: false }) };
}

/* ---------------------------------------------------------------------------
   Tranche de tomate (disque, rayon 0.5 en UV)
   ------------------------------------------------------------------------ */
/**
 * Peau fine, chair (péricarpe) rouge, cloisons, trois ou quatre loges de gelée orangée
 * translucide remplies de pépins, columelle claire au centre. Relief : gelée en creux.
 */
export function tomato(seed = 5) {
	const W = 512;
	const R = W / 2;
	const col = canvas(W, W);
	const bmp = canvas(W, W);
	const c = col.getContext('2d');
	const b = bmp.getContext('2d');
	const r = rng(seed);
	const disc = (ctx, rad, fill) => {
		ctx.fillStyle = fill;
		ctx.beginPath();
		ctx.arc(R, R, rad, 0, Math.PI * 2);
		ctx.fill();
	};
	disc(c, R, '#A8160E');
	disc(c, R * 0.975, '#C9261A');
	const wall = c.createRadialGradient(R, R, R * 0.2, R, R, R * 0.96);
	wall.addColorStop(0, '#E9553A');
	wall.addColorStop(0.7, '#DE3F27');
	wall.addColorStop(1, '#D3321F');
	disc(c, R * 0.965, wall);
	b.fillStyle = '#9A9A9A';
	b.fillRect(0, 0, W, W);
	// Fines nervures vasculaires claires dans la chair.
	c.strokeStyle = 'rgba(255,170,130,0.22)';
	c.lineWidth = 1.2;
	for (let i = 0; i < 70; i++) {
		const a = r() * Math.PI * 2;
		const r0 = R * (0.74 + r() * 0.06);
		c.beginPath();
		c.moveTo(R + Math.cos(a) * r0, R + Math.sin(a) * r0);
		c.lineTo(R + Math.cos(a + (r() - 0.5) * 0.05) * R * 0.94, R + Math.sin(a) * R * 0.94);
		c.stroke();
	}
	// Loges : lobes arrondis entre les cloisons.
	const N = 3 + Math.floor(r() * 2);
	const a0 = r() * Math.PI;
	for (let k = 0; k < N; k++) {
		const am = a0 + (k / N) * Math.PI * 2;
		const half = (Math.PI / N) * 0.74;
		const path = (ctx) => {
			ctx.beginPath();
			const steps = 28;
			for (let s = 0; s <= steps; s++) {
				const t = s / steps;
				const a = am - half + t * half * 2;
				const rr = R * (0.72 - 0.06 * Math.abs(t - 0.5) * 2) * (1 + 0.04 * Math.sin(t * 9 + k));
				const x = R + Math.cos(a) * rr;
				const y = R + Math.sin(a) * rr;
				if (s) ctx.lineTo(x, y);
				else ctx.moveTo(x, y);
			}
			const inner = R * 0.3;
			ctx.quadraticCurveTo(R + Math.cos(am + half) * inner * 0.9, R + Math.sin(am + half) * inner * 0.9, R + Math.cos(am) * inner, R + Math.sin(am) * inner);
			ctx.quadraticCurveTo(R + Math.cos(am - half) * inner * 0.9, R + Math.sin(am - half) * inner * 0.9, R + Math.cos(am - half) * R * 0.66, R + Math.sin(am - half) * R * 0.66);
			ctx.closePath();
		};
		const gel = c.createRadialGradient(R + Math.cos(am) * R * 0.5, R + Math.sin(am) * R * 0.5, 0, R + Math.cos(am) * R * 0.5, R + Math.sin(am) * R * 0.5, R * 0.3);
		gel.addColorStop(0, '#F7A456');
		gel.addColorStop(0.6, '#F08540');
		gel.addColorStop(1, '#E4632F');
		c.fillStyle = gel;
		path(c);
		c.fill();
		c.strokeStyle = 'rgba(255,215,170,0.55)';
		c.lineWidth = 3;
		c.stroke();
		b.fillStyle = '#5A5A5A';
		path(b);
		b.fill();
		// Pépins : gouttes crème entourées d'une gaine de gelée, en arcs dans la loge.
		for (let s = 0; s < 13; s++) {
			const t = (s + 0.5) / 13;
			const a = am - half * 0.78 + t * half * 1.56 + (r() - 0.5) * 0.06;
			const rr = R * (0.44 + r() * 0.2);
			const x = R + Math.cos(a) * rr;
			const y = R + Math.sin(a) * rr;
			both([[c, 0], [b, 1]], (ctx, isBump) => {
				ctx.translate(x, y);
				ctx.rotate(a + (r() - 0.5) * 0.8);
				ctx.fillStyle = isBump ? '#7A7A7A' : 'rgba(255,190,120,0.7)';
				ctx.beginPath();
				ctx.ellipse(0, 0, R * 0.05, R * 0.034, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = isBump ? '#C8C8C8' : '#EED68E';
				ctx.beginPath();
				ctx.ellipse(0, 0, R * 0.03, R * 0.018, 0, 0, Math.PI * 2);
				ctx.fill();
				if (!isBump) {
					ctx.fillStyle = 'rgba(255,255,235,0.8)';
					ctx.beginPath();
					ctx.ellipse(-R * 0.008, -R * 0.006, R * 0.012, R * 0.006, 0, 0, Math.PI * 2);
					ctx.fill();
				}
			});
		}
	}
	// Columelle (cœur) : étoile claire aux bras qui rejoignent les cloisons.
	both([[c, '#F2866A'], [b, '#B4B4B4']], (ctx, fill) => {
		ctx.fillStyle = fill;
		ctx.beginPath();
		for (let s = 0; s <= 60; s++) {
			const a = (s / 60) * Math.PI * 2;
			let k = 0;
			for (let q = 0; q < N; q++) k = Math.max(k, Math.cos(a - a0 - ((q + 0.5) / N) * Math.PI * 2) ** 18);
			const rr = R * (0.17 + 0.2 * k);
			const x = R + Math.cos(a) * rr;
			const y = R + Math.sin(a) * rr;
			if (s) ctx.lineTo(x, y);
			else ctx.moveTo(x, y);
		}
		ctx.fill();
	});
	const core = c.createRadialGradient(R, R, 0, R, R, R * 0.16);
	core.addColorStop(0, '#F7C2A4');
	core.addColorStop(1, 'rgba(247,170,140,0)');
	disc(c, R * 0.16, core);
	// Reflet humide en bordure des loges.
	c.globalCompositeOperation = 'lighter';
	for (let i = 0; i < 40; i++) {
		const a = r() * Math.PI * 2;
		const rr = R * (0.35 + r() * 0.5);
		c.fillStyle = 'rgba(60,30,10,0.18)';
		c.beginPath();
		c.arc(R + Math.cos(a) * rr, R + Math.sin(a) * rr, 1 + r() * 3, 0, Math.PI * 2);
		c.fill();
	}
	c.globalCompositeOperation = 'source-over';
	const map = tex(col);
	map.anisotropy = 8;
	return { map, bump: tex(bmp, { srgb: false }) };
}

/* ---------------------------------------------------------------------------
   Feuille de laitue (u en travers, 0.5 = nervure ; v de la base à la pointe)
   ------------------------------------------------------------------------ */
export function leaf(seed = 3) {
	const Wd = 256;
	const H = 512;
	const r = rng(seed);
	const { col, bmp } = paint(Wd, H, (u, vv) => {
		const v = 1 - vv; // 0 = base (bas de l'image), 1 = pointe
		const n = fbm(u * 4, v * 8, 2.4, 3);
		const d = Math.abs(u - 0.5) * 2;
		let c = mix(hex('#DDEDA8'), hex('#86C449'), smoothstep(0.0, 0.55, v) * (0.45 + 0.55 * d));
		c = mix(c, hex('#5E9F2E'), smoothstep(0.6, 1, d) * smoothstep(0.15, 0.8, v) * 0.75);
		c = mix(c, hex('#F0F6D6'), smoothstep(0.2, 0, v) * 0.55);
		c = mix(c, hex('#74B23C'), smoothstep(0.2, 0.7, n) * 0.3);
		const bl = smoothstep(0.6, 0.85, noise3(u * 30, v * 60, 1.1)) * 0.12;
		return [c[0] + bl * 30, c[1] + bl * 30, c[2] + bl * 10, 0.5 + n * 0.08];
	});
	const c = col.getContext('2d');
	const b = bmp.getContext('2d');
	// Nervure centrale : large à la base, fine à la pointe.
	for (const [ctx, fill] of [[c, 'rgba(246,249,226,0.95)'], [b, 'rgba(255,255,255,0.9)']]) {
		ctx.fillStyle = fill;
		ctx.beginPath();
		ctx.moveTo(Wd * 0.43, H);
		ctx.quadraticCurveTo(Wd * 0.48, H * 0.4, Wd * 0.5, 0);
		ctx.quadraticCurveTo(Wd * 0.52, H * 0.4, Wd * 0.57, H);
		ctx.fill();
	}
	// Nervures secondaires : arcs qui partent de la nervure vers le bord, en remontant.
	for (let i = 0; i < 13; i++) {
		const v0 = 0.08 + (i / 13) * 0.86 + (r() - 0.5) * 0.03;
		for (const side of [-1, 1]) {
			const y0 = H * (1 - v0);
			const len = 0.5 * (1.1 - v0 * 0.4);
			for (const [ctx, stroke, w] of [[c, 'rgba(236,246,208,0.5)', 2.2], [b, 'rgba(255,255,255,0.6)', 3]]) {
				ctx.strokeStyle = stroke;
				ctx.lineWidth = w * (1.2 - v0 * 0.6);
				ctx.lineCap = 'round';
				ctx.beginPath();
				ctx.moveTo(Wd * 0.5, y0);
				const ex = Wd * (0.5 + side * len);
				const ey = y0 - H * (0.12 + r() * 0.05);
				ctx.quadraticCurveTo(Wd * (0.5 + side * len * 0.45), y0 - H * 0.015, ex, ey);
				ctx.stroke();
				// Ramifications fines.
				ctx.lineWidth *= 0.45;
				for (let q = 0; q < 3; q++) {
					const t = 0.35 + q * 0.2;
					const px = Wd * (0.5 + side * len * t * 0.9);
					const py = y0 - H * 0.03 * t - H * 0.06 * t * t;
					ctx.beginPath();
					ctx.moveTo(px, py);
					ctx.quadraticCurveTo(px + side * Wd * 0.05, py - H * 0.01, px + side * Wd * 0.08, py - H * 0.05);
					ctx.stroke();
				}
			}
		}
	}
	return { map: tex(col), bump: tex(bmp, { srgb: false }) };
}

/* ---------------------------------------------------------------------------
   Fraise : face coupée (u en travers, v de la queue à la pointe) et peau à akènes
   ------------------------------------------------------------------------ */
export function strawberry(seed = 9) {
	const r = rng(seed);
	const W = 256;
	const { col: cut } = paint(W, W, (u, v) => {
		const x = (u - 0.5) * 2;
		const t = v;
		// Silhouette approximative (le maillage découpe) : distance au bord.
		const prof = t < 0.2 ? 0.74 + 0.26 * Math.sin((t / 0.2) * Math.PI / 2) : Math.cos(((t - 0.2) / 0.8) * Math.PI / 2) ** 0.7;
		const e = Math.abs(x) / Math.max(0.05, prof);
		let c = mix(hex('#F6C6C6'), hex('#EE6A72'), smoothstep(0.25, 0.8, e));
		c = mix(c, hex('#D8172E'), smoothstep(0.82, 0.97, e));
		// Cœur blanc allongé et fibres claires rayonnantes.
		const core = smoothstep(0.32, 0.08, Math.abs(x) / (0.25 + 0.2 * (1 - t))) * smoothstep(0.95, 0.6, t);
		c = mix(c, hex('#FCEDEA'), core * 0.9);
		const ray = smoothstep(0.88, 1, Math.abs(Math.sin(Math.atan2(x, t - 0.15) * 7 + noise3(u * 3, v * 3, 2) * 1.5))) * smoothstep(0.2, 0.7, e) * (1 - smoothstep(0.8, 0.95, e));
		c = mix(c, hex('#FAD9D9'), ray * 0.5);
		const n = noise3(u * 30, v * 30, 1.7);
		return [c[0] + n * 6, c[1] + n * 5, c[2] + n * 5, 0.5];
	});
	const SW = 512;
	const SH = 256;
	const { col: skin, bmp: skinB } = paint(SW, SH, (u, v) => {
		const n = fbm(u * 6, v * 4, 4.1, 3);
		let c = mix(hex('#C8142A'), hex('#E2343A'), smoothstep(-0.4, 0.5, n));
		c = mix(c, hex('#A00C1F'), smoothstep(0.3, 0.8, noise3(u * 14, v * 9, 3)) * 0.35);
		c = mix(c, hex('#F07A6A'), smoothstep(0.12, 0.0, v) * 0.55);
		return [c[0], c[1], c[2], 0.6 + n * 0.08];
	});
	// Akènes : rangées décalées, petits creux avec une graine dorée.
	const sc = skin.getContext('2d');
	const sb = skinB.getContext('2d');
	const rows = 11;
	for (let j = 0; j < rows; j++) {
		const vv = 0.07 + (j / rows) * 0.9;
		const cols = Math.round(16 * (1 - vv * 0.35));
		for (let i = 0; i < cols; i++) {
			const uu = (i + (j % 2) * 0.5 + (r() - 0.5) * 0.25) / cols;
			const x = uu * SW;
			const y = vv * SH + (r() - 0.5) * 5;
			const s = 5.5 * (1 - vv * 0.3);
			for (const [ctx, pit, seedC] of [[sc, 'rgba(120,6,20,0.65)', ['#E9C34C', '#F0D36A', '#D9A93A'][Math.floor(r() * 3)]], [sb, '#262626', '#E0E0E0']]) {
				ctx.fillStyle = pit;
				ctx.beginPath();
				ctx.ellipse(x, y, s * 1.25, s, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = seedC;
				ctx.beginPath();
				ctx.ellipse(x, y - s * 0.15, s * 0.45, s * 0.6, 0, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}
	return { cut: tex(cut), skin: tex(skin), bump: tex(skinB, { srgb: false }) };
}

/* ---------------------------------------------------------------------------
   Rondelle de banane (disque, rayon 0.5)
   ------------------------------------------------------------------------ */
export function banana(seed = 4) {
	const W = 256;
	const R = W / 2;
	const { col, bmp } = paint(W, W, (u, v) => {
		const dx = u - 0.5;
		const dy = v - 0.5;
		const d = Math.hypot(dx, dy) * 2;
		const a = Math.atan2(dy, dx);
		const n = fbm(u * 8, v * 8, 1.9, 3);
		let c = mix(hex('#FAF0C8'), hex('#F2E09E'), smoothstep(0.1, 0.9, d));
		c = mix(c, hex('#E8CF7E'), smoothstep(0.86, 0.98, d));
		// Anneau fibreux et rayons très légers.
		c = mix(c, hex('#EAD592'), smoothstep(0.04, 0, Math.abs(d - 0.62)) * 0.35);
		c = mix(c, hex('#F7E8B6'), smoothstep(0.9, 1, Math.cos(a * 18 + n * 2)) * 0.25 * (1 - d));
		// Cœur à trois lobes, légèrement plus sombre et translucide.
		const lobes = 0.17 + 0.05 * Math.cos(a * 3);
		c = mix(c, hex('#E7D594'), smoothstep(lobes + 0.04, lobes - 0.04, d) * 0.6);
		return [c[0] + n * 5, c[1] + n * 5, c[2] + n * 3, 0.55 + n * 0.08 - smoothstep(lobes + 0.04, lobes - 0.04, d) * 0.08];
	});
	// Graines : petits points bruns en Y autour du centre.
	const r = rng(seed);
	const c = col.getContext('2d');
	for (let k = 0; k < 3; k++) {
		const a = (k / 3) * Math.PI * 2 + 0.4;
		for (let s = 0; s < 4; s++) {
			const rr = R * (0.05 + s * 0.035);
			c.fillStyle = `rgba(${90 + r() * 30},${60 + r() * 20},30,0.75)`;
			c.beginPath();
			c.ellipse(R + Math.cos(a) * rr, R + Math.sin(a) * rr, 2.2, 1.6, a, 0, Math.PI * 2);
			c.fill();
		}
	}
	return { map: tex(col), bump: tex(bmp, { srgb: false }) };
}

/** Grain fin (relief) : croûte de falafel, frites, feta, açaí. Répété. */
export function grain() {
	const { bmp } = paint(128, 128, (u, v) => {
		const a = u * Math.PI * 2;
		const b = v * Math.PI * 2;
		const n = noise3(Math.cos(a) * 3 + Math.cos(b) * 0.5, Math.sin(a) * 3, Math.sin(b) * 3) * 0.6 + noise3(Math.cos(a) * 9, Math.sin(a) * 9 + Math.cos(b) * 9, Math.sin(b) * 9) * 0.4;
		return [0, 0, 0, 0.5 + n * 0.5];
	});
	return tex(bmp, { srgb: false, repeat: true });
}

/* ---------------------------------------------------------------------------
   Ardoise, citron, bois… (inchangés)
   ------------------------------------------------------------------------ */
/** Ardoise : gris anthracite, strates et rayures. */
export function slate() {
	const a = hex('#1F2226');
	const b = hex('#33383E');
	const c2 = hex('#474D55');
	const { col, bmp } = paint(512, 256, (u, v) => {
		const n = fbm(u * 4, v * 3, 1.7, 4);
		const strata = noise3(u * 2.5, v * 14, 4.2) * 0.5 + 0.5;
		let c = mix(a, b, smoothstep(-0.5, 0.6, n));
		c = mix(c, c2, smoothstep(0.82, 0.97, strata) * 0.35);
		return [c[0], c[1], c[2], 0.5 + n * 0.25 + strata * 0.05];
	});
	const t = tex(col, { repeat: true });
	const bump = tex(bmp, { srgb: false, repeat: true });
	return { map: t, bump };
}

/**
 * Chair de citron (face coupée), disque centré, rayon = 0.5 en UV :
 * écorce, ziste blanc, quartiers de pulpe en vésicules, membranes, cœur, pépins.
 * Retourne aussi un relief (vésicules bombées, membranes en creux).
 */
export function lemon() {
	const W = 512;
	const R = W / 2;
	const col = canvas(W, W);
	const bmp = canvas(W, W);
	const c = col.getContext('2d');
	const b = bmp.getContext('2d');
	const r = rng(31);
	const disc = (ctx, rad, fill) => {
		ctx.fillStyle = fill;
		ctx.beginPath();
		ctx.arc(R, R, rad, 0, Math.PI * 2);
		ctx.fill();
	};
	disc(c, R, '#D8B70C');
	disc(c, R * 0.975, '#F3D21C');
	disc(c, R * 0.945, '#F7E7A6');
	disc(c, R * 0.925, '#FBF4DA');
	const pulp = c.createRadialGradient(R, R, R * 0.05, R, R, R * 0.87);
	pulp.addColorStop(0, '#F6EB9A');
	pulp.addColorStop(0.6, '#F1E06A');
	pulp.addColorStop(1, '#EBD651');
	disc(c, R * 0.87, pulp);
	b.fillStyle = '#808080';
	b.fillRect(0, 0, W, W);
	disc(b, R * 0.93, '#8C8C8C');
	disc(b, R * 0.87, '#6E6E6E');

	const N = 10;
	const angles = [];
	let acc = r() * Math.PI;
	for (let i = 0; i < N; i++) {
		angles.push(acc);
		acc += ((Math.PI * 2) / N) * (0.85 + r() * 0.3);
	}
	const scale = (Math.PI * 2) / (acc - angles[0]);
	for (let i = 0; i < N; i++) angles[i] = angles[0] + (angles[i] - angles[0]) * scale;
	const tones = ['#F3E26C', '#EDD94F', '#F7EC98', '#E7D243', '#F1DF60'];
	for (let i = 0; i < N; i++) {
		const a0 = angles[i];
		const a1 = i + 1 < N ? angles[i + 1] : angles[0] + Math.PI * 2;
		const span = a1 - a0;
		for (let k = 0; k < 150; k++) {
			const rho = 0.13 + Math.sqrt(r()) * 0.71;
			const margin = 0.05 / Math.max(0.2, rho);
			const a = a0 + margin + r() * Math.max(0, span - margin * 2);
			const x = R + Math.cos(a) * rho * R;
			const y = R + Math.sin(a) * rho * R;
			const len = (0.045 + r() * 0.06) * R;
			const wid = (0.012 + r() * 0.014) * R * (0.6 + rho);
			for (const [ctx, fill, hi] of [
				[c, tones[Math.floor(r() * tones.length)], 'rgba(255,250,215,0.55)'],
				[b, 'rgba(225,225,225,0.9)', 'rgba(255,255,255,0.8)'],
			]) {
				ctx.save();
				ctx.translate(x, y);
				ctx.rotate(a);
				ctx.globalAlpha = 0.9;
				ctx.fillStyle = fill;
				ctx.beginPath();
				ctx.ellipse(0, 0, len, wid, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = 1;
				ctx.fillStyle = hi;
				ctx.beginPath();
				ctx.ellipse(len * 0.25, -wid * 0.25, len * 0.45, wid * 0.35, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}
		}
		for (const [ctx, stroke, w] of [[c, 'rgba(252,247,225,0.95)', 0.016], [b, '#5A5A5A', 0.02]]) {
			ctx.strokeStyle = stroke;
			ctx.lineWidth = w * R;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(R + Math.cos(a0) * R * 0.07, R + Math.sin(a0) * R * 0.07);
			const am = a0 + (r() - 0.5) * 0.04;
			ctx.quadraticCurveTo(R + Math.cos(am) * R * 0.5, R + Math.sin(am) * R * 0.5, R + Math.cos(a0) * R * 0.875, R + Math.sin(a0) * R * 0.875);
			ctx.stroke();
		}
	}
	const core = c.createRadialGradient(R, R, 0, R, R, R * 0.1);
	core.addColorStop(0, '#FCF7E2');
	core.addColorStop(0.75, '#F8EDC0');
	core.addColorStop(1, 'rgba(248,237,192,0)');
	disc(c, R * 0.1, core);
	for (let i = 0; i < 3; i++) {
		const k = Math.floor(r() * N);
		const a = angles[k] + 0.3;
		const x = R + Math.cos(a) * R * 0.24;
		const y = R + Math.sin(a) * R * 0.24;
		for (const [ctx, fill] of [[c, '#EFE3B8'], [b, '#D8D8D8']]) {
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(a);
			ctx.fillStyle = fill;
			ctx.beginPath();
			ctx.ellipse(0, 0, R * 0.05, R * 0.022, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}
	const rim = c.createRadialGradient(R, R, R * 0.7, R, R, R * 0.87);
	rim.addColorStop(0, 'rgba(200,140,0,0)');
	rim.addColorStop(1, 'rgba(190,160,0,0.2)');
	disc(c, R * 0.87, rim);
	const map = tex(col);
	map.anisotropy = 8;
	return { map, bump: tex(bmp, { srgb: false }) };
}

/** Écorce de citron : pores (relief) et légères nuances. u = tour, v = épaisseur. */
export function rind() {
	const { col, bmp } = paint(512, 64, (u, v) => {
		const n = noise3(u * 60, v * 8, 2.1);
		const pore = smoothstep(0.35, 0.75, Math.abs(noise3(u * 180, v * 24, 5.3)));
		const k = 0.94 + n * 0.06 - pore * 0.05;
		return [244 * k, 212 * k, 30 * k, 0.6 - pore * 0.35 + n * 0.05];
	});
	return { map: tex(col), bump: tex(bmp, { srgb: false }) };
}

/**
 * Pâte de fromage (UV planaires, rayon de la meule = 0.49) : crème doré, quelques
 * petits trous, liseré de croûte orangé au bord.
 */
export function paste() {
	const W = 256;
	const R = W / 2;
	const { col, bmp } = paint(W, W, (u, v) => {
		const d = Math.hypot(u - 0.5, v - 0.5) * 2;
		const n = fbm(u * 5, v * 5, 6.1, 3);
		let c = mix(hex('#F2D98C'), hex('#EBCB72'), smoothstep(-0.3, 0.5, n));
		c = mix(c, hex('#E0B257'), smoothstep(0.84, 0.94, d) * 0.7);
		c = mix(c, hex('#A8601F'), smoothstep(0.94, 0.965, d));
		return [c[0], c[1], c[2], 0.55 + n * 0.06];
	});
	const r = rng(52);
	const cc = col.getContext('2d');
	const bc = bmp.getContext('2d');
	for (let i = 0; i < 14; i++) {
		const x = R + (r() - 0.5) * R * 1.4;
		const y = R + (r() - 0.5) * R * 1.4;
		const s = (0.02 + r() * 0.035) * R;
		for (const [ctx, inner, outer] of [[cc, 'rgba(196,150,60,0.9)', 'rgba(230,200,120,0)'], [bc, 'rgba(0,0,0,0.9)', 'rgba(0,0,0,0)']]) {
			const g = ctx.createRadialGradient(x, y, 0, x, y, s);
			g.addColorStop(0, inner);
			g.addColorStop(0.75, inner);
			g.addColorStop(1, outer);
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.ellipse(x, y, s, s * 0.85, r() * 3, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	return { map: tex(col), bump: tex(bmp, { srgb: false }) };
}

/** Bambou / bois clair (pics, cuillère). */
export function wood() {
	const a = hex('#C9A46A');
	const b = hex('#E6CC98');
	const { col, bmp } = paint(256, 64, (u, v) => {
		const n = noise3(u * 2, v * 30, 0.5) * 0.5 + noise3(u * 8, v * 80, 2) * 0.25;
		const c = mix(a, b, 0.5 + n);
		return [c[0], c[1], c[2], 0.5 + n * 0.5];
	});
	return { map: tex(col, { repeat: true }), bump: tex(bmp, { srgb: false, repeat: true }) };
}

/* ---------------------------------------------------------------------------
   Drapeau et canette (police du site)
   ------------------------------------------------------------------------ */
/** Drapeau « LAZEEZ » : Garlic Cream sur Lazeez Red, Barlow Condensed 800. */
export async function flag() {
	await fontReady();
	const W = 1024;
	const H = 640;
	const c = canvas(W, H);
	const ctx = c.getContext('2d');
	ctx.fillStyle = INK.red;
	ctx.fillRect(0, 0, W, H);
	// Ourlet plus sombre (tissu replié) côté pic et en bas.
	ctx.fillStyle = 'rgba(70,8,12,0.28)';
	ctx.fillRect(0, 0, 26, H);
	ctx.fillRect(0, H - 14, W, 14);
	ctx.fillStyle = INK.cream;
	word(ctx, 'LAZEEZ', W / 2 + 10, H / 2, W * 0.8, H * 0.6);
	const t = tex(c);
	t.anisotropy = 8;
	return t;
}

/**
 * Étiquette de canette générique (u = tour, v = hauteur, haut de l'image = haut de la canette) :
 * rouge Lazeez, « LAZEEZ » vertical deux fois, bandes aux couleurs de la marque.
 * Aucune autre marque, aucun motif de vague.
 */
export async function canLabel() {
	await fontReady();
	const W = 1024;
	const H = 512;
	const c = canvas(W, H);
	const ctx = c.getContext('2d');
	ctx.fillStyle = INK.red;
	ctx.fillRect(0, 0, W, H);
	// Léger dégradé vertical (encre plus dense en bas) et grain d'impression.
	const g = ctx.createLinearGradient(0, 0, 0, H);
	g.addColorStop(0, 'rgba(255,255,255,0.04)');
	g.addColorStop(1, 'rgba(60,0,8,0.18)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, H);
	const r = rng(77);
	for (let i = 0; i < 1400; i++) {
		ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
		ctx.fillRect(r() * W, r() * H, 2, 2);
	}
	// Filets crème en haut et en bas.
	ctx.fillStyle = INK.cream;
	ctx.fillRect(0, 26, W, 4);
	ctx.fillRect(0, H - 30, W, 4);
	// « LAZEEZ » horizontal, espacé, deux fois autour de la canette.
	const spaced = 'L A Z E E Z';
	for (const cx of [W * 0.25, W * 0.75]) word(ctx, spaced, cx, H * 0.5, W * 0.3, H * 0.13);
	const t = tex(c);
	t.anisotropy = 8;
	return t;
}

/**
 * Mouchetures des sauces, répétées le long du filet (u = longueur) : herbes pour la sauce
 * à l'ail, graines et flocons pour le piment. Blanc = couleur du matériau.
 */
export function speckle(kind = 'herb') {
	const W = 256;
	const H = 64;
	const c = canvas(W, H);
	const ctx = c.getContext('2d');
	ctx.fillStyle = '#FFFFFF';
	ctx.fillRect(0, 0, W, H);
	const r = rng(kind === 'herb' ? 3 : 8);
	const cols = kind === 'herb' ? ['#5F8A2C', '#3F6E22', '#86A653', '#C9B98A'] : ['#6A0C06', '#F0B050', '#8A1208', '#FFD9A0'];
	const n = kind === 'herb' ? 70 : 55;
	for (let i = 0; i < n; i++) {
		ctx.fillStyle = cols[Math.floor(r() * cols.length)];
		ctx.beginPath();
		const s = kind === 'herb' ? 1.2 + r() * 2.6 : 1 + r() * 2.2;
		ctx.ellipse(r() * W, r() * H, s * (1 + r()), s, r() * 3, 0, Math.PI * 2);
		ctx.fill();
	}
	const t = tex(c, { repeat: true });
	return t;
}

/** Ombre de contact douce (dégradé radial). */
export function shadow() {
	const c = canvas(256, 256);
	const ctx = c.getContext('2d');
	const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
	g.addColorStop(0, 'rgba(0,0,0,0.55)');
	g.addColorStop(0.45, 'rgba(0,0,0,0.25)');
	g.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, 256, 256);
	return tex(c);
}
