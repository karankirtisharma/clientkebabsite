/**
 * Plats assemblés Lazeez : kébab (construit à plat puis roulé, ou déjà roulé dans
 * l'aluminium), açaí bowl, petites portions pour la pluie, ingrédients flottants.
 */
import * as THREE from 'three';
import * as F from 'emg-topas/gl/food';
import { clamp, noise3, rng } from 'emg-topas/gl/noise';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutBounce = (x) => {
	const n1 = 7.5625;
	const d1 = 2.75;
	if (x < 1 / d1) return n1 * x * x;
	if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
	if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
	return n1 * (x -= 2.625 / d1) * x + 0.984375;
};
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Couche de garniture instanciée. Chaque pièce : { shape, p, q, s, rp?, color, delay }.
 * update(drop, roll) : drop 0 → 1 (chute décalée de chaque pièce), roll 0 → 1 (pose à
 * plat → pose roulée). Les matrices ne sont recalculées que si l'état change.
 */
function pieces(geos, mat, items, { fall = 2.2 } = {}) {
	const per = geos.map(() => []);
	items.forEach((it) => per[it.shape % geos.length].push(it));
	const group = new THREE.Group();
	const ims = geos.map((g, k) => {
		const im = new THREE.InstancedMesh(g, mat, Math.max(1, per[k].length));
		im.count = per[k].length;
		im.frustumCulled = false;
		im.castShadow = true;
		im.receiveShadow = true;
		per[k].forEach((it, j) => it.color && im.setColorAt(j, it.color));
		group.add(im);
		return im;
	});
	const m4 = new THREE.Matrix4();
	const P = new THREE.Vector3();
	const Q = new THREE.Quaternion();
	const Qs = new THREE.Quaternion();
	const S = new THREE.Vector3();
	let last = '';
	const update = (drop = 1, roll = 0) => {
		const key = drop.toFixed(4) + ':' + roll.toFixed(4);
		if (key === last) return;
		last = key;
		ims.forEach((im, k) => {
			per[k].forEach((it, j) => {
				const t = clamp((drop - it.delay) / 0.35);
				if (t <= 0) {
					m4.makeScale(0, 0, 0);
				} else {
					P.copy(it.p);
					if (it.rp && roll > 0) P.lerp(it.rp, roll);
					P.y += (1 - easeOutBounce(t)) * fall;
					Q.copy(it.q);
					if (t < 1) Q.multiply(Qs.setFromAxisAngle(it.axis, (1 - t) * it.spin));
					S.setScalar(it.s);
					m4.compose(P, Q, S);
				}
				im.setMatrixAt(j, m4);
			});
			im.instanceMatrix.needsUpdate = true;
		});
	};
	update(1, 0);
	return { group, ims, update, items };
}

/** Même logique pour quelques objets entiers (demi-rondelles de tomate…). */
function solos(objs, { fall = 2.2 } = {}) {
	const group = new THREE.Group();
	objs.forEach((o) => group.add(o.obj));
	const Qs = new THREE.Quaternion();
	const update = (drop = 1, roll = 0) => {
		for (const o of objs) {
			const t = clamp((drop - o.delay) / 0.35);
			o.obj.visible = t > 0;
			if (t <= 0) continue;
			o.obj.position.copy(o.p);
			if (o.rp && roll > 0) o.obj.position.lerp(o.rp, roll);
			o.obj.position.y += (1 - easeOutBounce(t)) * fall;
			o.obj.quaternion.copy(o.q);
			if (t < 1) o.obj.quaternion.multiply(Qs.setFromAxisAngle(o.axis, (1 - t) * o.spin));
		}
	};
	update(1, 0);
	return { group, update };
}

const randAxis = (r) => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();

/** Orientation : axe local Y aligné sur n, puis rotation autour de n et petite inclinaison. */
function poseOn(n, r, tilt = 0.4) {
	const q = new THREE.Quaternion().setFromUnitVectors(UP, n);
	q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, r() * Math.PI * 2));
	q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * tilt * 2, 0, (r() - 0.5) * tilt * 2)));
	return q;
}

const MEAT_TINTS = ['#FFFFFF', '#F4E8DC', '#E6D3C0', '#FFF2E6', '#D8BFA6', '#F0DCC8'].map((c) => new THREE.Color(c));
const SHRED_TINTS = ['#FFFFFF', '#F2F8E2', '#E2F0C6', '#FBFFF0', '#D2E8AE'].map((c) => new THREE.Color(c));

/** Géométries partagées (une seule fois par page). */
let GEO = null;
function geos() {
	if (GEO) return GEO;
	GEO = {
		shaving: [1, 2, 3, 4].map((k) => F.shavingGeometry(k, { L: 0.17 + k * 0.025, W: 0.08 + (k % 2) * 0.02, curl: 1.2 + k * 0.35, twist: 0.5 + k * 0.2 })),
		shred: [1, 2, 3, 4].map((k) => F.shredGeometry(k, { L: 0.24 + k * 0.03, W: 0.04 + (k % 2) * 0.015, curl: 1.6 + k * 0.4, twist: 1.6 + k * 0.5 })),
		dice: [1, 2, 3].map((k) => F.diceGeometry(k, 0.07 + k * 0.006)),
		sliver: [F.sliverGeometry(1, { span: 1.6 }), F.sliverGeometry(2, { R: 0.12, span: 1.9 }), F.sliverGeometry(3, { red: true, span: 1.4 }), F.sliverGeometry(4, { red: true, R: 0.11, span: 2.0 })],
	};
	return GEO;
}

/* ===========================================================================
   Kébab construit sur la planche : galette → viande → salade → sauces → roulé
   ======================================================================== */
/**
 * Repère : origine au dessous de la galette (posée sur la planche), axe du rouleau = X.
 * update({ meat, lettuce, tomato, onion, garlic, chilli, roll }) : chaque valeur de 0 à 1.
 */
export function kebabBuild(mats, { seed = 5, lite = false } = {}) {
	const G = geos();
	const group = new THREE.Group();
	const B = F.wrapBread(mats, { seed, Rx: 1.25, Rz: 1.3, rc: 0.33 });
	const bread = new THREE.Group();
	B.mesh.position.y = B.thick / 2;
	bread.add(B.mesh);
	const r = rng(seed * 3 + 7);
	const y0 = B.thick + 0.004;
	const Lx = B.Rx * 0.8;
	const Wz = (x) => 0.36 * (1 - 0.3 * (x / Lx) ** 2);
	const H1 = 0.15;
	const H2 = 0.36;
	const mound = (x, z, H) => H * Math.max(0, 1 - (z / Wz(x)) ** 2) ** 0.6 * Math.max(0, 1 - (x / Lx) ** 4) ** 0.5;
	const cy = B.thick / 2 + B.rc;
	const rho = B.rc - B.thick / 2 - 0.018;
	/** Pose à plat → pose dans le rouleau (la garniture se resserre en boudin). */
	const squeeze = (p) => {
		const zn = clamp(p.z / Wz(p.x), -1.15, 1.15);
		const yn = clamp((p.y - y0) / H2, 0, 1.2);
		let Z = zn * rho * 0.95;
		let Y = (yn * 2 - 1) * rho * 0.95;
		const d = Math.hypot(Z, Y);
		const m = rho * 0.9;
		if (d > m) {
			Z *= m / d;
			Y *= m / d;
		}
		return new THREE.Vector3(p.x * 0.97, cy + Y, Z);
	};
	const sample = (Ha, Hb, top = 0.5) => {
		const x = (r() * 2 - 1) * Lx * 0.97;
		const z = (r() * 2 - 1) * Wz(x) * 0.92;
		const lo = mound(x, z, Ha);
		const hi = mound(x, z, Hb);
		const f = r() ** top;
		return { p: new THREE.Vector3(x, y0 + lo + (hi - lo) * f, z), f };
	};
	const item = (shape, p, f, { tilt = 0.35, s = 1, color = null } = {}) => ({
		shape,
		p,
		rp: squeeze(p),
		q: poseOn(UP, r, tilt),
		s,
		color,
		delay: 0.65 * (f * 0.55 + r() * 0.45),
		axis: randAxis(r),
		spin: 2 + r() * 4,
	});

	// 02 · Copeaux de döner.
	const meatItems = [];
	for (let i = 0; i < (lite ? 80 : 150); i++) {
		const { p, f } = sample(0, H1, 0.55);
		meatItems.push(item(i, p, f, { s: 0.95 + r() * 0.45, color: MEAT_TINTS[Math.floor(r() * MEAT_TINTS.length)] }));
	}
	const meat = pieces(G.shaving, mats.meat, meatItems, { fall: 2.6 });

	// 03 · Salade : laitue émincée, dés et demi-rondelles de tomate, lamelles d'oignon.
	const lettuceItems = [];
	for (let i = 0; i < (lite ? 60 : 110); i++) {
		const { p, f } = sample(H1 * 0.9, H2 * 0.96, 0.6);
		lettuceItems.push(item(i, p, f, { tilt: 0.6, s: 0.85 + r() * 0.4, color: SHRED_TINTS[Math.floor(r() * SHRED_TINTS.length)] }));
	}
	const lettuce = pieces(G.shred, mats.shred, lettuceItems, { fall: 2.4 });

	const diceItems = [];
	for (let i = 0; i < 22; i++) {
		const { p, f } = sample(H2 * 0.6, H2, 0.4);
		diceItems.push(item(i, p, f, { tilt: 0.8, s: 0.9 + r() * 0.3 }));
	}
	const tomatoDice = pieces(G.dice, mats.glossy, diceItems, { fall: 2.4 });
	const halves = [];
	for (let i = 0; i < 6; i++) {
		const x = ((i + 0.5) / 6 - 0.5) * Lx * 1.6 + (r() - 0.5) * 0.12;
		const z = (r() - 0.5) * 0.18;
		const o = F.tomatoSlice(mats, 0.13 + r() * 0.03, { half: true, seed: i + 3 });
		const p = new THREE.Vector3(x, y0 + mound(x, z, H2) + 0.005, z);
		const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + (r() - 0.5) * 0.5, 0, 0));
		q.premultiply(new THREE.Quaternion().setFromAxisAngle(UP, r() * Math.PI * 2));
		halves.push({ obj: o, p, rp: squeeze(p), q, delay: 0.1 + 0.55 * (i / 6), axis: randAxis(r), spin: 3 });
	}
	const tomatoHalves = solos(halves, { fall: 2.4 });
	const tomato = { group: new THREE.Group(), update: (d, k) => (tomatoDice.update(d, k), tomatoHalves.update(d, k)) };
	tomato.group.add(tomatoDice.group, tomatoHalves.group);

	const onionItems = [];
	for (let i = 0; i < (lite ? 16 : 26); i++) {
		const { p, f } = sample(H2 * 0.75, H2 * 1.02, 0.3);
		const it = item(i, p, f, { tilt: 0.3, s: 0.9 + r() * 0.35 });
		it.q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
		onionItems.push(it);
	}
	const onion = pieces(G.sliver, mats.redOnion, onionItems, { fall: 2.4 });

	// 04 · Sauces : ail (blanche) puis piment (rouge), en zigzag sur toute la longueur.
	const top = (x, z) => y0 + mound(x, z, H2);
	const sauceMorph = (m) => {
		const geo = m.geometry;
		const p = geo.attributes.position;
		const out = new Float32Array(p.count * 3);
		const v = new THREE.Vector3();
		for (let i = 0; i < p.count; i++) {
			v.fromBufferAttribute(p, i);
			const q = squeeze(v);
			out[i * 3] = q.x;
			out[i * 3 + 1] = q.y;
			out[i * 3 + 2] = q.z;
		}
		const tmp = new THREE.BufferGeometry();
		tmp.setIndex(geo.index);
		tmp.setAttribute('position', new THREE.BufferAttribute(out, 3));
		tmp.computeVertexNormals();
		geo.morphAttributes.position = [tmp.attributes.position];
		geo.morphAttributes.normal = [tmp.attributes.normal];
		m.morphTargetInfluences = [0];
		m.frustumCulled = false;
		return m;
	};
	const garlic = sauceMorph(F.drizzle(mats, mats.garlic, { width: Lx * 1.85, depth: 0.5, turns: 6, height: (x, z) => top(x, z) + 0.012, radius: 0.034, seed: seed + 3 }));
	const chilli = sauceMorph(F.drizzle(mats, mats.chilli, { width: Lx * 1.7, depth: 0.3, turns: 11, height: (x, z) => top(x, z) + 0.04, radius: 0.016, seed: seed + 4 }));

	// 05 · Pic à drapeau planté dans le kébab roulé.
	const fp = F.flagPick(mats, 1.75);
	const pick = fp.group;
	pick.position.set(0.22, cy - 0.08, 0.02);
	pick.rotation.z = -0.06;

	const filling = new THREE.Group();
	filling.add(meat.group, lettuce.group, tomato.group, onion.group, garlic, chilli);
	group.add(bread, filling, pick);

	const update = (st) => {
		const k = clamp(st.roll ?? 0);
		const e = easeInOut(k);
		// La garniture se resserre un peu avant que les bords de la galette ne se referment.
		const fe = easeInOut(clamp(k / 0.75));
		B.setRoll(e);
		meat.update(st.meat ?? 1, fe);
		lettuce.update(st.lettuce ?? 1, fe);
		tomato.update(st.tomato ?? 1, fe);
		onion.update(st.onion ?? 1, fe);
		garlic.userData.reveal(st.garlic ?? 1);
		chilli.userData.reveal(st.chilli ?? 1);
		garlic.morphTargetInfluences[0] = fe;
		chilli.morphTargetInfluences[0] = fe;
	};
	return { group, parts: { bread, meat: meat.group, lettuce: lettuce.group, tomato: tomato.group, onion: onion.group, garlic, chilli, pick }, wave: fp.wave, update, cy, rc: B.rc };
}

/* ===========================================================================
   Kébab roulé, à moitié emballé dans l'aluminium (hero, pluie)
   ======================================================================== */
/**
 * Repère : axe du rouleau = X, bout ouvert (garniture qui déborde) vers +X, fond dans
 * l'aluminium vers -X. Le centre du rouleau est à y = cy (renvoyé).
 */
export function kebabWrap(mats, { seed = 33, flag = false, lite = false, foil = true, pickLength = 1.55 } = {}) {
	const G = geos();
	const group = new THREE.Group();
	const Rx = 1.0;
	const rc = 0.4;
	const B = F.wrapBread(mats, { seed, Rx, Rz: 1.62, rc, bake: 1, NU: lite ? 60 : 92, NV: lite ? 32 : 50 });
	B.mesh.position.y = B.thick / 2;
	group.add(B.mesh);
	const cy = B.thick / 2 + rc;
	const rho = rc - B.thick / 2 - 0.014;
	const r = rng(seed * 5 + 1);
	const xEnd = Rx * 0.9;
	const domeX = (rn, a) => xEnd + 0.3 * Math.max(0, 1 - rn * rn) ** 0.65 + 0.05 * noise3(Math.cos(a) * 2 + seed, Math.sin(a) * 2, rn * 2);
	/** Point de garniture : sur le dôme du bout ouvert, ou dans la gouttière ouverte (+Y). */
	const spot = (gutter) => {
		if (!gutter) {
			const rn = Math.sqrt(r()) * 0.98;
			const a = r() * Math.PI * 2;
			const Y = Math.cos(a) * rn * rho;
			const Z = Math.sin(a) * rn * rho;
			const x = domeX(rn, a) - r() * 0.07;
			const n = new THREE.Vector3(1, (Y / rho) * 1.1 * rn, (Z / rho) * 1.1 * rn).normalize();
			return { p: new THREE.Vector3(x, cy + Y, Z), n };
		}
		const x = xEnd - r() * 0.5;
		const a = (r() - 0.5) * 2.0;
		const rn = 0.55 + r() * 0.4;
		const Y = Math.cos(a) * rn * rho;
		const Z = Math.sin(a) * rn * rho;
		return { p: new THREE.Vector3(x, cy + Y, Z), n: new THREE.Vector3(0.25, Math.cos(a), Math.sin(a)).normalize() };
	};
	const layer = (geosList, mat, count, { tilt = 0.45, sMin = 0.9, sMax = 1.3, tints = null, gutter = 0.35, flatten = false } = {}) => {
		const items = [];
		for (let i = 0; i < count; i++) {
			const { p, n } = spot(r() < gutter);
			const q = poseOn(n, r, tilt);
			if (flatten) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
			items.push({ shape: i, p, q, s: sMin + r() * (sMax - sMin), color: tints ? tints[Math.floor(r() * tints.length)] : null, delay: 0, axis: UP, spin: 0 });
		}
		return pieces(geosList, mat, items).group;
	};
	group.add(layer(G.shaving, mats.meat, lite ? 40 : 90, { tints: MEAT_TINTS, sMin: 1.1, sMax: 1.7 }));
	group.add(layer(G.shred, mats.shred, lite ? 36 : 80, { tilt: 1.1, tints: SHRED_TINTS, gutter: 0.3, sMin: 1.0, sMax: 1.5 }));
	group.add(layer(G.dice, mats.glossy, lite ? 8 : 18, { tilt: 0.9, gutter: 0.4, sMin: 1.1, sMax: 1.4 }));
	group.add(layer(G.sliver, mats.redOnion, lite ? 10 : 20, { tilt: 0.5, flatten: true, gutter: 0.4, sMin: 1.1, sMax: 1.4 }));

	// Demi-rondelles de tomate et feuille de laitue qui dépassent du bout ouvert.
	// Les pièces qui dépassent du bout ouvert : demi-rondelles de tomate (posées sur la
	// tranche, vers l'extérieur) et feuilles de laitue froissées qui débordent du bord.
	const tomatoes = lite ? 2 : 3;
	for (let i = 0; i < tomatoes; i++) {
		const t = F.tomatoSlice(mats, 0.2, { half: true, seed: seed + i });
		const a = 0.6 + (i / tomatoes) * Math.PI * 2;
		const rn = 0.5;
		const Y = Math.cos(a) * rn * rho;
		const Z = Math.sin(a) * rn * rho;
		// Bord droit de la demi-rondelle vers le centre, arrondi vers l'extérieur et le haut.
		t.position.set(domeX(rn, a) - 0.12, cy + Y, Z);
		t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.7, Math.cos(a), Math.sin(a)).normalize());
		t.rotateY(Math.PI / 2);
		group.add(t);
	}
	const leaves = lite ? 2 : 3;
	for (let i = 0; i < leaves; i++) {
		const l = F.lettuceLeaf(mats, { size: 0.5, seed: seed + i * 3, cup: 0.32 });
		const a = -1.4 + (i / leaves) * Math.PI * 2;
		l.position.set(xEnd - 0.22, cy + Math.cos(a) * rho * 0.75, Math.sin(a) * rho * 0.75);
		// Base de la feuille dans le kébab, pointe qui sort en s'écartant.
		l.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, Math.cos(a) * 0.55, Math.sin(a) * 0.55).normalize());
		l.rotateY(a + Math.PI / 2);
		group.add(l);
	}

	// Sauces : spirale d'ail sur le dôme et coulure dans la gouttière, zigzag de piment.
	const gpts = [];
	for (let i = 0; i <= 26; i++) {
		const t = i / 26;
		const a = t * Math.PI * 3.4 + seed;
		const rn = 0.86 * (1 - t * 0.85);
		const Y = Math.cos(a) * rn * rho;
		const Z = Math.sin(a) * rn * rho;
		gpts.unshift(new THREE.Vector3(domeX(rn, a) + 0.045, cy + Y, Z));
	}
	const last = gpts[gpts.length - 1];
	gpts.push(new THREE.Vector3(xEnd - 0.04, cy + rho * 0.95, last.z * 0.5), new THREE.Vector3(xEnd - 0.25, cy + rho * 1.0, 0.03), new THREE.Vector3(xEnd - 0.42, cy + rho * 0.98, 0.05));
	group.add(F.sauceTube(mats.garlic, gpts, { radius: 0.03, seed: seed + 2, SEG: lite ? 120 : 200, RAD: lite ? 8 : 10 }));
	const cpts = [];
	for (let i = 0; i <= 7; i++) {
		const t = i / 7;
		const Z = (t - 0.5) * rho * 1.5;
		const Y = (i % 2 ? 0.6 : -0.6) * rho * (0.8 + r() * 0.2);
		const rn = Math.min(0.95, Math.hypot(Y, Z) / rho);
		cpts.push(new THREE.Vector3(domeX(rn, Math.atan2(Z, Y)) + 0.07, cy + Y, Z));
	}
	group.add(F.sauceTube(mats.chilli, cpts, { radius: 0.021, seed: seed + 5, SEG: lite ? 90 : 160, RAD: 8 }));

	if (foil) group.add(F.foilWrap(mats, { r: rc + B.thick * 2.6 + 0.03, x0: -Rx - 0.03, x1: -0.08, cy, seed, NU: lite ? 90 : 132, NV: lite ? 32 : 46 }));

	let wave = null;
	if (flag) {
		const fp = F.flagPick(mats, pickLength);
		fp.group.rotation.z = -Math.PI / 2;
		fp.group.position.set(xEnd - 0.3, cy + 0.03, 0.03);
		group.add(fp.group);
		wave = fp.wave;
	}
	return { group, wave, cy, Rx, xEnd };
}

/* ===========================================================================
   Açaí bowl : le bol se garnit (fruits, granola), sauce, copeaux, cuillère
   ======================================================================== */
/**
 * Retourne { group, cubes, topping, extras, forks, dust } (mêmes rôles que l'ancienne
 * cazuela) : `cubes` tombent dans le bol, `topping` est un filet de sauce qui se dépose
 * (userData.reveal), `extras` apparaissent, `forks` contient la cuillère.
 */
export function acaiBowl(mats, { seed = 41 } = {}) {
	const group = new THREE.Group();
	// Bol légèrement incliné vers la caméra : on lit les rangées de garniture.
	group.rotation.x = 0.2;
	group.add(F.bowl(mats));
	const fill = F.acaiFill(mats, { R: 1.04, base: 0.6, seed });
	group.add(fill.mesh);
	const H = fill.H;
	const r = rng(seed);
	const cubes = [];
	const drop = (o, x, z, lift, rot) => {
		o.position.set(x, H(x, z) + lift, z);
		o.rotation.set(...rot);
		o.userData.rest = o.position.clone();
		o.userData.restRot = o.rotation.clone();
		cubes.push(o);
		group.add(o);
	};
	// Garniture en rangées, comme les bols du comptoir : fraises | banane | granola,
	// myrtilles devant. Les rangées sont parallèles à l'axe Z (vues de face par la caméra).
	const row = (x0, n, span, fn) => {
		for (let i = 0; i < n; i++) {
			const t = n > 1 ? i / (n - 1) - 0.5 : 0;
			const z = t * span;
			const lim = Math.sqrt(Math.max(0, 0.9 ** 2 - z * z));
			fn(Math.max(-lim, Math.min(lim, x0)), z, i);
		}
	};
	row(-0.58, 6, 1.2, (x, z, i) => {
		const o = F.strawberryHalf(mats, { H: 0.34, R: 0.145, seed: i + 2, calyx: i % 3 === 1 });
		drop(o, x + (r() - 0.5) * 0.06, z, 0.06, [0, 0, 0]);
		// Face coupée vers le haut et vers l'extérieur, pointe vers le centre du bol.
		o.rotation.set(-Math.PI / 2 + 0.35, 0, -Math.PI / 2 + (r() - 0.5) * 0.3);
		o.userData.restRot = o.rotation.clone();
	});
	// Rondelles de banane qui se chevauchent comme des tuiles.
	row(-0.16, 8, 1.5, (x, z, i) => {
		const o = F.bananaCoin(mats, { r: 0.17 + r() * 0.012, seed: i + 1 });
		drop(o, x, z, 0.045 + i * 0.004, [-0.32, r() * 0.4, (r() - 0.5) * 0.16]);
	});
	row(0.25, 10, 1.45, (x, z, i) => {
		drop(F.granola(mats, { r: 0.13 + r() * 0.04, seed: i + 1 }), x + (r() - 0.5) * 0.2, z + (r() - 0.5) * 0.08, 0.06, [r() * 0.4, r() * 6, r() * 0.4]);
	});
	for (let i = 0; i < 12; i++) {
		const x = 0.55 + r() * 0.28;
		const z = (r() - 0.5) * 0.9;
		drop(F.blueberry(mats, { r: 0.068 + r() * 0.012, seed: i }), x, z, 0.055, [r() * 0.5, r() * 6, 0]);
	}
	// Filet de beurre de cacahuète, copeaux de coco, menthe, graines de chia.
	const topping = F.drizzle(mats, mats.honey, { width: 1.3, depth: 1.0, turns: 4, height: (x, z) => H(x, z) + 0.17, radius: 0.024, seed: seed + 2 });
	topping.userData.baseY = 0;
	group.add(topping);
	const extras = [];
	const put = (o, x, z, lift, rot) => {
		o.position.set(x, H(x, z) + lift, z);
		o.rotation.set(...rot);
		extras.push(o);
		group.add(o);
	};
	put(F.mintLeaf(mats, { size: 0.2, seed: 1 }), 0.06, 0.08, 0.16, [-1.2, 0.4, 0.3]);
	put(F.mintLeaf(mats, { size: 0.17, seed: 2 }), 0.14, 0.02, 0.15, [-1.35, 2.2, -0.2]);
	for (let i = 0; i < 6; i++) {
		const a = r() * Math.PI * 2;
		const rad = 0.2 + r() * 0.55;
		put(F.coconutFlake(mats, { seed: i }), Math.cos(a) * rad, Math.sin(a) * rad, 0.12, [r() * 0.6, r() * 6, r() * 0.6]);
	}
	const dust = F.sprinkle(F.chiaGeo(), mats.pepper, 80, (x, z) => H(x, z) + 0.09, { rx: 0.85, rz: 0.85, seed: seed + 5 });
	dust.visible = false;
	group.add(dust);
	// Cuillère plantée dans l'açaí, manche appuyé sur le bord (origine du groupe à y = 1.05,
	// hauteur de repos attendue par la scène).
	const spoonG = new THREE.Group();
	const spoon = F.woodSpoon(mats);
	spoon.position.set(0.0, -0.26, 0.0);
	spoon.rotation.set(-0.3, 0.75, 0.05);
	spoonG.add(spoon);
	spoonG.position.set(0.45, 1.05, -0.42);
	group.add(spoonG);
	return { group, cubes, topping, extras, forks: [spoonG], dust };
}

/* ===========================================================================
   Petites portions pour la pluie
   ======================================================================== */
/** Kébab roulé (pluie) centré sur son origine. userData.rad = rayon de collision. */
export function miniKebab(mats, { seed = 61 } = {}) {
	const k = kebabWrap(mats, { seed, lite: true });
	k.group.position.set(-0.08, -k.cy, 0);
	const g = new THREE.Group();
	g.add(k.group);
	g.userData.rad = 1.0;
	g.userData.long = true;
	return g;
}

/** Boule de falafel (pluie). */
export function falafelBall(mats, { seed = 3 } = {}) {
	const g = new THREE.Group();
	g.add(F.falafel(mats, { r: 0.42, seed, sesame: 22, detail: 9 }));
	g.userData.rad = 0.46;
	return g;
}

/** Poignée de frites croisées (pluie). */
export function chips(mats, { seed = 7 } = {}) {
	const g = new THREE.Group();
	const r = rng(seed);
	for (let i = 0; i < 6; i++) {
		const f = F.fry(mats, { L: 1.05 + r() * 0.35, a: 0.11, seed: seed + i, bend: 0.06 });
		f.position.set((r() - 0.5) * 0.35, (i % 3) * 0.13 - 0.13, (r() - 0.5) * 0.35);
		f.rotation.set((r() - 0.5) * 0.5, r() * Math.PI, (r() - 0.5) * 0.7);
		g.add(f);
	}
	g.userData.rad = 0.72;
	return g;
}

/* ===========================================================================
   Ingrédients flottants (hero)
   ======================================================================== */
export function floatingIngredients(mats) {
	const items = [];
	const add = (m, s = 1) => {
		m.scale.multiplyScalar(s);
		items.push(m);
	};
	add(F.olive(mats, { seed: 2 }), 1.1);
	add(F.olive(mats, { green: true, seed: 3 }), 1.1);
	add(F.redOnion(mats, Math.PI * 1.35, 0.32, { layers: 2, seed: 4 }));
	add(F.redOnion(mats, Math.PI * 2, 0.24, { seed: 6 }));
	add(F.jalapeno(mats, { seed: 2 }), 1.15);
	add(F.pickle(mats, 51));
	add(F.lemonSlice(mats, 0.3));
	add(F.cheeseWedge(mats, 0.4, 1), 1.4);
	add(F.tomatoSlice(mats, 0.3, { seed: 4 }));
	add(F.lettuceLeaf(mats, { size: 0.62, seed: 5 }));
	add(F.falafel(mats, { r: 0.2, seed: 6 }), 1.1);
	add(F.falafel(mats, { r: 0.17, seed: 9 }), 1.1);
	add(F.fry(mats, { seed: 1, L: 0.66 }));
	add(F.fry(mats, { seed: 2, L: 0.56 }));
	add(F.donerCurl(mats, { seed: 5 }));
	add(F.feta(mats, { size: 0.22, seed: 1 }), 1.1);
	return items;
}

