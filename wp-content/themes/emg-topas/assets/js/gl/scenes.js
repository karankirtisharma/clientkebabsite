/**
 * Les quatre scènes 3D de la page (Lazeez Kebabs & Açaí). Chacune expose :
 *   { scene, camera, update(dt, t, w, h), pointer?(x, y, w, h) }
 * Les valeurs de scroll arrivent par l'objet partagé `state` (écrit par GSAP).
 */
import * as THREE from 'three';
import * as F from 'emg-topas/gl/food';
import * as D from 'emg-topas/gl/dishes';
import { clamp, lerp, range, rng } from 'emg-topas/gl/noise';

const easeOutBack = (t, s = 1.7) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutBounce = (x) => {
	const n1 = 7.5625;
	const d1 = 2.75;
	if (x < 1 / d1) return n1 * x * x;
	if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
	if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
	return n1 * (x -= 2.625 / d1) * x + 0.984375;
};

function lights(scene, env, { key = '#FFE0B5', keyI = 2.6, rim = '#FFF6EA', rimI = 2.2, bounce = '#6E1016', envI = 0.6, shadow = 0, mapSize = 1024, keyPos = [3.5, 6, 5] } = {}) {
	scene.environment = env;
	scene.environmentIntensity = envI;
	const k = new THREE.DirectionalLight(key, keyI);
	k.position.set(...keyPos);
	k.userData.dir = keyPos;
	// Ombre portée douce, cadrée serré autour du plat (une seule carte, lumière principale).
	if (shadow) {
		k.castShadow = true;
		const c = k.shadow.camera;
		c.left = c.bottom = -shadow;
		c.right = c.top = shadow;
		c.near = 2;
		c.far = 20;
		k.shadow.mapSize.set(mapSize, mapSize);
		k.shadow.bias = -0.0004;
		k.shadow.normalBias = 0.018;
		k.shadow.radius = 3;
		scene.add(k.target);
	}
	const r = new THREE.DirectionalLight(rim, rimI);
	r.position.set(-5, 3.5, -4);
	const f = new THREE.HemisphereLight('#FFF2E0', bounce, 0.55);
	const front = new THREE.DirectionalLight('#FFE9D2', 0.7);
	front.position.set(0, 1.5, 8);
	scene.add(k, r, f, front);
	return k;
}

/** Tous les maillages projettent et reçoivent l'ombre, sauf les ombres de contact et effets. */
function shadows(root, on = true) {
	root.traverse((o) => {
		if (!o.isMesh) return;
		const fx = o.material.isMeshBasicMaterial;
		o.castShadow = on && !fx;
		o.receiveShadow = on && !fx;
	});
}

/** Place la lumière principale (direction fixe) au-dessus du point visé. */
function aim(k, x, y, z) {
	k.target.position.set(x, y, z);
	const [dx, dy, dz] = k.userData.dir;
	k.position.set(x + dx, y + dy, z + dz);
}

/** Décale le cadrage horizontalement (fraction de largeur, + = objet vers la droite). */
function frame(camera, w, h, shift = 0, lift = 0) {
	camera.aspect = w / h;
	if (shift || lift) {
		const fw = w * (1 + 2 * Math.abs(shift));
		const fh = h * (1 + 2 * Math.abs(lift));
		camera.setViewOffset(fw, fh, shift > 0 ? 0 : fw - w, lift > 0 ? fh - h : 0, w, h);
	} else {
		camera.clearViewOffset();
	}
	camera.updateProjectionMatrix();
}

/* ===========================================================================
   HERO — kébab roulé dans l'aluminium, drapeau LAZEEZ + ingrédients en orbite
   ======================================================================== */
export function hero(kit, state) {
	const { mats } = kit;
	const scene = new THREE.Scene();
	const key = lights(scene, kit.env, { keyI: 3, envI: 0.55, keyPos: [4.6, 6.2, 2.8], shadow: 2.6, mapSize: kit.mobile ? 768 : 1024 });
	const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

	const spin = new THREE.Group();
	// Kébab debout : l'axe du rouleau (X) devient vertical, bout ouvert en haut.
	const p = D.kebabWrap(mats, { flag: true, seed: 33, pickLength: 1.35 });
	p.group.rotation.z = Math.PI / 2;
	p.group.position.x = p.cy;
	const stand = new THREE.Group();
	stand.add(p.group);
	stand.position.y = -0.5;
	stand.rotation.z = -0.07;
	stand.scale.setScalar(1.12);
	spin.add(stand);
	scene.add(spin);

	const shadow = F.contactShadow(mats, 2.6, 2.2);
	shadow.position.y = -2.05;
	scene.add(shadow);

	const r = rng(77);
	const box = new THREE.Box3();
	const sphere = new THREE.Sphere();
	const orbit = D.floatingIngredients(mats).map((m, i, all) => {
		const g = new THREE.Group();
		g.add(m);
		scene.add(g);
		box.setFromObject(m).getBoundingSphere(sphere);
		const a = (i / all.length) * Math.PI * 2 + r() * 0.3;
		return {
			g,
			a,
			rad: 2.7 + r() * 1.3,
			y: -1.3 + r() * 3,
			sp: (0.08 + r() * 0.1) * (r() < 0.5 ? -1 : 1),
			ph: r() * 6,
			rot: new THREE.Vector3((r() - 0.5) * 1.6, (r() - 0.5) * 1.6, (r() - 0.5) * 1.6),
			s: 0.9 + r() * 0.5,
			r0: sphere.radius * 0.82,
			off: new THREE.Vector3(),
			vel: new THREE.Vector3(),
			pos: new THREE.Vector3(),
			cr: 0,
		};
	}).map((o) => {
		o.rot0 = o.rot.clone();
		return o;
	});
	shadows(scene);

	// Collisions : les ingrédients se repoussent entre eux, rebondissent sur le kébab
	// et son drapeau, et la souris peut les bousculer.
	const tmp = new THREE.Vector3();
	const ray = new THREE.Raycaster();
	const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
	const mouse = new THREE.Vector3(99, 99, 0);
	const ndc = new THREE.Vector2();
	const solids = [
		{ c: new THREE.Vector3(), r: 0 },
		{ c: new THREE.Vector3(), r: 0 },
		{ c: new THREE.Vector3(), r: 0 },
	];
	const push = (o, nx, ny, nz, depth, strength) => {
		o.off.x += nx * depth;
		o.off.y += ny * depth;
		o.off.z += nz * depth;
		o.vel.x += nx * depth * strength;
		o.vel.y += ny * depth * strength;
		o.vel.z += nz * depth * strength;
		o.rot.x += (Math.random() - 0.5) * depth * 8;
		o.rot.z += (Math.random() - 0.5) * depth * 8;
	};

	const sm = { x: 0, y: 0 };
	return {
		scene,
		camera,
		update(dt, t, w, h) {
			const s = state.hero;
			const asp = w / h;
			const portrait = asp < 0.85;
			sm.x += (s.mx - sm.x) * Math.min(1, dt * 3);
			sm.y += (s.my - sm.y) * Math.min(1, dt * 3);
			const enter = easeOutBack(clamp(s.enter), 1.4);
			const exit = s.p;

			camera.position.set(sm.x * 0.6, 0.5 - sm.y * 0.3, portrait ? 13.5 : 10);
			// Portrait : le kébab descend sous le logo au lieu de le masquer.
			camera.lookAt(0, portrait ? 0.86 : 0.25, 0);
			frame(camera, w, h, 0, 0);

			const base = portrait ? 0.8 : 1.05;
			spin.scale.setScalar(Math.max(0.001, base * enter * (1 + exit * 0.5)));
			spin.rotation.y = t * 0.42 + sm.x * 0.7 + (1 - enter) * 4 + exit * 2.4;
			spin.rotation.x = 0.14 + sm.y * 0.15 - exit * 0.4;
			spin.rotation.z = Math.sin(t * 0.7) * 0.05;
			spin.position.y = Math.sin(t * 1.25) * 0.09 + exit * 3.2;
			if (p.wave) p.wave(t, 1);
			aim(key, 0, spin.position.y + 0.4, 0);

			shadow.material.opacity = clamp(enter) * (1 - exit) * (0.8 - Math.sin(t * 1.25) * 0.15);
			shadow.scale.setScalar(base * (1 + Math.sin(t * 1.25) * 0.05));

			// Obstacles : le kébab (bas dans l'aluminium, haut garni) et le drapeau.
			const ps = spin.scale.x;
			solids[0].c.set(0, spin.position.y - 1.1 * ps, 0);
			solids[0].r = 0.64 * ps;
			solids[1].c.set(0, spin.position.y + 0.12 * ps, 0);
			solids[1].r = 0.68 * ps;
			solids[2].c.set(0.56 * ps, spin.position.y + 1.5 * ps, 0);
			solids[2].r = 0.55 * ps;

			// Souris → point sur le plan z = 0.
			ndc.set(s.mx, -s.my);
			ray.setFromCamera(ndc, camera);
			if (!ray.ray.intersectPlane(plane, mouse)) mouse.set(99, 99, 0);

			const k = clamp(enter * 1.2 - 0.1);
			const scl = portrait ? 0.8 : 1;
			const damp = Math.exp(-dt * 3.2);
			const home = Math.exp(-dt * 0.9);
			for (const o of orbit) {
				const a = o.a + t * o.sp;
				const rad = o.rad * (portrait ? 0.62 : 1) * (0.4 + 0.6 * k) * (1 + exit * 1.6);
				o.vel.multiplyScalar(damp);
				o.off.addScaledVector(o.vel, dt).multiplyScalar(home);
				o.pos.set(Math.cos(a) * rad, (o.y + Math.sin(t * 0.9 + o.ph) * 0.18) * (portrait ? 1.35 : 1) + exit * 2, Math.sin(a) * rad * 0.55 - 0.4).add(o.off);
				o.cr = o.r0 * o.s * k * scl;
			}
			if (k > 0.2 && exit < 0.6) {
				for (let pass = 0; pass < 2; pass++) {
					for (let i = 0; i < orbit.length; i++) {
						const A = orbit[i];
						for (let j = i + 1; j < orbit.length; j++) {
							const B = orbit[j];
							tmp.subVectors(A.pos, B.pos);
							const d = tmp.length();
							const min = A.cr + B.cr;
							if (d < min && d > 1e-4) {
								tmp.divideScalar(d);
								const depth = (min - d) * 0.5;
								push(A, tmp.x, tmp.y, tmp.z, depth, 7);
								push(B, -tmp.x, -tmp.y, -tmp.z, depth, 7);
								A.pos.addScaledVector(tmp, depth);
								B.pos.addScaledVector(tmp, -depth);
							}
						}
						for (const so of solids) {
							tmp.subVectors(A.pos, so.c);
							const d = tmp.length();
							const min = A.cr + so.r;
							if (d < min && d > 1e-4) {
								tmp.divideScalar(d);
								push(A, tmp.x, tmp.y, tmp.z, min - d, 9);
								A.pos.addScaledVector(tmp, min - d);
							}
						}
						if (pass === 0) {
							tmp.subVectors(A.pos, mouse);
							tmp.z = 0;
							const d = tmp.length();
							const min = A.cr + 0.55;
							if (d < min && d > 1e-4) {
								tmp.divideScalar(d);
								push(A, tmp.x, tmp.y, 0, (min - d) * 0.6, 14);
							}
						}
					}
				}
			}
			for (const o of orbit) {
				o.g.position.copy(o.pos);
				o.g.rotation.x += o.rot.x * dt;
				o.g.rotation.y += o.rot.y * dt;
				o.g.rotation.z += o.rot.z * dt;
				o.rot.lerp(o.rot0, 1 - Math.exp(-dt * 0.6));
				o.g.scale.setScalar(Math.max(0.001, o.s * k * scl));
			}
		},
	};
}

/* ===========================================================================
   BUILD — le kébab s'assemble couche par couche et se roule, puis l'açaí bowl se garnit
   ======================================================================== */
export function build(kit, state) {
	const { mats } = kit;
	const scene = new THREE.Scene();
	const key = lights(scene, kit.env, { bounce: '#3A1846', keyI: 3.2, envI: 0.55, keyPos: [4.6, 6.2, 2.8], shadow: 2.7, mapSize: kit.mobile ? 768 : 1024 });
	const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

	const board = F.slateBoard(mats, 4.6, 2.5);
	board.position.y = -0.355; // dessus de l'ardoise = dessous de la galette (-0.31)
	const boardShadow = F.contactShadow(mats, 5.9, 3.4);
	boardShadow.position.y = -0.405;
	scene.add(boardShadow, board);

	const turn = new THREE.Group();
	scene.add(turn);
	const kb = D.kebabBuild(mats, { seed: 5, lite: kit.mobile });
	kb.group.position.y = -0.31;
	turn.add(kb.group);
	const parts = kb.parts;
	for (const o of [parts.bread, parts.pick]) {
		o.userData.rest = o.position.clone();
		o.userData.restRot = o.rotation.clone();
	}
	const burst = F.sparks(mats, 10);
	burst.position.set(0.62, 1.42, 0.3);
	scene.add(burst);

	// Açaí bowl à droite.
	const caz = D.acaiBowl(mats, { seed: 43 });
	caz.group.position.set(5.2, -0.46, 0);
	caz.group.scale.setScalar(1.15);
	const cazShadow = F.contactShadow(mats, 3.6, 3.2);
	cazShadow.position.set(5.2, -0.47, 0);
	scene.add(cazShadow, caz.group);
	const r = rng(9);
	caz.cubes.forEach((c, i) => {
		c.userData.delay = i / caz.cubes.length;
		c.userData.spin = new THREE.Vector3(r() * 6, r() * 6, r() * 6);
	});

	// Miettes et farine tombées de la galette sur l'ardoise (apparaissent à l'impact).
	const bits = F.crumbs(mats, kit.mobile ? 22 : 34);
	bits.position.y = -0.31;
	scene.add(bits);
	shadows(scene);

	// Chute avec rebonds : la rotation est terminée avant le premier contact
	// (t ≈ 0.36 avec easeOutBounce), sinon la tranche penchée traverse l'ardoise.
	const drop = (o, t, height = 4.5) => {
		o.visible = t > 0;
		const e = easeOutBounce(clamp(t));
		o.position.copy(o.userData.rest);
		o.position.y += (1 - e) * height;
		const k = 1 - easeOutCubic(clamp(t / 0.34));
		o.rotation.set(o.userData.restRot.x + k * 1.8, o.userData.restRot.y + k * 2.4, o.userData.restRot.z + k * 0.8);
	};

	return {
		scene,
		camera,
		update(dt, t, w, h) {
			const P = state.build.p;
			const portrait = w / h < 0.85;

			drop(parts.bread, range(P, 0.02, 0.15), 5);
			bits.visible = range(P, 0.02, 0.15) > 0.36;
			// 02 la viande, 03 la salade, 04 les sauces, 05 on roule.
			kb.update({
				meat: range(P, 0.14, 0.31),
				lettuce: range(P, 0.36, 0.435),
				tomato: range(P, 0.385, 0.455),
				onion: range(P, 0.405, 0.47),
				garlic: range(P, 0.46, 0.52),
				chilli: range(P, 0.505, 0.565),
				roll: range(P, 0.57, 0.625),
			});

			// Le pic à drapeau tombe tout droit et se plante dans le kébab roulé.
			const pk = range(P, 0.6, 0.66);
			parts.pick.visible = pk > 0;
			parts.pick.position.copy(parts.pick.userData.rest);
			parts.pick.position.y += (1 - easeOutCubic(pk) ** 2) * 5;
			parts.pick.rotation.z = parts.pick.userData.restRot.z + Math.sin(range(P, 0.66, 0.72) * Math.PI * 3) * 0.06 * (1 - range(P, 0.66, 0.72));
			if (pk > 0) kb.wave(t, 0.8);
			burst.userData.play(range(P, 0.655, 0.73), 0.75);

			// Vitrine : le kébab tourne.
			const show = range(P, 0.66, 0.84);
			turn.rotation.y = easeInOut(show) * Math.PI * 2 + Math.sin(t * 0.6) * 0.06;

			// Fruits et granola qui tombent dans le bol.
			const rain = range(P, 0.82, 0.95);
			for (const c of caz.cubes) {
				const k = clamp((rain - c.userData.delay * 0.7) / 0.3);
				c.visible = k > 0;
				c.position.copy(c.userData.rest);
				c.position.y += (1 - easeOutBounce(k)) * 4;
				c.rotation.set(c.userData.restRot.x + (1 - k) * c.userData.spin.x, c.userData.restRot.y + (1 - k) * c.userData.spin.y, c.userData.restRot.z);
			}
			// Filet de beurre de cacahuète versé en zigzag, puis graines de chia.
			const melt = range(P, 0.92, 1);
			caz.topping.userData.reveal(easeInOut(melt));
			if (caz.dust) caz.dust.visible = melt > 0.85;
			caz.extras.forEach((e, i) => {
				const k = range(P, 0.95 + i * 0.008, 0.99);
				e.visible = k > 0;
				e.scale.setScalar(Math.max(0.001, easeOutBack(k) * (e.userData.s ??= e.scale.x)));
			});
			caz.forks.forEach((f, i) => {
				const k = range(P, 0.96 + i * 0.015, 1);
				f.visible = k > 0;
				f.position.y = 1.05 + (1 - easeOutBounce(k)) * 3;
			});

			// Caméra : plongée douce sur le kébab, puis travelling vers l'açaí bowl.
			const pan = easeInOut(range(P, 0.8, 0.9));
			const zoom = easeInOut(range(P, 0.62, 0.72)) * (1 - pan);
			const cx = lerp(0, 5.2, pan);
			// The kebab (tall flag pick) and its board slide out to the left during the pan,
			// otherwise the flag ends up over the "A kebab, built simple." headline.
			const slide = -3 * pan;
			board.position.x = boardShadow.position.x = turn.position.x = bits.position.x = slide;
			burst.position.x = 0.62 + slide;
			// Portrait : on recule nettement pour que la galette tienne dans l'écran.
			const dist = (portrait ? 16.5 : 8.2) - zoom * (portrait ? 2 : 1.4) + pan * 0.4;
			camera.position.set(cx + Math.sin(t * 0.3) * 0.15, 2.4 - zoom * 0.6, dist);
			camera.lookAt(cx, portrait ? 0.9 : 0.55, 0);
			frame(camera, w, h, portrait ? 0 : 0.11, 0);
			aim(key, cx, 0.4, 0);
		},
	};
}

/* ===========================================================================
   DRINKS — canette Lazeez et gobelet d'açaí qui trinquent
   ======================================================================== */
export function drinks(kit, state) {
	const { mats } = kit;
	const scene = new THREE.Scene();
	lights(scene, kit.env, { keyI: 2.4, rimI: 3 });
	const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
	const beer = F.sodaCan(mats);
	const wine = F.acaiCup(mats);
	const bg = new THREE.Group();
	const wg = new THREE.Group();
	bg.add(beer.group);
	wg.add(wine.group);
	beer.group.position.y = -0.9;
	wine.group.position.y = -0.9;
	scene.add(bg, wg);
	const burst = F.sparks(mats, 9);
	scene.add(burst);
	let clinkAt = -10;
	let was = false;

	return {
		scene,
		camera,
		update(dt, t, w, h) {
			const P = state.drinks.p;
			const portrait = w / h < 0.85;
			const a = easeInOut(range(P, 0.05, 0.6));
			const touching = a > 0.995;
			if (touching && !was) clinkAt = t;
			was = touching;
			const since = t - clinkAt;
			const recoil = since < 1.2 ? Math.sin(since * 9) * Math.exp(-since * 4) * 0.12 : 0;

			bg.position.set(lerp(-4.2, -0.66, a) - recoil, Math.sin(t * 1.1) * 0.05, 0);
			wg.position.set(lerp(4.2, 0.68, a) + recoil, Math.sin(t * 1.1 + 1) * 0.05 + 0.02, 0.1);
			bg.rotation.z = lerp(0.25, -0.2, a) + Math.sin(t * 0.8) * 0.02;
			wg.rotation.z = lerp(-0.25, 0.24, a) + Math.sin(t * 0.8 + 2) * 0.02;
			bg.rotation.y = 0.5 + Math.sin(t * 0.4) * 0.1;
			wg.rotation.y = -0.3;
			beer.update(t);
			wine.settle();

			burst.position.set(0.02, 1.0, 0.4);
			burst.userData.play(clamp(since / 0.6), 0.9);

			camera.position.set(0, 0.7, portrait ? 10 : 8.2);
			camera.lookAt(0, 0.35, 0);
			frame(camera, w, h);
		},
	};
}

/* ===========================================================================
   RAIN — pluie de kébabs, falafels et frites qui s'empilent (et qu'on peut bousculer)
   ======================================================================== */
export function rain(kit, state) {
	const { mats } = kit;
	const scene = new THREE.Scene();
	lights(scene, kit.env);
	const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
	camera.position.set(0, 0, 16);
	camera.lookAt(0, 0, 0);

	const mobile = matchMedia('(max-width: 760px)').matches;
	const N = mobile ? 7 : 18;
	// Mobile : deux calques (derrière / devant ¡VAAAAMOS!), lumières sur les deux.
	const split = mobile;
	scene.traverse((o) => o.isLight && o.layers.enableAll());
	const makers = [
		() => D.miniKebab(mats, { seed: 61 }),
		() => D.falafelBall(mats, { seed: 62 }),
		() => D.miniKebab(mats, { seed: 63 }),
		() => D.chips(mats, { seed: 64 }),
	];
	const protos = makers.map((m) => m());
	// Les modèles restent dans la scène, hors champ : leurs shaders sont compilés au préchauffage.
	protos.forEach((p, i) => {
		p.position.set(i * 3, -200, 0);
		scene.add(p);
	});
	const r = rng(5);
	const bodies = [];
	const SCALE = mobile ? 0.6 : 0.64;
	let halfW = 4;
	let halfH = 4;
	let spawnClock = 0;
	const ptr = { x: 99, y: 99, vx: 0, vy: 0, active: false };

	// Tout est créé d'avance (pendant le loader) : la pluie ne fait que les activer.
	// Cloner en plein scroll coûtait jusqu'à ~190 ms. Chaque portion a son rayon de collision.
	const pool = Array.from({ length: N }, (_, i) => {
		const g = protos[i % protos.length].clone();
		g.scale.setScalar(SCALE);
		g.position.set(0, 0, 0);
		const inner = new THREE.Group();
		inner.userData.rad = (g.userData.rad ?? 1.1) * SCALE;
		inner.userData.long = !!g.userData.long;
		inner.add(g);
		if (split && i % 2) inner.traverse((o) => o.layers.set(1));
		inner.visible = false;
		scene.add(inner);
		return inner;
	});
	let warming = false;

	function spawn() {
		const inner = pool[bodies.length];
		// Les kébabs (allongés) tombent plutôt de profil : on voit l'aluminium et la garniture.
		const yaw = inner.userData.long ? (r() - 0.5) * 1.1 + (r() < 0.5 ? 0 : Math.PI) : r() * Math.PI * 2;
		inner.rotation.set(0, yaw, (r() - 0.5) * 1.4);
		inner.visible = true;
		bodies.push({
			o: inner,
			rad: inner.userData.rad,
			p: new THREE.Vector3((r() - 0.5) * halfW * 1.5, halfH + 1.5 + r() * 2, (r() - 0.5) * 1.5),
			v: new THREE.Vector3((r() - 0.5) * 2, -2 - r() * 3, 0),
			w: new THREE.Vector3((r() - 0.5) * 0.8, (r() - 0.5) * 2.4, (r() - 0.5) * 6),
		});
	}

	function reset() {
		bodies.splice(0).forEach((b) => (b.o.visible = false));
		spawnClock = 0;
	}
	state.rain.reset = reset;

	return {
		scene,
		camera,
		split,
		/** Préchauffage : toutes les portions dans le champ, pour un rendu qui envoie leurs données au GPU. */
		warm(on) {
			warming = on;
			pool.forEach((o, i) => {
				o.visible = on;
				o.position.set(((i % 6) - 2.5) * 1.4, Math.floor(i / 6) * 1.4 - 1.5, 0);
			});
		},
		pointer(x, y, w, h, active) {
			const nx = (x / w) * 2 - 1;
			const ny = -((y / h) * 2 - 1);
			const wx = nx * halfW;
			const wy = ny * halfH;
			ptr.vx = wx - ptr.x;
			ptr.vy = wy - ptr.y;
			ptr.x = wx;
			ptr.y = wy;
			ptr.active = active;
		},
		update(dt, t, w, h) {
			dt = Math.min(dt, 1 / 30);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			if (warming) return;
			halfH = Math.tan(THREE.MathUtils.degToRad(15)) * 16;
			halfW = halfH * camera.aspect;

			if (state.rain.active && bodies.length < N) {
				spawnClock -= dt;
				if (spawnClock <= 0) {
					spawn();
					spawnClock = 0.11;
				}
			}

			// Sol relevé : chaque portion (même penchée) reste entière dans le cadre.
			const ground = -halfH + 0.12;
			for (const b of bodies) {
				const floor = ground + b.rad;
				b.v.y -= 20 * dt;
				if (ptr.active) {
					const dx = b.p.x - ptr.x;
					const dy = b.p.y - ptr.y;
					const d = Math.hypot(dx, dy);
					if (d < 1.6) {
						const k = (1.6 - d) / 1.6;
						b.v.x += (dx / (d || 1)) * k * 40 * dt + ptr.vx * 4;
						b.v.y += (dy / (d || 1)) * k * 40 * dt + Math.abs(ptr.vy) * 4 + k * 22 * dt;
						b.w.z += -ptr.vx * 6;
					}
				}
				b.p.addScaledVector(b.v, dt);
				if (b.p.y < floor) {
					b.p.y = floor;
					b.v.y *= -0.32;
					b.v.x *= 0.82;
					b.w.multiplyScalar(0.72);
				}
				if (Math.abs(b.p.x) > halfW - b.rad * 0.6) {
					b.p.x = Math.sign(b.p.x) * (halfW - b.rad * 0.6);
					b.v.x *= -0.5;
				}
				b.p.z = clamp(b.p.z, -1, 1);
			}
			for (let i = 0; i < bodies.length; i++) {
				for (let j = i + 1; j < bodies.length; j++) {
					const a = bodies[i];
					const c = bodies[j];
					const dx = c.p.x - a.p.x;
					const dy = c.p.y - a.p.y;
					const d = Math.hypot(dx, dy) || 0.001;
					const min = a.rad + c.rad;
					if (d < min) {
						const nx = dx / d;
						const ny = dy / d;
						const push = (min - d) / 2;
						a.p.x -= nx * push; a.p.y -= ny * push;
						c.p.x += nx * push; c.p.y += ny * push;
						const rv = (c.v.x - a.v.x) * nx + (c.v.y - a.v.y) * ny;
						if (rv < 0) {
							const j2 = -(1.3 * rv) / 2;
							a.v.x -= j2 * nx; a.v.y -= j2 * ny;
							c.v.x += j2 * nx; c.v.y += j2 * ny;
							const sp = clamp(rv * 0.8, -2.5, 2.5);
							a.w.z += sp; c.w.z -= sp;
						}
					}
				}
			}
			for (const b of bodies) {
				b.o.position.copy(b.p);
				b.o.rotation.x += b.w.x * dt;
				b.o.rotation.y += b.w.y * dt;
				b.o.rotation.z += b.w.z * dt;
				// Rotation toujours amortie et plafonnée : une portion calée sur une autre ne tourne
				// plus indéfiniment (les micro-collisions relançaient sa rotation).
				b.w.multiplyScalar(Math.exp(-dt * 0.9));
				if (b.w.lengthSq() > 81) b.w.setLength(9);
				if (Math.hypot(b.v.x, b.v.y) < 0.8) b.w.multiplyScalar(0.9);
				// Posé : il se redresse doucement (on voit la garniture).
				const low = b.p.y < ground + b.rad * 3.4 && Math.abs(b.v.y) < 1.2;
				if (low) {
					const k = Math.min(1, dt * 4);
					const tz = Math.round(b.o.rotation.z / (Math.PI * 2)) * Math.PI * 2;
					const tx = Math.round(b.o.rotation.x / (Math.PI * 2)) * Math.PI * 2;
					b.o.rotation.z += (tz - b.o.rotation.z) * k;
					b.o.rotation.x += (tx - b.o.rotation.x) * k;
					b.w.x *= 0.85;
					b.w.z *= 0.85;
					b.w.y *= 0.97;
					b.v.x *= 0.96;
				}
			}
		},
	};
}
