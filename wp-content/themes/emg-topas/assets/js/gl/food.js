/**
 * Lazeez Kebabs & Açaí : ingrédients 3D sculptés en code (aucun modèle à télécharger).
 * Unité : un kébab roulé mesure environ 2.2 de long pour 0.7 de diamètre. Axe Y vers le haut.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm, noise3, rng, smoothstep, clamp } from 'emg-topas/gl/noise';
import * as T from 'emg-topas/gl/textures';

const C = (h) => new THREE.Color(h);

/* ---------------------------------------------------------------------------
   Matériaux partagés
   ------------------------------------------------------------------------ */
export async function createMaterials() {
	const bread = T.flatbread();
	const slate = T.slate();
	const lemonT = T.lemon();
	const rindT = T.rind();
	const pasteT = T.paste();
	const wood = T.wood();
	const foilT = T.foil();
	const tomatoT = T.tomato();
	const leafT = T.leaf();
	const berry = T.strawberry();
	const bananaT = T.banana();
	const grain = T.grain();
	const herbs = T.speckle('herb');
	herbs.repeat.set(24, 1);
	const seeds = T.speckle('seed');
	seeds.repeat.set(30, 1);
	const [flagTex, labelTex, breadPhoto, acaiPhoto] = await Promise.all([T.flag(), T.canLabel(), photo('flatbread-512.jpg'), photo('acai-surface-512.jpg')]);
	const flagBack = flagTex.clone();
	flagBack.wrapS = THREE.RepeatWrapping;
	flagBack.repeat.x = -1;
	flagBack.needsUpdate = true;
	const shadowTex = T.shadow();

	const phys = (o) => new THREE.MeshPhysicalMaterial(o);
	const std = (o) => new THREE.MeshStandardMaterial(o);
	const DS = THREE.DoubleSide;
	const meatO = { vertexColors: true, bumpMap: grain, bumpScale: 2.2, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 };

	return {
		/* --- Galette, viande, crudités, sauces --- */
		breadIn: phys({ map: bread.inMap, bumpMap: bread.bump, bumpScale: 1.3, roughness: 0.84, vertexColors: true, sheen: 0.35, sheenColor: C('#FFF3D8'), sheenRoughness: 0.6 }),
		breadOut: phys({ map: breadPhoto || bread.outMap, bumpMap: bread.bump, bumpScale: 1.6, roughness: 0.68, vertexColors: true, clearcoat: 0.1, clearcoatRoughness: 0.55 }),
		meat: phys({ ...meatO, side: DS }),
		meatSolid: phys(meatO),
		shred: phys({ vertexColors: true, roughness: 0.34, clearcoat: 0.6, clearcoatRoughness: 0.22, sheen: 0.45, sheenColor: C('#F0FFCC'), side: DS }),
		lettuce: phys({ map: leafT.map, bumpMap: leafT.bump, bumpScale: 1.6, roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.24, sheen: 0.5, sheenColor: C('#EAFFBE'), emissive: C('#1F3A08'), emissiveIntensity: 0.05, side: DS }),
		tomatoFlesh: phys({ map: tomatoT.map, bumpMap: tomatoT.bump, bumpScale: 2.2, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, emissive: C('#FFFFFF'), emissiveMap: tomatoT.map, emissiveIntensity: 0.1 }),
		tomatoSkin: phys({ color: C('#C2210F'), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, emissive: C('#4A0500'), emissiveIntensity: 0.18 }),
		garlic: phys({ color: C('#F8F3E6'), map: herbs, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.3, sheenColor: C('#FFFFFF') }),
		chilli: phys({ color: C('#C8281A'), map: seeds, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, emissive: C('#5A0800'), emissiveIntensity: 0.25 }),
		// Aluminium : très réfléchissant mais pas miroir, pour rester clair sous l'éclairage du site.
		foil: std({ color: C('#F1F2F4'), metalness: 0.82, roughness: 0.3, roughnessMap: foilT.rough, bumpMap: foilT.bump, bumpScale: 1.0, side: DS, envMapIntensity: 2.6 }),
		/* --- Ingrédients flottants --- */
		falafel: phys({ vertexColors: true, roughness: 0.7, bumpMap: grain, bumpScale: 3.6, clearcoat: 0.3, clearcoatRoughness: 0.5 }),
		sesame: phys({ color: C('#FFFFFF'), roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
		fry: phys({ vertexColors: true, roughness: 0.58, bumpMap: grain, bumpScale: 2.2, clearcoat: 0.28, clearcoatRoughness: 0.5 }),
		feta: phys({ vertexColors: true, roughness: 0.8, bumpMap: grain, bumpScale: 2.6, sheen: 0.4, sheenColor: C('#FFFFFF'), sheenRoughness: 0.7 }),
		veg: phys({ vertexColors: true, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.16 }),
		glossy: phys({ vertexColors: true, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.12 }),
		redOnion: phys({ vertexColors: true, roughness: 0.24, clearcoat: 0.9, clearcoatRoughness: 0.12, sheen: 0.2, sheenColor: C('#FFE6F2'), side: DS }),
		olive: phys({ color: C('#2A2B1C'), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }),
		pimento: phys({ color: C('#C81E14'), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, emissive: C('#5A0600'), emissiveIntensity: 0.2 }),
		lemonFlesh: phys({ map: lemonT.map, bumpMap: lemonT.bump, bumpScale: 2.2, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, emissive: C('#FFFFFF'), emissiveMap: lemonT.map, emissiveIntensity: 0.16 }),
		lemonRind: phys({ map: rindT.map, bumpMap: rindT.bump, bumpScale: 2, roughness: 0.36, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
		paste: phys({ map: pasteT.map, bumpMap: pasteT.bump, bumpScale: 2.5, roughness: 0.55, sheen: 0.3, sheenColor: C('#FFF3C8') }),
		pasteRind: std({ color: C('#A8601F'), bumpMap: pasteT.bump, bumpScale: 3, roughness: 0.85 }),
		mint: phys({ vertexColors: true, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.3, sheen: 0.6, sheenColor: C('#C8F0A0'), side: DS }),
		pepper: std({ color: C('#1E1712'), roughness: 0.7 }),
		/* --- Açaí --- */
		acai: phys({ vertexColors: true, roughness: 0.42, bumpMap: grain, bumpScale: 1.1, clearcoat: 0.35, clearcoatRoughness: 0.3, sheen: 0.25, sheenColor: C('#B98AC8'), sheenRoughness: 0.5 }),
		// Surface du bol : photo de crème d'açaí (sorbet givré) en projection plane.
		acaiTop: phys({ map: acaiPhoto, vertexColors: true, roughness: 0.4, bumpMap: grain, bumpScale: 1.0, clearcoat: 0.4, clearcoatRoughness: 0.28, sheen: 0.25, sheenColor: C('#B98AC8'), sheenRoughness: 0.5 }),
		berryCut: phys({ map: berry.cut, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.1, emissive: C('#FFFFFF'), emissiveMap: berry.cut, emissiveIntensity: 0.08 }),
		berrySkin: phys({ map: berry.skin, bumpMap: berry.bump, bumpScale: 2.2, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }),
		banana: phys({ map: bananaT.map, bumpMap: bananaT.bump, bumpScale: 1.4, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.3, sheen: 0.3, sheenColor: C('#FFFBE6') }),
		bananaSide: phys({ color: C('#EED891'), bumpMap: grain, bumpScale: 0.8, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
		granola: phys({ vertexColors: true, flatShading: true, roughness: 0.62, bumpMap: grain, bumpScale: 2.5, clearcoat: 0.3, clearcoatRoughness: 0.45 }),
		blueberry: phys({ vertexColors: true, roughness: 0.5, sheen: 1, sheenColor: C('#AEB8E8'), sheenRoughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.5 }),
		coconut: phys({ vertexColors: true, roughness: 0.6, sheen: 0.3, sheenColor: C('#FFFFFF'), side: DS }),
		honey: phys({ color: C('#B8692A'), roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05, emissive: C('#4A1C00'), emissiveIntensity: 0.22 }),
		bowl: phys({ vertexColors: true, roughness: 0.4, roughnessMap: slate.bump, bumpMap: slate.bump, bumpScale: 0.5, clearcoat: 0.8, clearcoatRoughness: 0.14, side: DS }),
		/* --- Bois, ardoise, drapeau --- */
		bamboo: std({ map: wood.map, bumpMap: wood.bump, bumpScale: 1.5, roughness: 0.6 }),
		bambooDS: std({ map: wood.map, bumpMap: wood.bump, bumpScale: 1.5, roughness: 0.6, side: DS }),
		slate: std({ map: slate.map, bumpMap: slate.bump, bumpScale: 2, roughness: 1.05, roughnessMap: slate.bump }),
		bits: std({ color: C('#FFFFFF'), roughness: 0.9 }),
		flag: std({ map: flagTex, roughness: 0.75, side: THREE.FrontSide }),
		flagBack: std({ map: flagBack, roughness: 0.75, side: THREE.BackSide }),
		/* --- Boissons --- */
		can: phys({ map: labelTex, metalness: 0.5, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06 }),
		alu: phys({ color: C('#D9DCE1'), metalness: 1, roughness: 0.2, clearcoat: 0.4, clearcoatRoughness: 0.15 }),
		droplet: phys({ color: C('#FFE9EA'), roughness: 0.02, transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false }),
		glass: phys({ color: C('#FFFFFF'), roughness: 0.04, metalness: 0, transparent: true, opacity: 0.17, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.4, specularIntensity: 1, depthWrite: false, side: DS }),
		/* --- Effets --- */
		spark: new THREE.MeshBasicMaterial({ color: C(T.INK.cream) }),
		shadow: new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }),
	};
}

/** Texture photo (dossier img/lazeez/textures/), null si elle ne charge pas. */
async function photo(file) {
	try {
		const t = await new THREE.TextureLoader().loadAsync(new URL(`../../img/lazeez/textures/${file}`, import.meta.url).href);
		t.colorSpace = THREE.SRGBColorSpace;
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.anisotropy = 8;
		t.userData.mimeType = 'image/jpeg';
		return t;
	} catch (e) {
		return null;
	}
}

/* ---------------------------------------------------------------------------
   Utilitaires géométrie
   ------------------------------------------------------------------------ */
function eachVertex(geo, fn) {
	const p = geo.attributes.position;
	const v = new THREE.Vector3();
	for (let i = 0; i < p.count; i++) {
		v.fromBufferAttribute(p, i);
		fn(v, i);
		p.setXYZ(i, v.x, v.y, v.z);
	}
	p.needsUpdate = true;
}

function paintVertices(geo, fn) {
	const p = geo.attributes.position;
	const colors = new Float32Array(p.count * 3);
	const v = new THREE.Vector3();
	const c = new THREE.Color();
	for (let i = 0; i < p.count; i++) {
		v.fromBufferAttribute(p, i);
		fn(v, c, i);
		colors[i * 3] = c.r;
		colors[i * 3 + 1] = c.g;
		colors[i * 3 + 2] = c.b;
	}
	geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/** Couleurs par sommet d'une grille (nu × nv) : fn(u, v, position, couleur). */
function gridColors(geo, nu, nv, fn) {
	const p = geo.attributes.position;
	const colors = new Float32Array(p.count * 3);
	const v = new THREE.Vector3();
	const c = new THREE.Color();
	for (let j = 0; j <= nv; j++) {
		for (let i = 0; i <= nu; i++) {
			const k = j * (nu + 1) + i;
			v.fromBufferAttribute(p, k);
			fn(i / nu, j / nv, v, c);
			colors[k * 3] = c.r;
			colors[k * 3 + 1] = c.g;
			colors[k * 3 + 2] = c.b;
		}
	}
	geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/** Fusionne les sommets (supprime coutures et facettes) avant de sculpter. */
function smooth(geo) {
	geo.deleteAttribute('normal');
	geo.deleteAttribute('uv');
	return mergeVertices(geo, 1e-4);
}

function mesh(geo, mat, cast = true) {
	const m = new THREE.Mesh(geo, mat);
	m.castShadow = cast;
	return m;
}

const spow = (x, e) => Math.sign(x) * Math.abs(x) ** e;

/**
 * Grille (nu × nv) : fn(i/nu, j/nv) → [x, y, z, u, v]. Orientée pour que ses faces
 * regardent vers `out` (vecteur ou fonction du centre de face).
 */
function grid(nu, nv, fn, out) {
	const pos = [];
	const uv = [];
	for (let j = 0; j <= nv; j++) {
		for (let i = 0; i <= nu; i++) {
			const [x, y, z, u, v] = fn(i / nu, j / nv);
			pos.push(x, y, z);
			uv.push(u, v);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(gridIndex(nu, nv));
	orient(g, out);
	g.computeVertexNormals();
	return g;
}

function gridIndex(nu, nv) {
	const index = [];
	const row = nu + 1;
	for (let j = 0; j < nv; j++) {
		for (let i = 0; i < nu; i++) {
			const a = j * row + i;
			index.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
		}
	}
	return index;
}

/** Retourne toutes les faces si la face du milieu ne regarde pas vers `out`. */
function orient(g, out) {
	const index = Array.from(g.index.array);
	const p = g.attributes.position;
	const k = Math.floor(index.length / 6) * 3;
	const A = new THREE.Vector3().fromBufferAttribute(p, index[k]);
	const B = new THREE.Vector3().fromBufferAttribute(p, index[k + 1]);
	const Cc = new THREE.Vector3().fromBufferAttribute(p, index[k + 2]);
	const n = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(Cc, A));
	const centre = A.clone().add(B).add(Cc).divideScalar(3);
	const want = typeof out === 'function' ? out(centre) : out;
	if (n.dot(want) < 0) {
		for (let t = 0; t < index.length; t += 3) [index[t + 1], index[t + 2]] = [index[t + 2], index[t + 1]];
		g.setIndex(index);
	}
}

/** Normales continues sur la couture d'une grille fermée (colonne 0 = colonne nu). */
function weldSeam(geo, nu, nv) {
	const n = geo.attributes.normal;
	const row = nu + 1;
	const a = new THREE.Vector3();
	const b = new THREE.Vector3();
	for (let j = 0; j <= nv; j++) {
		const i0 = j * row;
		const i1 = j * row + nu;
		a.fromBufferAttribute(n, i0);
		b.fromBufferAttribute(n, i1);
		a.add(b).normalize();
		n.setXYZ(i0, a.x, a.y, a.z);
		n.setXYZ(i1, a.x, a.y, a.z);
	}
	n.needsUpdate = true;
}

/**
 * Balayage d'une section fermée le long d'un chemin. path(u) → Vector3 ; section(u, a) →
 * [x, y] dans le plan (normale, binormale) avec `up` comme référence. Grille : i = tour de
 * la section (nu), j = le long du chemin (nv) ; uv = (a/2π, u). Les bouts se referment si
 * la section s'annule en u = 0 et u = 1.
 */
function sweep(nu, nv, path, section, up = new THREE.Vector3(0, 0, 1)) {
	const pos = [];
	const uv = [];
	const P = new THREE.Vector3();
	const Tg = new THREE.Vector3();
	const N = new THREE.Vector3();
	const B = new THREE.Vector3();
	const e = 1e-3;
	for (let j = 0; j <= nv; j++) {
		const u = j / nv;
		P.copy(path(u));
		Tg.copy(path(Math.min(1, u + e))).sub(path(Math.max(0, u - e))).normalize();
		B.crossVectors(Tg, up).normalize();
		N.crossVectors(B, Tg).normalize();
		for (let i = 0; i <= nu; i++) {
			const a = (i / nu) * Math.PI * 2;
			const [sx, sy] = section(u, a);
			pos.push(P.x + N.x * sx + B.x * sy, P.y + N.y * sx + B.y * sy, P.z + N.z * sx + B.z * sy);
			uv.push(i / nu, u);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(gridIndex(nu, nv));
	const mid = path(0.5);
	orient(g, (c) => c.clone().sub(mid));
	g.computeVertexNormals();
	weldSeam(g, nu, nv);
	return g;
}

/** Normales calculées pour une autre position des mêmes sommets (cible de morphing). */
function morphNormals(index, positions) {
	const tmp = new THREE.BufferGeometry();
	tmp.setIndex(index);
	tmp.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	tmp.computeVertexNormals();
	const n = tmp.attributes.normal;
	tmp.dispose();
	return n;
}

/* ---------------------------------------------------------------------------
   Galette libanaise : à plat → roulée (cibles de morphing successives)
   ------------------------------------------------------------------------ */
/**
 * Galette ronde et fine, bord irrégulier, cloques. Elle s'enroule autour de l'axe X : la
 * bande centrale (z = 0) reste au fond, les deux moitiés montent de part et d'autre et se
 * chevauchent en haut (le rabat avant passe par-dessus). Comme une vraie galette ronde, les
 * deux bouts restent ouverts en gouttière : on y voit la garniture.
 *
 * Repère : axe du rouleau = X, centre du rouleau à y = rc (feuille à plat en y = 0).
 * keys : niveaux d'enroulement des cibles de morphing (0 = à plat, 1 = roulée) ;
 * bake : enroulement figé (aucune cible).
 * Retourne { mesh, setRoll(k), place(k, x, z, off), thick, rc, Rx, Rz }.
 */
export function wrapBread(mats, { Rx = 1.3, Rz = 1.15, thick = 0.034, rc = 0.29, seed = 1, keys = [0.25, 0.5, 0.75, 1], bake = 0, NU = 104, NV = 52 } = {}) {
	const s = seed * 2.3;
	const edge = (a) => 1 + 0.03 * noise3(Math.cos(a) * 1.3 + s, Math.sin(a) * 1.3, s) + 0.012 * noise3(Math.cos(a) * 5 + s, Math.sin(a) * 5, s + 4);
	const flatXZ = (a, b) => {
		const w = Math.sqrt(Math.max(0.015, 1 - a * a));
		const ez = b * w;
		const e = edge(Math.atan2(ez, a));
		return [a * Rx * e, ez * Rz * e];
	};
	const radial = (x, z) => Math.hypot(x / Rx, z / Rz);
	const puff = (x, z) => (0.012 * smoothstep(0.45, 0.85, noise3(x * 4.5 + s, z * 4.5, s)) + 0.003 * noise3(x * 13, z * 13, s + 2)) * smoothstep(1.0, 0.82, radial(x, z));
	const lift = thick * 1.8;
	const place = (k, x, z, off, out = new THREE.Vector3()) => {
		if (k <= 1e-4) return out.set(x, off, z);
		const R0 = rc / k;
		const phi = z / R0;
		const fin = z / rc;
		const lf = z > 0 ? lift * smoothstep(1.35, 2.0, fin) * Math.min(1, k * 1.3) : 0;
		const wob = 0.025 * rc * k * noise3(x * 2.2 + s, fin * 0.7, 1.7);
		const rr = R0 + lf + wob - off;
		return out.set(x, R0 - rr * Math.cos(phi), rr * Math.sin(phi));
	};

	// Trois nappes : dessus (intérieur une fois roulée), dessous (extérieur toasté), tranche.
	const parts = [];
	const make = (nI, nJ, at, out, tone) => {
		const n = (nI + 1) * (nJ + 1);
		const prm = new Float32Array(n * 3);
		const uv = new Float32Array(n * 2);
		const col = new Float32Array(n * 3);
		const c = new THREE.Color();
		for (let j = 0; j <= nJ; j++) {
			for (let i = 0; i <= nI; i++) {
				const k = j * (nI + 1) + i;
				const [x, z, off] = at(i, j);
				prm.set([x, z, off], k * 3);
				uv[k * 2] = x / (2.2 * Rx) + 0.5;
				uv[k * 2 + 1] = z / (2.2 * Rz) + 0.5;
				tone(x, z, c);
				col.set([c.r, c.g, c.b], k * 3);
			}
		}
		const index = gridIndex(nI, nJ);
		const v = new THREE.Vector3();
		const posAt = (k) => {
			const a = new Float32Array(n * 3);
			for (let q = 0; q < n; q++) {
				place(k, prm[q * 3], prm[q * 3 + 1], prm[q * 3 + 2], v);
				a[q * 3] = v.x;
				a[q * 3 + 1] = v.y;
				a[q * 3 + 2] = v.z;
			}
			return a;
		};
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(posAt(0), 3));
		g.setIndex(index);
		orient(g, out);
		const idx = Array.from(g.index.array);
		g.setAttribute('position', new THREE.BufferAttribute(posAt(bake), 3));
		g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
		g.setAttribute('color', new THREE.BufferAttribute(col, 3));
		g.computeVertexNormals();
		if (!bake && keys.length) {
			g.morphAttributes.position = [];
			g.morphAttributes.normal = [];
			for (const k of keys) {
				const pk = posAt(k);
				g.morphAttributes.position.push(new THREE.BufferAttribute(pk, 3));
				g.morphAttributes.normal.push(morphNormals(idx, pk.slice()));
			}
		}
		parts.push(g);
	};
	const toastIn = C('#EBCB9C');
	const toastOut = C('#C28A52');
	const white = C('#FFFFFF');
	const toneIn = (x, z, c) => c.copy(white).lerp(toastIn, smoothstep(0.72, 1.02, radial(x, z)) * 0.9);
	const toneOut = (x, z, c) => c.copy(white).lerp(toastOut, smoothstep(0.7, 1.02, radial(x, z)) * 0.75);
	const ab = (i, j) => [(i / NU) * 2 - 1, (j / NV) * 2 - 1];
	make(NU, NV, (i, j) => {
		const [x, z] = flatXZ(...ab(i, j));
		return [x, z, thick / 2 + puff(x, z)];
	}, new THREE.Vector3(0, 1, 0), toneIn);
	make(NU, NV, (i, j) => {
		const [x, z] = flatXZ(...ab(i, j));
		return [x, z, -thick / 2 - puff(x, z) * 0.4];
	}, new THREE.Vector3(0, -1, 0), toneOut);
	// Tranche : boucle sur le contour de la grille, bord arrondi.
	const loop = [];
	for (let i = 0; i <= NU; i++) loop.push(ab(i, 0));
	for (let j = 1; j <= NV; j++) loop.push(ab(NU, j));
	for (let i = NU - 1; i >= 0; i--) loop.push(ab(i, NV));
	for (let j = NV - 1; j >= 0; j--) loop.push(ab(0, j));
	const pts = loop.map(([a, b]) => flatXZ(a, b));
	const L = pts.length - 1;
	const RIM = 4;
	make(L, RIM, (i, j) => {
		const p = pts[i];
		const pa = pts[(i - 1 + L) % L];
		const pb = pts[(i + 1) % L];
		let ox = pb[1] - pa[1];
		let oz = -(pb[0] - pa[0]);
		if (ox * p[0] + oz * p[1] < 0) {
			ox = -ox;
			oz = -oz;
		}
		const ol = Math.hypot(ox, oz) || 1;
		const t = j / RIM;
		const bul = thick * 0.45 * Math.sin(Math.PI * t);
		return [p[0] + (ox / ol) * bul, p[1] + (oz / ol) * bul, (thick / 2) * Math.cos(Math.PI * t)];
	}, (cc) => new THREE.Vector3(cc.x, 0, cc.z), toneIn);
	const geo = mergeGeometries(parts, true);
	const m = mesh(geo, [mats.breadIn, mats.breadOut, mats.breadIn]);
	m.receiveShadow = true;
	if (!bake && keys.length) m.morphTargetInfluences = new Array(keys.length).fill(0);
	const setRoll = (k) => {
		const inf = m.morphTargetInfluences;
		if (!inf) return;
		inf.fill(0);
		if (k <= 0) return;
		let i = 0;
		while (i < keys.length - 1 && k > keys[i]) i++;
		const k0 = i === 0 ? 0 : keys[i - 1];
		const f = clamp((k - k0) / (keys[i] - k0));
		inf[i] = f;
		if (i > 0) inf[i - 1] = 1 - f;
	};
	return { mesh: m, setRoll, place, thick, rc, Rx, Rz };
}

/* ---------------------------------------------------------------------------
   Papier d'aluminium froissé autour du rouleau (fond fermé, bord supérieur replié)
   ------------------------------------------------------------------------ */
/** Axe X, centre du rouleau en (y = cy, z = 0), de x0 (fond fermé) jusqu'à environ x1. */
export function foilWrap(mats, { r = 0.38, x0 = -1.1, x1 = 0, cy = 0.33, seed = 1, NU = 132, NV = 46 } = {}) {
	const s = seed * 1.9;
	const tc = 0.24;
	const crease = (x, y, z) => {
		let a = 0;
		let f = 1;
		let w = 0.6;
		for (let k = 0; k < 3; k++) {
			a += w * (1 - Math.abs(noise3(x * f + s, y * f, z * f + k * 5))) ** 3;
			f *= 2.15;
			w *= 0.5;
		}
		return a;
	};
	const geo = grid(NU, NV, (u, v) => {
		const th = u * Math.PI * 2;
		const ct = Math.cos(th);
		const st = Math.sin(th);
		let x;
		let rr;
		if (v < tc) {
			// Fond : le papier se resserre en plis rayonnants.
			const q = v / tc;
			rr = r * (0.05 + 0.95 * Math.sin((q * Math.PI) / 2));
			x = x0 - 0.06 * (1 - q * q) + 0.03 * Math.sin(th * 9 + s + q * 2) * q * (1 - q) * 3;
		} else {
			const q = (v - tc) / (1 - tc);
			const top = x1 + 0.08 * noise3(ct * 1.3 + s, st * 1.3, s) + 0.03 * noise3(ct * 4 + s, st * 4, s + 3);
			x = x0 + (top - x0) * q;
			// Bord supérieur légèrement évasé puis replié vers l'extérieur.
			rr = r + 0.02 * smoothstep(0.82, 0.97, q) + 0.028 * smoothstep(0.96, 1, q);
			x -= 0.02 * smoothstep(0.97, 1, q);
			// Le papier épouse le rouleau, plus lâche vers le haut.
			rr *= 1 + 0.03 * smoothstep(0.5, 1, q) * noise3(ct * 2 + s, st * 2, x);
		}
		const cr = crease(ct * 1.9, st * 1.9, x * 2.2);
		const lump = 0.01 * fbm(ct * 1.4 + s, st * 1.4, x * 1.5, 3);
		rr += 0.011 * (cr - 0.45) + lump;
		return [x, cy - rr * ct, rr * st, u, v];
	}, (c) => new THREE.Vector3(c.x < x0 + 0.02 ? -1 : 0, c.y - cy, c.z));
	weldSeam(geo, NU, NV);
	const m = mesh(geo, mats.foil);
	m.receiveShadow = true;
	return m;
}

/* ---------------------------------------------------------------------------
   Garniture : copeaux de döner, laitue, oignon, tomate
   ------------------------------------------------------------------------ */
/** Copeau de döner : lamelle fine recourbée, bords effilochés, caramélisée sur les bords. */
export function shavingGeometry(seed = 1, { L = 0.2, W = 0.09, curl = 1.7, twist = 0.8, NU = 14, NV = 5 } = {}) {
	const s = seed * 3.1;
	const kap = Math.max(0.05, curl / L);
	const geo = grid(NU, NV, (u, v) => {
		const sl = (u - 0.5) * L;
		const end = Math.max(0, Math.min(1, u / 0.12, (1 - u) / 0.12));
		const side = v - 0.5;
		const rag = 1 + 0.3 * noise3(u * 4 + s, side > 0 ? 3 : 0, s) + 0.12 * noise3(u * 14, side * 4, s + 2);
		const w = side * W * (0.5 + 0.5 * Math.sqrt(end)) * rag;
		const a = sl * kap;
		const tw = (u - 0.5) * twist;
		const nx = -Math.sin(a);
		const ny = Math.cos(a);
		const wn = w * Math.sin(tw) + 0.006 * noise3(u * 9 + s, v * 4, s + 5);
		return [Math.sin(a) / kap + nx * wn, (1 - Math.cos(a)) / kap + ny * wn, w * Math.cos(tw), u, v];
	}, new THREE.Vector3(0, 1, 0));
	geo.computeBoundingBox();
	const ctr = geo.boundingBox.getCenter(new THREE.Vector3());
	geo.translate(-ctr.x, -ctr.y, -ctr.z);
	const base = C('#7E4626');
	const deep = C('#5C2E15');
	const pink = C('#9A5638');
	const fat = C('#BE8A5C');
	const edgeC = C('#3E1A09');
	const charC = C('#1C0C05');
	gridColors(geo, NU, NV, (u, v, p, c) => {
		const side = Math.abs(v - 0.5) * 2;
		c.copy(base).lerp(deep, (noise3(u * 6 + s, v * 3, s) * 0.5 + 0.5) * 0.7);
		c.lerp(pink, smoothstep(0.25, 0.8, noise3(u * 5, v * 5, s + 7)) * 0.4);
		c.lerp(fat, smoothstep(0.5, 0.85, noise3(u * 3 + s, v * 12, s + 1)) * 0.5);
		c.lerp(edgeC, smoothstep(0.5, 1, side) * 0.75);
		const tip = Math.max(side, Math.abs(u - 0.5) * 2);
		c.lerp(charC, smoothstep(0.78, 1, tip) * (0.45 + 0.55 * (noise3(u * 12, v * 12, s) * 0.5 + 0.5)));
	});
	return geo;
}

/** Lanière de laitue émincée : ruban ondulé, nervure pâle, bords verts. */
export function shredGeometry(seed = 1, { L = 0.3, W = 0.05, curl = 2.2, twist = 2.2, NU = 12, NV = 2 } = {}) {
	const s = seed * 2.3;
	const r = rng(seed * 7 + 2);
	const kap = Math.max(0.05, curl / L);
	const geo = grid(NU, NV, (u, v) => {
		const sl = (u - 0.5) * L;
		const end = Math.max(0, Math.min(1, u / 0.06, (1 - u) / 0.06));
		const w = (v - 0.5) * W * (0.6 + 0.4 * Math.sqrt(end)) * (1 + 0.2 * noise3(u * 6 + s, v, s));
		const a = sl * kap;
		const tw = (u - 0.5) * twist;
		const wave = 0.012 * Math.sin(u * 18 + s) * (v - 0.5) * 2;
		const wn = w * Math.sin(tw) + wave;
		return [Math.sin(a) / kap - Math.sin(a) * wn, (1 - Math.cos(a)) / kap + Math.cos(a) * wn, w * Math.cos(tw), u, v];
	}, new THREE.Vector3(0, 1, 0));
	geo.computeBoundingBox();
	const ctr = geo.boundingBox.getCenter(new THREE.Vector3());
	geo.translate(-ctr.x, -ctr.y, -ctr.z);
	const rib = r() < 0.4;
	const pale = C('#F1F6D6');
	const mid = C('#BEDD82');
	const dark = C('#7FB443');
	gridColors(geo, NU, NV, (u, v, p, c) => {
		const side = Math.abs(v - 0.5) * 2;
		c.copy(pale).lerp(mid, rib ? side * 0.4 : 0.35 + side * 0.4);
		c.lerp(dark, rib ? 0 : smoothstep(0.6, 1, side) * 0.6 * (0.6 + 0.4 * noise3(u * 8 + s, 0, s)));
	});
	return geo;
}

/** Lamelle d'oignon (arc), blanc ou rouge. */
export function sliverGeometry(seed = 1, { R = 0.15, span = 1.5, w = 0.032, h = 0.012, red = false, NU = 18, NV = 8 } = {}) {
	const geo = grid(NU, NV, (sv, t) => {
		const al = -span / 2 + sv * span;
		const ph = t * Math.PI * 2;
		const end = Math.sqrt(Math.max(0, Math.min(1, sv / 0.07, (1 - sv) / 0.07)));
		const cx = spow(Math.cos(ph), 0.45) * (w / 2) * end;
		const cz = spow(Math.sin(ph), 0.45) * (h / 2) * (0.4 + 0.6 * end);
		const rad = R * (1 + 0.02 * noise3(al * 3 + seed, 0, seed)) + cx;
		return [Math.cos(al) * rad - R, Math.sin(al) * rad, cz, sv, t];
	}, (c) => {
		const al = Math.atan2(c.y, c.x + R);
		return new THREE.Vector3(c.x + R - Math.cos(al) * R, c.y - Math.sin(al) * R, c.z);
	});
	const inner = C(red ? '#F4E2EA' : '#FAF7EE');
	const ring = C(red ? '#9A2468' : '#ECEBD9');
	const outer = C(red ? '#43062F' : '#E3E6C2');
	paintVertices(geo, (v, c) => {
		const k = (Math.hypot(v.x + R, v.y) - R) / (w / 2);
		c.copy(inner).lerp(ring, smoothstep(-0.2, 0.3, k)).lerp(outer, smoothstep(0.45, 0.85, k));
	});
	return geo;
}

/** Dé de tomate : cube arrondi, peau rouge sur une face, chair et gelée à pépins. */
export function diceGeometry(seed = 1, size = 0.075) {
	const geo = smooth(new THREE.IcosahedronGeometry(1, 3));
	const r = rng(seed * 5 + 3);
	const sz = [size * (0.85 + r() * 0.3), size * (0.65 + r() * 0.25), size * (0.85 + r() * 0.3)];
	eachVertex(geo, (v) => {
		v.set(spow(v.x, 0.45) * sz[0] / 2, spow(v.y, 0.45) * sz[1] / 2, spow(v.z, 0.45) * sz[2] / 2);
		v.multiplyScalar(1 + 0.07 * noise3(v.x * 30 + seed, v.y * 30, v.z * 30));
	});
	geo.computeVertexNormals();
	const flesh = C('#DE452B');
	const gel = C('#F2914E');
	const seedC = C('#EDD48E');
	const skin = C('#B81B10');
	paintVertices(geo, (v, c) => {
		c.copy(flesh).lerp(gel, smoothstep(0.1, 0.7, noise3(v.x * 40 + seed, v.y * 40, v.z * 40)) * 0.75);
		c.lerp(seedC, smoothstep(0.7, 0.9, noise3(v.x * 90, v.y * 90 + seed, v.z * 90)) * 0.6);
		c.lerp(skin, smoothstep(0.55, 0.85, v.y / (sz[1] / 2)));
	});
	return geo;
}

/** Gros copeau de döner (hero) : lamelle épaisse, recourbée, bords grillés. */
export function donerCurl(mats, { L = 0.6, W = 0.34, Th = 0.055, curl = 2.2, twist = 0.35, seed = 7 } = {}) {
	const s = seed * 1.7;
	const kap = curl / L;
	const NU = 20;
	const NV = 40;
	const path = (u) => {
		const a = (u - 0.5) * L * kap;
		return new THREE.Vector3(Math.sin(a) / kap, (1 - Math.cos(a)) / kap, 0.05 * Math.sin(u * Math.PI));
	};
	const geo = sweep(NU, NV, path, (u, a) => {
		const end = Math.min(1, u / 0.06, (1 - u) / 0.06) ** 0.5;
		const rag = 1 + 0.2 * noise3(u * 5 + s, Math.cos(a), s) + 0.08 * noise3(u * 16, Math.sin(a) * 3, s + 2);
		const tw = (u - 0.5) * twist;
		const x = spow(Math.cos(a), 0.3) * (W / 2) * rag * (0.45 + 0.55 * end);
		const y = spow(Math.sin(a), 0.65) * (Th / 2) * (0.5 + 0.5 * end) * (1 + 0.25 * noise3(u * 8, Math.cos(a) * 2, s));
		return [x * Math.cos(tw) - y * Math.sin(tw), x * Math.sin(tw) + y * Math.cos(tw)];
	});
	geo.computeBoundingBox();
	const ctr = geo.boundingBox.getCenter(new THREE.Vector3());
	geo.translate(-ctr.x, -ctr.y, -ctr.z);
	const base = C('#7E4626');
	const deep = C('#5A2C14');
	const fat = C('#C08E60');
	const edgeC = C('#3C1908');
	const charC = C('#1A0B05');
	gridColors(geo, NU, NV, (ua, u, p, c) => {
		const a = ua * Math.PI * 2;
		const side = Math.abs(Math.cos(a));
		c.copy(base).lerp(deep, (noise3(u * 7 + s, ua * 3, s) * 0.5 + 0.5) * 0.65);
		c.lerp(fat, smoothstep(0.45, 0.85, noise3(u * 5 + s, Math.cos(a) * 4, s + 1)) * 0.4);
		// Plaques grillées sur le dessus (contact de la broche), bords croustillants.
		c.lerp(edgeC, smoothstep(0.2, 0.7, noise3(u * 9 + s, Math.cos(a) * 3, Math.sin(a) * 3)) * 0.55);
		c.lerp(edgeC, smoothstep(0.8, 0.98, side) * 0.85);
		const tip = Math.max(smoothstep(0.88, 1, side), smoothstep(0.08, 0.0, Math.min(u, 1 - u)));
		c.lerp(charC, tip * (0.45 + 0.55 * (noise3(u * 20, a, s) * 0.5 + 0.5)));
	});
	return mesh(geo, mats.meatSolid);
}

/* ---------------------------------------------------------------------------
   Crudités et garnitures
   ------------------------------------------------------------------------ */
/**
 * Rondelle (ou demi-rondelle) de tomate, debout dans le plan XY : deux faces texturées
 * (gelée et pépins), peau brillante sur la tranche.
 */
export function tomatoSlice(mats, r = 0.3, { half = false, seed = 1 } = {}) {
	const th = r * 0.22;
	const span = half ? Math.PI : Math.PI * 2;
	const NA = half ? 30 : 72;
	const face = (side) =>
		grid(NA, 14, (sv, t) => {
			const a = sv * span;
			const x = Math.cos(a) * t * r;
			const y = Math.sin(a) * t * r;
			const sink = 0.1 * smoothstep(0.78, 0.5, t) * smoothstep(0.2, 0.36, t);
			const z = side * (th / 2) * (1 - sink + 0.03 * noise3(x * 20, y * 20, side + seed));
			return [x, y, t >= 1 ? (side * th) / 2 : z, 0.5 + (x / (2 * r)) * 0.995, 0.5 + (y / (2 * r)) * 0.995];
		}, new THREE.Vector3(0, 0, side));
	const skin = grid(NA, 6, (sv, t) => {
		const a = sv * span;
		const phi = -Math.PI / 2 + t * Math.PI;
		const rr = r + th * 0.16 * Math.cos(phi);
		return [Math.cos(a) * rr, Math.sin(a) * rr, (Math.sin(phi) * th) / 2, sv, t];
	}, (c) => new THREE.Vector3(c.x, c.y, 0));
	const flesh = [face(1), face(-1)];
	if (half) {
		flesh.push(grid(30, 6, (sv, t) => {
			const phi = -Math.PI / 2 + t * Math.PI;
			const x = (sv * 2 - 1) * (r + th * 0.16 * Math.cos(phi));
			return [x, 0, (Math.sin(phi) * th) / 2, 0.5 + (x / (2 * r)) * 0.995, 0.5];
		}, new THREE.Vector3(0, -1, 0)));
	}
	const geo = mergeGeometries([mergeGeometries(flesh), skin], true);
	return mesh(geo, [mats.tomatoFlesh, mats.tomatoSkin]);
}

/** Feuille de laitue : contour ondulé, bords froissés, cuvette, nervures (texture). Base en y = 0. */
export function lettuceLeaf(mats, { size = 0.55, seed = 2, cup = 0.24, ruffle = 1 } = {}) {
	const s = seed * 2.7;
	const NU = 36;
	const NV = 48;
	const geo = grid(NU, NV, (u, v) => {
		const xn = u * 2 - 1;
		// Feuille large et arrondie au bout, resserrée vers le trognon.
		const wv = (0.3 + 0.7 * smoothstep(0, 0.42, v)) * Math.max(0, 1 - ((v - 0.5) / 0.5) ** 6) ** 0.5;
		const edgeN = 0.12 * noise3(v * 7 + s, xn > 0 ? 1 : -1, s);
		const ae = Math.abs(xn);
		const x = xn * size * 0.6 * wv * (1 + edgeN * ae);
		const y = v * size;
		const ruf = ruffle * 0.085 * size * smoothstep(0.35, 1, ae) ** 1.3 * (Math.sin(v * 38 + xn * 6 + noise3(v * 5, xn * 2, s) * 3) + 0.7 * noise3(v * 18 + s, xn * 9, s));
		const z = cup * size * xn * xn - 0.2 * size * (v - 0.45) ** 2 + ruf + 0.012 * size * smoothstep(0.12, 0, ae);
		return [x, y, z, u, v];
	}, new THREE.Vector3(0, 0, -1));
	return mesh(geo, mats.lettuce);
}

/** Boule de falafel : croûte craquelée, creux plus sombres, graines de sésame. */
export function falafel(mats, { r = 0.2, seed = 1, sesame = 24, detail = 12 } = {}) {
	const s = seed * 4.3;
	const disp = (n) => {
		const big = 0.07 * fbm(n.x * 1.6 + s, n.y * 1.6, n.z * 1.6, 3);
		const crag = 0.04 - 0.08 * Math.abs(noise3(n.x * 4.5 + s, n.y * 4.5, n.z * 4.5)) ** 0.7;
		const crumbs = 0.032 * smoothstep(0.3, 0.8, noise3(n.x * 11, n.y * 11 + s, n.z * 11));
		const pits = -0.028 * smoothstep(0.5, 0.85, noise3(n.x * 17 + s, n.y * 17, n.z * 17));
		return big + crag + crumbs + pits;
	};
	const geo = smooth(new THREE.IcosahedronGeometry(1, detail));
	const ds = [];
	const n = new THREE.Vector3();
	eachVertex(geo, (v) => {
		n.copy(v).normalize();
		const d = disp(n);
		ds.push(d);
		v.copy(n).multiplyScalar(r * (1 + d));
		v.y *= 0.88;
	});
	geo.computeVertexNormals();
	const deep = C('#4E1E08');
	const mid = C('#9A4A16');
	const crust = C('#C8702A');
	const gold = C('#E3A04E');
	const burnt = C('#2E1205');
	const herb = C('#4E5E1C');
	paintVertices(geo, (v, c, i) => {
		const h = smoothstep(-0.07, 0.08, ds[i]);
		const vx = v.x / r;
		const vy = v.y / r;
		const vz = v.z / r;
		c.copy(deep).lerp(mid, smoothstep(0, 0.4, h)).lerp(crust, smoothstep(0.4, 0.95, h));
		c.lerp(gold, smoothstep(0.55, 0.85, noise3(vx * 14, vy * 14, vz * 14)) * 0.5 * h);
		c.lerp(burnt, smoothstep(0.72, 0.95, noise3(vx * 9 + s, vy * 9, vz * 9)) * 0.45);
		c.lerp(herb, smoothstep(0.82, 0.95, noise3(vx * 26, vy * 26 + s, vz * 26)) * 0.6 * (1 - h * 0.5));
	});
	const g = new THREE.Group();
	g.add(mesh(geo, mats.falafel));
	if (sesame) {
		const sg = smooth(new THREE.IcosahedronGeometry(1, 1));
		eachVertex(sg, (v) => v.set(v.x * r * 0.075 * (v.x > 0 ? 1 : 0.75), v.y * r * 0.022, v.z * r * 0.045));
		sg.computeVertexNormals();
		const im = new THREE.InstancedMesh(sg, mats.sesame, sesame);
		const rr = rng(seed * 11 + 5);
		const m4 = new THREE.Matrix4();
		const q = new THREE.Quaternion();
		const qs = new THREE.Quaternion();
		const up = new THREE.Vector3(0, 1, 0);
		const pal = ['#F3E6C2', '#EAD7A6', '#F7EDD3', '#D9B77A'].map(C);
		for (let i = 0; i < sesame; i++) {
			n.set(rr() * 2 - 1, rr() * 2 - 1, rr() * 2 - 1).normalize();
			const p = n.clone().multiplyScalar(r * (1 + disp(n) - 0.01));
			p.y *= 0.88;
			const nn = n.clone().set(n.x, n.y / 0.88, n.z).normalize();
			q.setFromUnitVectors(up, nn);
			qs.setFromAxisAngle(up, rr() * Math.PI * 2);
			q.multiply(qs);
			m4.compose(p, q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.85 + rr() * 0.3));
			im.setMatrixAt(i, m4);
			im.setColorAt(i, pal[Math.floor(rr() * pal.length)]);
		}
		im.castShadow = true;
		g.add(im);
	}
	return g;
}

/** Frite : bâtonnet à section carrée arrondie, un peu courbé, bouts et arêtes plus dorés. */
export function fry(mats, { L = 0.62, a = 0.068, seed = 1, bend = 0.035 } = {}) {
	const s = seed * 5.1;
	const r = rng(seed * 7 + 1);
	const ax = a * (0.9 + r() * 0.2);
	const ay = a * (0.85 + r() * 0.2);
	const NU = 24;
	const NV = 30;
	const path = (u) => new THREE.Vector3((u - 0.5) * L, bend * Math.sin(u * Math.PI) + 0.012 * noise3(u * 3 + s, 0, s), 0.012 * noise3(u * 2, s, 1));
	const geo = sweep(NU, NV, path, (u, ang) => {
		const end = Math.min(1, Math.min(u, 1 - u) / 0.02) ** 0.3;
		const k = 1 + 0.04 * noise3(u * 9 + s, Math.cos(ang), Math.sin(ang));
		return [spow(Math.cos(ang), 0.26) * ax * end * k, spow(Math.sin(ang), 0.26) * ay * end * k];
	});
	const base = C('#EDB955');
	const pale = C('#F7D88E');
	const edge = C('#B97422');
	const endC = C('#94541A');
	const spot = C('#A8631F');
	gridColors(geo, NU, NV, (ua, u, p, c) => {
		const ang = ua * Math.PI * 2;
		const corner = Math.min(Math.abs(Math.cos(ang)), Math.abs(Math.sin(ang))) / 0.7071;
		c.copy(base).lerp(pale, (1 - corner) * 0.55);
		c.lerp(edge, smoothstep(0.7, 1, corner) * 0.55);
		c.lerp(endC, smoothstep(0.1, 0.0, Math.min(u, 1 - u)) * 0.75);
		c.lerp(spot, smoothstep(0.62, 0.86, noise3(p.x * 22 + s, p.y * 22, p.z * 22)) * 0.5);
		c.lerp(C('#6E3A12'), smoothstep(0.8, 0.95, noise3(p.x * 70, p.y * 70 + s, p.z * 70)) * 0.5);
	});
	return mesh(geo, mats.fry);
}

/** Cube de feta : faces planes piquetées, arêtes et coins émiettés, blanc crème mat. */
export function feta(mats, { size = 0.2, seed = 1 } = {}) {
	const s = seed * 3.3;
	const h = size / 2;
	const geo = smooth(new THREE.BoxGeometry(size, size * 0.92, size, 26, 24, 26));
	const pit = [];
	const n = new THREE.Vector3();
	eachVertex(geo, (v) => {
		const a = [Math.abs(v.x) / h, Math.abs(v.y) / (h * 0.92), Math.abs(v.z) / h];
		const sorted = [...a].sort((x, y) => y - x);
		n.copy(v).normalize();
		const crumble = noise3(v.x * 26 + s, v.y * 26, v.z * 26) * 0.5 + 0.5;
		const big = noise3(v.x * 9 + s, v.y * 9, v.z * 9) * 0.5 + 0.5;
		// Arêtes : éclats irréguliers (plus profonds aux coins).
		const edge = smoothstep(0.8, 1, sorted[1]);
		const corner = smoothstep(0.8, 1, sorted[2]);
		const chip = edge * (0.04 + 0.16 * big * big + 0.05 * crumble) + corner * 0.1 * big;
		// Faces : petits trous et grain crémeux.
		const pits = smoothstep(0.5, 0.85, noise3(v.x * 40 + s, v.y * 40, v.z * 40)) * 0.05 + smoothstep(0.6, 0.9, noise3(v.x * 95, v.y * 95 + s, v.z * 95)) * 0.025;
		pit.push(pits + chip * 0.6);
		// On creuse vers le centre, suivant les axes concernés (garde des faces planes).
		const k = 1 - chip - pits * 0.6;
		v.x *= a[0] > 0.8 ? k : 1;
		v.y *= a[1] > 0.8 ? k : 1;
		v.z *= a[2] > 0.8 ? k : 1;
		v.addScaledVector(n, 0.006 * size * noise3(v.x * 12, v.y * 12 + s, v.z * 12));
	});
	geo.computeVertexNormals();
	const base = C('#F9F6EC');
	const warm = C('#EFE5CC');
	const shade = C('#CFC3A4');
	paintVertices(geo, (v, c, i) => {
		c.copy(base).lerp(warm, smoothstep(-0.3, 0.6, noise3(v.x * 18 + s, v.y * 18, v.z * 18)) * 0.55);
		c.lerp(shade, smoothstep(0.015, 0.09, pit[i]) * 0.75);
	});
	return mesh(geo, mats.feta);
}

/** Jalapeño entier : corps brillant à trois lobes, épaules, pointe arrondie, pédoncule et calice. */
export function jalapeno(mats, { L = 0.62, R = 0.12, seed = 1 } = {}) {
	const s = seed * 2.9;
	const prof = (u) => {
		let r = u < 0.12 ? 0.7 + 0.3 * Math.sin((u / 0.12) * Math.PI / 2) : 1 - 0.36 * ((u - 0.12) / 0.88) ** 1.5;
		if (u < 0.045) r *= Math.sqrt(u / 0.045) * 0.7 + 0.3 * (u / 0.045);
		if (u > 0.8) r *= Math.sqrt(Math.max(0, 1 - ((u - 0.8) / 0.2) ** 2));
		return r * R;
	};
	const path = (u) => new THREE.Vector3((u - 0.5) * L, 0.2 * L * (u - 0.2) ** 2, 0.02 * Math.sin(u * 3));
	const NU = 28;
	const NV = 44;
	const geo = sweep(NU, NV, path, (u, a) => {
		const lobes = 1 + 0.08 * Math.cos(3 * a + u * 1.5 + s) * smoothstep(0.08, 0.5, u);
		const dent = 1 + 0.025 * noise3(u * 6 + s, Math.cos(a) * 2, Math.sin(a) * 2);
		const rr = prof(u) * lobes * dent;
		return [Math.cos(a) * rr, Math.sin(a) * rr];
	});
	const base = C('#2C6A1C');
	const dark = C('#1C4C12');
	const hi = C('#4C9330');
	const cork = C('#B8A276');
	gridColors(geo, NU, NV, (ua, u, p, c) => {
		const a = ua * Math.PI * 2;
		c.copy(base).lerp(dark, (noise3(u * 4 + s, Math.cos(a), Math.sin(a)) * 0.5 + 0.5) * 0.6);
		c.lerp(hi, smoothstep(0.4, 0.9, noise3(u * 2, Math.cos(a) * 3 + s, Math.sin(a) * 3)) * 0.4);
		// Fines craquelures liégeuses près des épaules (signature du jalapeño mûr).
		const line = smoothstep(0.93, 0.99, Math.abs(Math.sin(a * 7 + u * 26 + noise3(u * 5, a, s) * 2)));
		c.lerp(cork, line * smoothstep(0.42, 0.12, u) * 0.75);
	});
	const g = new THREE.Group();
	g.add(mesh(geo, mats.veg));
	// Calice : collerette à cinq lobes posée sur l'épaule.
	const top = path(0);
	const cal = grid(30, 6, (sv, t) => {
		const a = sv * Math.PI * 2;
		const lobe = 1 + 0.25 * Math.max(0, Math.cos(a * 5 + s));
		const rr = R * (0.15 + 0.62 * t * lobe);
		return [top.x + 0.012 + 0.035 * t * t * lobe, top.y + Math.cos(a) * rr, top.z + Math.sin(a) * rr, sv, t];
	}, new THREE.Vector3(-1, 0, 0));
	paintVertices(cal, (v, c) => c.copy(C('#5D7F2C')).lerp(C('#3E6520'), noise3(v.x * 40, v.y * 40, v.z * 40) * 0.5 + 0.5));
	g.add(mesh(cal, mats.veg));
	// Pédoncule recourbé, bout coupé plus clair.
	const curve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(top.x + 0.03, top.y, top.z),
		new THREE.Vector3(top.x - 0.06, top.y + 0.01, top.z),
		new THREE.Vector3(top.x - 0.13, top.y + 0.05, top.z + 0.01),
		new THREE.Vector3(top.x - 0.17, top.y + 0.11, top.z + 0.02),
	]);
	const stem = new THREE.TubeGeometry(curve, 16, 0.026, 10, false);
	paintVertices(stem, (v, c) => c.copy(C('#6E8B36')).lerp(C('#C9BE8E'), smoothstep(top.y + 0.08, top.y + 0.11, v.y)));
	g.add(mesh(stem, mats.veg));
	const cap = new THREE.SphereGeometry(0.026, 10, 6);
	cap.scale(1, 0.45, 1);
	cap.translate(top.x - 0.17, top.y + 0.112, top.z + 0.02);
	paintVertices(cap, (v, c) => c.copy(C('#C9BE8E')));
	g.add(mesh(cap, mats.veg));
	return g;
}

/** Cornichon (pickle) : verrues, côtes, bouts plus clairs. */
export function cornichon(mats, seed = 4) {
	const geo = smooth(new THREE.SphereGeometry(1, 72, 40));
	const L = 0.56;
	const warts = [];
	eachVertex(geo, (v) => {
		const n = v.clone();
		const w = smoothstep(0.58, 0.86, noise3(v.x * 9 + seed, v.y * 9, v.z * 9));
		warts.push(w);
		const rib = noise3(Math.atan2(v.y, v.x) * 2, v.z * 3, seed) * 0.025;
		const taper = 1 - 0.24 * Math.abs(v.z) ** 2.2;
		const k = 1 + w * 0.085 + rib;
		v.set(n.x * 0.18 * taper * k, n.y * 0.155 * taper * k, n.z * L);
		v.x += 0.1 * n.z ** 2;
	});
	geo.computeVertexNormals();
	const dark = C('#2C4509');
	const mid = C('#567318');
	const light = C('#8FA53E');
	const tipC = C('#B9C46E');
	const endC = C('#8E9A3C');
	let i = 0;
	paintVertices(geo, (v, c) => {
		const stripe = noise3(Math.atan2(v.y, v.x) * 1.5, v.z * 2, seed + 2) * 0.5 + 0.5;
		c.copy(dark).lerp(mid, stripe);
		c.lerp(light, smoothstep(0.55, 0.9, noise3(v.x * 16, v.y * 16, v.z * 16)) * 0.35);
		c.lerp(tipC, warts[i++] * 0.75);
		c.lerp(endC, smoothstep(0.42, 0.56, Math.abs(v.z)) * 0.7);
	});
	return mesh(geo, mats.veg);
}
export const pickle = cornichon;

/** Demi-anneau d'oignon rouge (extérieur violet, intérieur blanc rosé). */
export function redOnion(mats, arc = Math.PI * 1.15, R = 0.34, { layers = 1, seed = 3 } = {}) {
	const outer = C('#43062F');
	const ring = C('#9A2468');
	const inner = C('#F4E2EA');
	const g = new THREE.Group();
	for (let L = 0; L < layers; L++) {
		const RR = R - L * 0.075;
		const a0 = L * 0.35;
		const span = arc - L * 0.5;
		const w = 0.05;
		const hh = 0.014;
		const geo = grid(Math.round((48 * span) / Math.PI), 16, (s, t) => {
			const al = a0 + s * span;
			const ph = t * Math.PI * 2;
			const end = Math.sqrt(Math.max(0, Math.min(1, s / 0.03, (1 - s) / 0.03)));
			const cx = spow(Math.cos(ph), 0.45) * w * end;
			const cz = spow(Math.sin(ph), 0.45) * hh * (0.4 + 0.6 * end);
			const wob = 1 + 0.015 * noise3(Math.cos(al) * 3 + seed, Math.sin(al) * 3, L);
			const rad = RR * wob + cx;
			return [Math.cos(al) * rad, Math.sin(al) * rad, cz, s, t];
		}, (c) => {
			const al = Math.atan2(c.y, c.x);
			return new THREE.Vector3(c.x - Math.cos(al) * RR, c.y - Math.sin(al) * RR, c.z);
		});
		paintVertices(geo, (v, c) => {
			const k = (Math.hypot(v.x, v.y) - RR) / w;
			c.copy(inner).lerp(ring, smoothstep(-0.25, 0.25, k)).lerp(outer, smoothstep(0.4, 0.75, k));
		});
		g.add(mesh(geo, mats.redOnion));
	}
	return g;
}

export function olive(mats, { green = false, seed = 2 } = {}) {
	const geo = smooth(new THREE.SphereGeometry(1, 48, 32));
	const RX = 0.2;
	const RY = 0.142;
	eachVertex(geo, (v) => {
		const n = v.x;
		const crater = smoothstep(0.72, 0.98, n) * (green ? 0.1 : 0.05);
		const wrinkle = 0.006 * noise3(v.x * 5 + seed, v.y * 5, v.z * 5);
		v.set((v.x * RX - crater) * (1 + wrinkle), v.y * RY * (1 + wrinkle), v.z * RY * (1 + wrinkle));
	});
	geo.computeVertexNormals();
	const a = green ? C('#5F6E1C') : C('#151012');
	const b = green ? C('#7C8A2A') : C('#2A2024');
	const lip = green ? C('#A3A458') : C('#0D0909');
	paintVertices(geo, (v, c) => {
		c.copy(a).lerp(b, noise3(v.x * 6 + seed, v.y * 6, v.z * 6) * 0.5 + 0.5);
		c.lerp(lip, smoothstep(0.14, 0.19, v.x) * (green ? 0.6 : 0.8));
	});
	const g = new THREE.Group();
	g.add(mesh(geo, mats.glossy));
	if (green) {
		const p = smooth(new THREE.SphereGeometry(0.06, 24, 16));
		eachVertex(p, (v) => {
			v.x *= 0.7;
			v.multiplyScalar(1 + 0.15 * noise3(v.x * 60, v.y * 60, v.z * 60));
		});
		p.computeVertexNormals();
		const pim = mesh(p, mats.pimento);
		pim.position.x = RX - 0.075;
		g.add(pim);
	}
	return g;
}

/** Part de fromage : pâte trouée, croûte orangée sur le bord bombé. */
export function cheeseWedge(mats, R = 0.34, seed = 1) {
	const TH = 0.5;
	const h = 0.15;
	const bulge = 0.016;
	const Rr = (a) => R * (1 + 0.012 * noise3(a * 6 + seed, seed, 0));
	const uv = (x, z) => [0.5 + (x / (2 * R)) * 0.98, 0.5 + (z / (2 * R)) * 0.98];
	const top = (side) =>
		grid(18, 10, (s, t) => {
			const a = s * TH;
			const rr = t * Rr(a);
			const x = Math.cos(a) * rr;
			const z = Math.sin(a) * rr;
			return [x, (side * h) / 2 + (side > 0 ? 0.004 * noise3(x * 20, z * 20, seed) : 0), z, ...uv(x, z)];
		}, new THREE.Vector3(0, side, 0));
	const cut = (a, out) =>
		grid(12, 6, (s, t) => {
			const rr = s * Rr(a);
			const y = (t - 0.5) * h;
			return [Math.cos(a) * rr, y, Math.sin(a) * rr, 0.5 + (rr / (2 * R)) * 0.98, 0.5 + y / (2 * R)];
		}, out);
	const rind = grid(18, 6, (s, t) => {
		const a = s * TH;
		const ph = -Math.PI / 2 + t * Math.PI;
		const rr = Rr(a) + bulge * Math.cos(ph);
		return [Math.cos(a) * rr, (Math.sin(ph) * h) / 2, Math.sin(a) * rr, s, t];
	}, (c) => new THREE.Vector3(c.x, 0, c.z));
	const pasteGeo = mergeGeometries([top(1), top(-1), cut(0, new THREE.Vector3(0, 0, -1)), cut(TH, new THREE.Vector3(-Math.sin(TH), 0, Math.cos(TH)))]);
	const geo = mergeGeometries([pasteGeo, rind], true);
	geo.translate(-Math.cos(TH / 2) * R * 0.6, 0, -Math.sin(TH / 2) * R * 0.6);
	return mesh(geo, [mats.paste, mats.pasteRind]);
}

/**
 * Demi-rondelle de citron, debout dans le plan XY (bord droit sur y = 0) :
 * deux faces de pulpe (texture détaillée), tranche droite, écorce bombée piquetée.
 */
export function lemonSlice(mats, r = 0.3) {
	const th = r * 0.19;
	const bulge = th * 0.32;
	const NA = 56;
	const NP = 8;
	const rimR = (phi) => r + bulge * Math.cos(phi);
	const face = (side) =>
		grid(NA, 18, (s, t) => {
			const a = s * Math.PI;
			const rho = t;
			const z = side * (th / 2) * (1 + 0.06 * (1 - rho * rho) + 0.04 * noise3(Math.cos(a) * rho * 6, Math.sin(a) * rho * 6, side));
			const x = Math.cos(a) * rho * r;
			const y = Math.sin(a) * rho * r;
			return [x, y, rho >= 1 ? (side * th) / 2 : z, 0.5 + (x / (2 * r)) * 0.995, 0.5 + (y / (2 * r)) * 0.995];
		}, new THREE.Vector3(0, 0, side));
	const cut = grid(40, NP, (s, t) => {
		const phi = -Math.PI / 2 + t * Math.PI;
		const x = (s * 2 - 1) * rimR(phi);
		return [x, 0, (Math.sin(phi) * th) / 2, 0.5 + (x / (2 * r)) * 0.995, 0.5 + Math.sin(phi) * 0.006];
	}, new THREE.Vector3(0, -1, 0));
	const peel = grid(NA, NP, (s, t) => {
		const a = s * Math.PI;
		const phi = -Math.PI / 2 + t * Math.PI;
		const rr = rimR(phi) * (1 + 0.006 * noise3(Math.cos(a) * 9, Math.sin(a) * 9, phi));
		return [Math.cos(a) * rr, Math.sin(a) * rr, (Math.sin(phi) * th) / 2, s, t];
	}, (c) => new THREE.Vector3(c.x, c.y, 0));
	const geo = mergeGeometries([mergeGeometries([face(1), face(-1), cut]), peel], true);
	return mesh(geo, [mats.lemonFlesh, mats.lemonRind]);
}

/* ---------------------------------------------------------------------------
   Açaí bowl : bol, crème d'açaí, fruits, granola
   ------------------------------------------------------------------------ */
/** Demi-fraise coupée dans la longueur : face coupée (cœur blanc), peau à akènes. Face en -z. */
export function strawberryHalf(mats, { H = 0.36, R = 0.15, seed = 1, calyx = false } = {}) {
	const s = seed * 1.3;
	const prof = (t) => (t < 0.2 ? 0.74 + 0.26 * Math.sin((t / 0.2) * Math.PI / 2) : Math.max(0, Math.cos(((t - 0.2) / 0.8) * Math.PI / 2)) ** 0.7);
	const rad = (t, a) => R * prof(t) * (1 + 0.035 * noise3(Math.cos(a) * 2 + s, t * 3, s));
	const skin = grid(24, 28, (u, t) => {
		const a = u * Math.PI;
		const rr = rad(t, a);
		return [Math.cos(a) * rr, -t * H, Math.sin(a) * rr * 0.92, u, 1 - t];
	}, (c) => new THREE.Vector3(c.x, 0, c.z));
	const cut = grid(16, 28, (u, t) => {
		const x = u < 0.5 ? -(1 - 2 * u) * rad(t, Math.PI) : (2 * u - 1) * rad(t, 0);
		return [x, -t * H, 0, 0.5 + (x / (2 * R)) * 0.98, 1 - t];
	}, new THREE.Vector3(0, 0, -1));
	const top = grid(24, 5, (u, q) => {
		const a = u * Math.PI;
		const rr = rad(0, a) * q;
		const x = Math.cos(a) * rr;
		return [x, 0.012 * (1 - q * q), Math.sin(a) * rr * 0.92, 0.5 + (x / (2 * R)) * 0.98, 0.995];
	}, new THREE.Vector3(0, 1, 0));
	const geo = mergeGeometries([mergeGeometries([cut, top]), skin], true);
	geo.translate(0, H * 0.42, 0);
	const m = mesh(geo, [mats.berryCut, mats.berrySkin]);
	if (!calyx) return m;
	// Calice : sépales dentelés rabattus sur l'épaule (demi-fraise coupée avec sa queue).
	const g = new THREE.Group();
	g.add(m);
	const rr = rng(seed * 13 + 1);
	const sep = [];
	for (let k = 0; k < 6; k++) {
		const a = (k / 5) * Math.PI;
		const len = R * (0.75 + rr() * 0.35);
		sep.push(grid(6, 4, (u, v) => {
			const w = Math.sin(Math.PI * Math.min(1, u * 1.15)) * R * 0.22 * (1 - u * 0.4);
			const d = u * len;
			const droop = -0.5 * u * u * len;
			const x = Math.cos(a) * d + Math.cos(a + Math.PI / 2) * (v - 0.5) * w * 2;
			const z = (Math.sin(a) * d + Math.sin(a + Math.PI / 2) * (v - 0.5) * w * 2) * 0.92;
			return [x, H * 0.42 + 0.014 + droop * 0.4 + 0.006 * Math.sin(v * 3), Math.max(0.002, z), u, v];
		}, new THREE.Vector3(0, 1, 0)));
	}
	const stem = new THREE.CylinderGeometry(0.008, 0.011, 0.05, 6);
	stem.translate(0, H * 0.42 + 0.035, 0.008);
	stem.deleteAttribute('uv');
	const cal = mergeGeometries(sep.map((g) => (g.deleteAttribute('uv'), g)).concat([stem]));
	paintVertices(cal, (v, c) => c.copy(C('#3E7A24')).lerp(C('#6FA83E'), noise3(v.x * 50, v.y * 50, v.z * 50) * 0.5 + 0.5));
	g.add(mesh(cal, mats.mint));
	return g;
}

/** Rondelle de banane : faces texturées, tranche légèrement facettée. À plat (faces ±y). */
export function bananaCoin(mats, { r = 0.15, seed = 1 } = {}) {
	const th = r * 0.36;
	const Rr = (a) => r * (1 + 0.03 * Math.cos(5 * a + seed) + 0.02 * noise3(Math.cos(a) * 2 + seed, Math.sin(a) * 2, seed));
	const face = (side) =>
		grid(40, 8, (u, t) => {
			const a = u * Math.PI * 2;
			const rr = t * Rr(a);
			const x = Math.cos(a) * rr;
			const z = Math.sin(a) * rr;
			const y = (side * th) / 2 + (t < 1 ? side * 0.004 * noise3(x * 30, z * 30, side + seed) - side * 0.006 * (1 - t * t) : 0);
			return [x, y, z, 0.5 + (x / (2 * r)) * 0.97, 0.5 + (z / (2 * r)) * 0.97];
		}, new THREE.Vector3(0, side, 0));
	const side = grid(40, 5, (u, t) => {
		const a = u * Math.PI * 2;
		const ph = -Math.PI / 2 + t * Math.PI;
		const rr = Rr(a) + th * 0.12 * Math.cos(ph);
		return [Math.cos(a) * rr, (Math.sin(ph) * th) / 2, Math.sin(a) * rr, u, t];
	}, (c) => new THREE.Vector3(c.x, 0, c.z));
	const geo = mergeGeometries([mergeGeometries([face(1), face(-1)]), side], true);
	return mesh(geo, [mats.banana, mats.bananaSide]);
}

/** Myrtille : sphère aplatie, couronne étoilée en creux, pruine bleutée. */
export function blueberry(mats, { r = 0.07, seed = 1 } = {}) {
	const geo = smooth(new THREE.IcosahedronGeometry(1, 5));
	eachVertex(geo, (v) => {
		const n = v.clone();
		const a = Math.atan2(n.z, n.x);
		const crown = -0.22 * smoothstep(0.84, 0.98, n.y) + 0.08 * smoothstep(0.76, 0.88, n.y) * (1 - smoothstep(0.9, 0.97, n.y)) * Math.max(0, Math.cos(5 * a + seed));
		v.copy(n).multiplyScalar(r * (1 + crown + 0.025 * noise3(n.x * 3 + seed, n.y * 3, n.z * 3)));
		v.y *= 0.86;
	});
	geo.computeVertexNormals();
	const base = C('#262A58');
	const bloom = C('#6C77AA');
	const crownC = C('#151028');
	paintVertices(geo, (v, c) => {
		const n = v.clone().normalize();
		c.copy(base).lerp(bloom, smoothstep(-0.2, 0.7, noise3(n.x * 3 + seed, n.y * 3, n.z * 3)) * 0.55);
		c.lerp(crownC, smoothstep(0.78, 0.92, n.y) * 0.85);
	});
	return mesh(geo, mats.blueberry);
}

/**
 * Grappe de granola : un cœur collant (miel caramélisé) hérissé de flocons d'avoine plats
 * et dorés, quelques éclats d'amande et graines sombres. Une seule géométrie.
 */
export function granola(mats, { r = 0.1, seed = 1 } = {}) {
	const s = seed * 6.1;
	const rr = rng(seed * 19 + 3);
	const parts = [];
	const core = smooth(new THREE.IcosahedronGeometry(1, 2));
	eachVertex(core, (v) => {
		v.multiplyScalar(r * 0.55 * (1 + 0.3 * fbm(v.x * 1.8 + s, v.y * 1.8, v.z * 1.8, 2)));
		v.y *= 0.6;
	});
	core.computeVertexNormals();
	paintVertices(core, (v, c) => c.copy(C('#9C5A20')).lerp(C('#C98A3C'), noise3(v.x * 30, v.y * 30, v.z * 30) * 0.5 + 0.5));
	parts.push(core);
	const flake = (kind) => {
		const g = smooth(new THREE.IcosahedronGeometry(1, kind === 0 ? 0 : 1));
		const dims = kind === 0 ? [r * 0.24, r * 0.045, r * 0.18] : kind === 1 ? [r * 0.17, r * 0.08, r * 0.11] : [r * 0.07, r * 0.05, r * 0.05];
		eachVertex(g, (v) => {
			v.set(v.x * dims[0], v.y * dims[1], v.z * dims[2]);
			v.multiplyScalar(1 + 0.15 * noise3(v.x * 40 + s, v.y * 40, v.z * 40));
		});
		const tone = kind === 0 ? [C('#E8BE74'), C('#C98A3E'), C('#F3D8A0')] : kind === 1 ? [C('#E9D2A8'), C('#C79A60'), C('#F5E6C8')] : [C('#3A2210'), C('#5A3418'), C('#2A180A')];
		const k = rr();
		paintVertices(g, (v, c) => c.copy(tone[0]).lerp(tone[1], k * 0.8).lerp(tone[2], smoothstep(0.3, 0.9, noise3(v.x * 60, v.y * 60, v.z * 60)) * 0.4));
		return g;
	};
	const n = new THREE.Vector3();
	const q = new THREE.Quaternion();
	const m4 = new THREE.Matrix4();
	const count = 30;
	for (let i = 0; i < count; i++) {
		const kind = i < 24 ? 0 : i < 27 ? 1 : 2;
		const g = flake(kind);
		n.set(rr() * 2 - 1, (rr() * 2 - 1) * 0.6, rr() * 2 - 1).normalize();
		const d = r * (0.3 + rr() * 0.42);
		q.setFromEuler(new THREE.Euler(rr() * Math.PI, rr() * Math.PI * 2, rr() * Math.PI));
		m4.compose(n.clone().multiplyScalar(d).setY(n.y * d * 0.7), q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.8 + rr() * 0.5));
		g.applyMatrix4(m4);
		parts.push(g);
	}
	const geo = mergeGeometries(parts.map((g) => {
		g.deleteAttribute('uv');
		g.deleteAttribute('normal');
		return g;
	}));
	geo.computeVertexNormals();
	return mesh(geo, mats.granola);
}

/** Copeau de noix de coco : fine lamelle blanche recourbée, liseré brun. */
export function coconutFlake(mats, { L = 0.16, W = 0.06, seed = 1 } = {}) {
	const geo = grid(10, 3, (u, v) => {
		const a = (u - 0.5) * 1.6;
		const w = (v - 0.5) * W * (0.7 + 0.3 * Math.sin(u * Math.PI));
		return [Math.sin(a) * L * 0.6, (1 - Math.cos(a)) * L * 0.4 + 0.01 * noise3(u * 4 + seed, v, seed), w, u, v];
	}, new THREE.Vector3(0, 1, 0));
	gridColors(geo, 10, 3, (u, v, p, c) => c.copy(C('#FBF8F0')).lerp(C('#A67A4E'), smoothstep(0.75, 1, Math.abs(v - 0.5) * 2) * (v > 0.5 ? 0.9 : 0.2)));
	return mesh(geo, mats.coconut);
}

/** Feuille de menthe : ovale denté, nervures en creux. */
export function mintLeaf(mats, { size = 0.16, seed = 1 } = {}) {
	const geo = grid(14, 18, (u, v) => {
		const xn = u * 2 - 1;
		const w = Math.sin(Math.PI * v) ** 0.8 * size * 0.38;
		const tooth = 1 + 0.08 * Math.abs(Math.sin(v * 26));
		const x = xn * w * tooth;
		const vein = 0.006 * Math.abs(Math.sin((v - Math.abs(xn) * 0.4) * 18)) * (1 - Math.abs(xn));
		const z = 0.25 * size * xn * xn - 0.1 * size * (v - 0.5) ** 2 - vein;
		return [x, v * size, z, u, v];
	}, new THREE.Vector3(0, 0, -1));
	gridColors(geo, 14, 18, (u, v, p, c) => {
		const mid = smoothstep(0.08, 0, Math.abs(u - 0.5));
		c.copy(C('#3E8C2E')).lerp(C('#2A6A1E'), Math.abs(u - 0.5) * 1.2).lerp(C('#8CC46A'), mid * 0.7);
	});
	return mesh(geo, mats.mint);
}

/** Bol en grès sombre émaillé, pied annulaire. Fond intérieur à y ≈ 0.11, bord à 0.78. */
export function bowl(mats) {
	const prof = [
		[0, 0.06], [0.4, 0.06], [0.43, 0.012], [0.47, 0], [0.53, 0], [0.56, 0.05], [0.8, 0.16], [1.0, 0.34], [1.12, 0.56],
		[1.18, 0.72], [1.2, 0.77], [1.185, 0.79], [1.15, 0.78], [1.1, 0.66], [0.98, 0.42], [0.78, 0.24], [0.45, 0.13], [0, 0.11],
	].map(([r, y]) => new THREE.Vector2(r, y));
	const geo = smooth(new THREE.LatheGeometry(prof, 120));
	geo.computeVertexNormals();
	const glaze = C('#211821');
	const glaze2 = C('#2E2230');
	const speck = C('#8C7A86');
	const rim = C('#6E5C66');
	const foot = C('#9A8A7C');
	paintVertices(geo, (v, c) => {
		c.copy(glaze).lerp(glaze2, noise3(v.x * 3, v.y * 3, v.z * 3) * 0.5 + 0.5);
		c.lerp(speck, smoothstep(0.82, 0.95, noise3(v.x * 40, v.y * 40, v.z * 40)) * 0.6);
		c.lerp(rim, smoothstep(0.76, 0.79, v.y) * 0.8);
		c.lerp(foot, smoothstep(0.03, 0.0, v.y) * smoothstep(0.38, 0.45, Math.hypot(v.x, v.z)));
	});
	const g = new THREE.Group();
	g.add(mesh(geo, mats.bowl));
	return g;
}

/**
 * Crème d'açaí qui remplit le bol : dôme doux, spirale de soft-serve, givre.
 * Retourne { mesh, H(x, z) } (hauteur de la surface).
 */
export function acaiFill(mats, { R = 1.04, base = 0.6, seed = 3 } = {}) {
	const H = (x, z) => {
		const rho = Math.min(1, Math.hypot(x, z) / R);
		const a = Math.atan2(z, x);
		const dome = 0.14 * Math.max(0, 1 - rho * rho) ** 1.2;
		const ridge = (0.5 + 0.5 * Math.sin(a * 1 - rho * 10 + seed)) ** 2;
		const swirl = 0.035 * ridge * smoothstep(0.04, 0.25, rho) * smoothstep(1, 0.75, rho);
		const lump = 0.012 * fbm(x * 3 + seed, z * 3, seed, 3);
		return base + dome + swirl + lump;
	};
	const NU = 128;
	const NV = 34;
	const geo = grid(NU, NV, (u, t) => {
		const a = u * Math.PI * 2;
		const rr = R * t;
		const x = Math.cos(a) * rr;
		const z = Math.sin(a) * rr;
		return [x, H(x, z) - 0.04 * smoothstep(0.92, 1, t), z, 0.5 + (x / (2 * R)) * 0.75, 0.5 + (z / (2 * R)) * 0.75];
	}, new THREE.Vector3(0, 1, 0));
	weldSeam(geo, NU, NV);
	const photo = !!mats.acaiTop.map;
	const deep = C(photo ? '#B8A6BC' : '#33103A');
	const mid = C(photo ? '#FFFFFF' : '#54205C');
	const light = C(photo ? '#FFFFFF' : '#8A4C90');
	const frost = C(photo ? '#FFFFFF' : '#C7A2CC');
	gridColors(geo, NU, NV, (u, t, p, c) => {
		const a = u * Math.PI * 2;
		const ridge = (0.5 + 0.5 * Math.sin(a - t * 10 + seed)) ** 2;
		c.copy(mid).lerp(deep, (1 - ridge) * 0.6 + smoothstep(0.85, 1, t) * 0.4);
		c.lerp(light, ridge * 0.45 * smoothstep(0.05, 0.3, t));
		c.lerp(frost, smoothstep(0.78, 0.95, noise3(p.x * 18 + seed, p.y * 18, p.z * 18)) * 0.35);
		if (!photo) c.lerp(C('#4A1A6A'), smoothstep(0.2, 0.7, noise3(p.x * 2, p.z * 2, seed)) * 0.25);
	});
	const m = mesh(geo, photo ? mats.acaiTop : mats.acai);
	m.receiveShadow = true;
	return { mesh: m, H };
}

/** Cuillère en bois : cuilleron creux, manche effilé légèrement relevé. Cuilleron à l'origine. */
export function woodSpoon(mats) {
	const bowlG = new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
	bowlG.scale(0.16, 0.065, 0.22);
	bowlG.translate(0, 0.065, 0);
	const handle = new RoundedBoxGeometry(0.07, 0.026, 1.15, 2, 0.012);
	eachVertex(handle, (v) => {
		const t = v.z / 1.15 + 0.5;
		v.x *= 1 - 0.35 * t;
		v.y += 0.06 * t * t + 0.05;
		v.z += 0.2 + 1.15 / 2;
	});
	handle.computeVertexNormals();
	const g = new THREE.Group();
	g.add(mesh(bowlG, mats.bambooDS));
	g.add(mesh(handle, mats.bamboo));
	return g;
}

/* ---------------------------------------------------------------------------
   Sauces, petites garnitures instanciées
   ------------------------------------------------------------------------ */
/**
 * Coulis de sauce le long d'une courbe (épaisseur irrégulière, aplati sur le dessous).
 * Le maillage expose userData.reveal(p) : la sauce se dépose progressivement.
 */
export function sauceTube(mat, points, { radius = 0.024, seed = 10, SEG = 220, RAD = 10, flat = 0.6 } = {}) {
	const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
	const geo = new THREE.TubeGeometry(curve, SEG, radius, RAD, false);
	const p = geo.attributes.position;
	const c = new THREE.Vector3();
	const o = new THREE.Vector3();
	for (let i = 0; i <= SEG; i++) {
		const t = i / SEG;
		curve.getPointAt(t, c);
		const k = (0.7 + 0.45 * (noise3(t * 14, seed, 0.5) * 0.5 + 0.5)) * Math.sqrt(smoothstep(0, 0.03, t)) * Math.sqrt(smoothstep(1, 0.97, t));
		for (let j = 0; j <= RAD; j++) {
			const idx = i * (RAD + 1) + j;
			o.fromBufferAttribute(p, idx).sub(c);
			o.x *= k * 1.15;
			o.z *= k * 1.15;
			o.y = o.y * k * flat - radius * 0.2;
			p.setXYZ(idx, c.x + o.x, c.y + o.y, c.z + o.z);
		}
	}
	geo.computeVertexNormals();
	const m = mesh(geo, mat);
	const total = geo.index.count;
	m.userData.indexCount = total;
	m.userData.reveal = (k) => {
		m.visible = k > 0;
		geo.setDrawRange(0, Math.ceil(clamp(k) * SEG) * RAD * 6);
	};
	return m;
}

/** Filet de sauce qui serpente sur une surface (zigzag). height(x, z) donne l'altitude. */
export function drizzle(mats, mat, { width = 1.2, depth = 0.7, turns = 5, height = () => 0.4, radius = 0.024, seed = 10 } = {}) {
	const r = rng(seed);
	const pts = [];
	const n = turns * 2 + 1;
	for (let i = 0; i < n; i++) {
		const x = (i / (n - 1) - 0.5) * width + (r() - 0.5) * 0.06;
		const z = (i % 2 ? 0.5 : -0.5) * depth * (0.75 + r() * 0.25);
		pts.push(new THREE.Vector3(x, height(x, z) + radius * 0.6, z));
		if (i < n - 1) {
			const xm = x + width / (n - 1) / 2;
			const zm = (r() - 0.5) * depth * 0.2;
			pts.push(new THREE.Vector3(xm, height(xm, zm) + radius * 0.8, zm));
		}
	}
	return sauceTube(mat, pts, { radius, seed, SEG: 260 });
}

/** Petits éclats posés sur une surface (graines de chia, piment…). */
export function sprinkle(geo, mat, count, height, { rx = 0.55, rz = 0.5, seed = 13, colors = null, lift = 0.01 } = {}) {
	const im = new THREE.InstancedMesh(geo, mat, count);
	const r = rng(seed);
	const m4 = new THREE.Matrix4();
	const q = new THREE.Quaternion();
	const e = new THREE.Euler();
	for (let i = 0; i < count; i++) {
		const a = r() * Math.PI * 2;
		const d = Math.sqrt(r());
		const x = Math.cos(a) * d * rx;
		const z = Math.sin(a) * d * rz;
		e.set(r() * Math.PI, r() * Math.PI, r() * Math.PI);
		q.setFromEuler(e);
		const s = 0.6 + r() * 0.8;
		m4.compose(new THREE.Vector3(x, height(x, z) + lift, z), q, new THREE.Vector3(s, s, s));
		im.setMatrixAt(i, m4);
		if (colors) im.setColorAt(i, colors[Math.floor(r() * colors.length)]);
	}
	return im;
}

export const chiaGeo = () => {
	const g = new THREE.SphereGeometry(0.012, 6, 4);
	g.scale(1, 0.6, 0.75);
	return g;
};

/* ---------------------------------------------------------------------------
   Pic à drapeau, planche, miettes
   ------------------------------------------------------------------------ */
/** Pic droit avec drapeau « LAZEEZ » qui flotte. La pointe est à y = 0. Retourne { group, flag, wave(t) }. */
export function flagPick(mats, length = 2.5) {
	const g = new THREE.Group();
	const shaft = new THREE.CylinderGeometry(0.022, 0.014, length, 12);
	shaft.translate(0, length / 2 + 0.08, 0);
	const tip = new THREE.ConeGeometry(0.014, 0.08, 12);
	tip.rotateX(Math.PI);
	tip.translate(0, 0.04, 0);
	const ball = new THREE.SphereGeometry(0.04, 16, 12);
	ball.translate(0, length + 0.1, 0);
	g.add(mesh(mergeGeometries([shaft, tip, ball]), mats.bamboo));

	const W = 0.92;
	const H = 0.57;
	const fg = new THREE.PlaneGeometry(W, H, 28, 14);
	fg.translate(W / 2, 0, 0);
	const base = fg.attributes.position.array.slice();
	const flag = mesh(fg, mats.flag);
	flag.position.set(0.02, length - H / 2 + 0.02, 0);
	const back = mesh(fg, mats.flagBack);
	flag.add(back);
	g.add(flag);
	const wave = (t, amp = 1) => {
		const p = fg.attributes.position;
		for (let i = 0; i < p.count; i++) {
			const x = base[i * 3];
			const y = base[i * 3 + 1];
			const k = x / W;
			const z = (Math.sin(x * 6.5 - t * 4.2) * 0.07 + Math.sin(x * 3 + y * 4 - t * 2.3) * 0.025) * k * amp;
			p.setXYZ(i, x - k * k * 0.03 * amp, y - k * 0.03 * Math.sin(t * 2), z);
		}
		p.needsUpdate = true;
		fg.computeVertexNormals();
	};
	wave(0);
	return { group: g, flag, wave };
}

/** Planche d'ardoise aux bords irréguliers. */
export function slateBoard(mats, w = 4.6, d = 1.5) {
	const geo = new RoundedBoxGeometry(w, 0.09, d, 3, 0.02);
	eachVertex(geo, (v) => {
		const ex = smoothstep(w / 2 - 0.12, w / 2, Math.abs(v.x));
		const ez = smoothstep(d / 2 - 0.1, d / 2, Math.abs(v.z));
		const e = Math.max(ex, ez);
		const n = noise3(v.x * 3, v.y * 3, v.z * 3);
		v.x -= Math.sign(v.x) * ex * Math.abs(n) * 0.06;
		v.z -= Math.sign(v.z) * ez * Math.abs(n) * 0.05;
		if (v.y > 0) v.y += e * n * 0.01 + 0.004 * noise3(v.x * 2, 0, v.z * 6);
	});
	geo.computeVertexNormals();
	const m = mesh(geo, mats.slate);
	m.receiveShadow = true;
	return m;
}

/**
 * Miettes de galette, farine et graines posées sur l'ardoise autour du plat
 * (anneau elliptique). Origine : dessus de l'ardoise.
 */
export function crumbs(mats, count = 30, { rx = 1.5, rx2 = 2.1, rz = 1.1, seed = 15 } = {}) {
	const geo = smooth(new THREE.IcosahedronGeometry(0.022, 1));
	eachVertex(geo, (v) => {
		v.multiplyScalar(1 + noise3(v.x * 60, v.y * 60, v.z * 60) * 0.35);
		v.y *= 0.55;
	});
	geo.computeVertexNormals();
	const im = new THREE.InstancedMesh(geo, mats.bits, count);
	const pal = ['#F1E3C2', '#E6CE9C', '#C99A5B', '#F6EEDC', '#8E5A2A'].map(C);
	const r = rng(seed);
	const m4 = new THREE.Matrix4();
	const q = new THREE.Quaternion();
	const e = new THREE.Euler();
	for (let i = 0; i < count; i++) {
		const a = r() * Math.PI * 2;
		const d = 1 + r() * r() * (rx2 / rx - 1);
		const x = Math.cos(a) * d * rx;
		const z = Math.max(-rz, Math.min(rz, Math.sin(a) * d * rz));
		e.set(r() * 0.6, r() * Math.PI * 2, r() * 0.6);
		q.setFromEuler(e);
		const s = 0.45 + r() * r() * 1.4;
		m4.compose(new THREE.Vector3(x, 0.008 * s, z), q, new THREE.Vector3(s, s, s));
		im.setMatrixAt(i, m4);
		im.setColorAt(i, pal[Math.floor(r() * pal.length)]);
	}
	return im;
}

/* ---------------------------------------------------------------------------
   Boissons : canette générique Lazeez, gobelet d'açaí à couvercle dôme
   ------------------------------------------------------------------------ */
/**
 * Canette 375 ml (proportions réelles : Ø 66 mm, 122 mm). Corps imprimé (étiquette Lazeez),
 * épaule et couvercle en aluminium, languette, gouttes de condensation. Base à y = 0.
 */
export function sodaCan(mats) {
	const g = new THREE.Group();
	const R = 0.52;
	const V = (r, y) => new THREE.Vector2(r, y);
	const body = new THREE.CylinderGeometry(R, R, 1.42, 96, 1, true);
	// Les deux « LAZEEZ » (u = 0.25 et 0.75) face à +Z et -Z.
	body.rotateY(-Math.PI / 2);
	body.translate(0, 0.2 + 0.71, 0);
	g.add(mesh(body, mats.can));
	const lathe = (pts, seg = 96) => {
		const geo = new THREE.LatheGeometry(pts.map(([r, y]) => V(r, y)), seg);
		return mesh(geo, mats.alu);
	};
	// Fond : chanfrein, anneau d'appui, dôme rentrant.
	g.add(lathe([[0, 0.12], [0.2, 0.1], [0.33, 0.05], [0.39, 0.012], [0.42, 0], [0.45, 0.008], [0.49, 0.05], [0.513, 0.12], [R, 0.2]]));
	// Épaule, col, sertissage, couvercle en creux.
	g.add(lathe([
		[R, 1.62], [0.515, 1.66], [0.495, 1.71], [0.465, 1.765], [0.448, 1.8], [0.452, 1.825], [0.455, 1.85], [0.448, 1.868],
		[0.432, 1.866], [0.425, 1.85], [0.418, 1.815], [0.4, 1.808], [0.33, 1.812], [0.3, 1.818], [0.28, 1.812], [0.1, 1.81], [0, 1.81],
	], 120));
	// Languette (anneau ajouré) + rivet + ligne d'ouverture.
	const tab = new THREE.Shape();
	tab.absarc(0, 0.08, 0.075, 0, Math.PI, false);
	tab.lineTo(-0.075, -0.12);
	tab.absarc(0, -0.12, 0.075, Math.PI, Math.PI * 2, false);
	tab.lineTo(0.075, 0.08);
	const hole = new THREE.Path();
	hole.absellipse(0, -0.11, 0.045, 0.05, 0, Math.PI * 2, true);
	tab.holes.push(hole);
	const tabG = new THREE.ExtrudeGeometry(tab, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 16 });
	tabG.rotateX(-Math.PI / 2);
	tabG.translate(0, 1.822, 0.06);
	g.add(mesh(tabG, mats.alu));
	const rivet = new THREE.CylinderGeometry(0.03, 0.034, 0.02, 16);
	rivet.translate(0, 1.82, 0.0);
	g.add(mesh(rivet, mats.alu));
	const mouth = new THREE.CatmullRomCurve3(
		Array.from({ length: 24 }, (_, i) => {
			const a = (i / 24) * Math.PI * 2;
			return new THREE.Vector3(Math.cos(a) * 0.12 * (1 - 0.35 * Math.sin(a)), 1.812, -0.2 + Math.sin(a) * 0.08);
		}),
		true
	);
	g.add(mesh(new THREE.TubeGeometry(mouth, 48, 0.006, 5, true), mats.alu));
	// Gouttes de condensation sur le corps (fraîche !).
	const N = 70;
	const drop = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
	const im = new THREE.InstancedMesh(drop, mats.droplet, N);
	const r = rng(17);
	const m4 = new THREE.Matrix4();
	const q = new THREE.Quaternion();
	const up = new THREE.Vector3(0, 1, 0);
	for (let i = 0; i < N; i++) {
		const a = r() * Math.PI * 2;
		const y = 0.3 + r() * 1.25;
		const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
		q.setFromUnitVectors(up, n);
		const sz = 0.006 + r() * r() * 0.016;
		m4.compose(n.clone().multiplyScalar(R - sz * 0.1).setY(y), q, new THREE.Vector3(sz, sz * 0.45, sz * (1.1 + r() * 0.5)));
		im.setMatrixAt(i, m4);
	}
	im.renderOrder = 2;
	g.add(im);
	return { group: g, update() {} };
}

/**
 * Gobelet d'açaí à emporter : plastique transparent, couches visibles (açaí, granola,
 * banane), garniture sous un couvercle dôme percé. Base à y = 0.
 */
export function acaiCup(mats) {
	const g = new THREE.Group();
	const r0 = 0.4;
	const r1 = 0.56;
	const Hc = 1.36;
	const cupR = (y) => r0 + ((r1 - r0) * y) / Hc;
	const V = (r, y) => new THREE.Vector2(r, y);
	// Contenu (dessiné avant le plastique).
	const inner = [[0, 0.022]];
	for (let i = 0; i <= 40; i++) {
		const y = 0.03 + (i / 40) * (1.2 - 0.03);
		inner.push([cupR(y) - 0.016, y]);
	}
	inner.push([cupR(1.22) - 0.03, 1.235], [0.3, 1.27], [0, 1.29]);
	const fillGeo = new THREE.LatheGeometry(inner.map(([r, y]) => V(r, y)), 96);
	eachVertex(fillGeo, (v) => {
		const band = smoothstep(0.5, 0.56, v.y) * smoothstep(0.74, 0.68, v.y);
		const k = 1 + band * 0.02 * noise3(v.x * 30, v.y * 30, v.z * 30) - 0.006 * (1 - band) * (noise3(v.x * 8, v.y * 8, v.z * 8) * 0.5 + 0.5);
		v.x *= k;
		v.z *= k;
	});
	fillGeo.computeVertexNormals();
	paintVertices(fillGeo, (v, c) => {
		const band = smoothstep(0.5, 0.55, v.y) * smoothstep(0.74, 0.69, v.y);
		c.copy(C('#33103A')).lerp(C('#5A2262'), smoothstep(-0.3, 0.8, noise3(v.x * 6, v.y * 9, v.z * 6)) * 0.6);
		c.lerp(C('#8E5596'), smoothstep(0.82, 0.96, noise3(v.x * 30, v.y * 30, v.z * 30)) * 0.25);
		const oats = C('#C38A42').lerp(C('#8E5420'), noise3(v.x * 40, v.y * 40, v.z * 40) * 0.5 + 0.5);
		c.lerp(oats, band);
	});
	const fill = mesh(fillGeo, mats.acai, false);
	fill.renderOrder = 1;
	g.add(fill);
	// Rondelles de banane plaquées contre la paroi (couche du milieu) et fraises en haut.
	const r = rng(23);
	for (let i = 0; i < 5; i++) {
		const a = (i / 5) * Math.PI * 2 + 0.4;
		const y = 0.86 + (i % 2) * 0.08;
		const coin = bananaCoin(mats, { r: 0.12, seed: i + 3 });
		coin.position.set(Math.cos(a) * (cupR(y) - 0.07), y, Math.sin(a) * (cupR(y) - 0.07));
		coin.lookAt(coin.position.clone().multiplyScalar(2).setY(y));
		coin.rotateX(Math.PI / 2);
		coin.renderOrder = 1;
		g.add(coin);
	}
	// Garniture sur le dessus.
	const topY = (x, z) => 1.27 - 0.05 * (Math.hypot(x, z) / 0.5) ** 2;
	const put = (o, x, z, lift, rot) => {
		o.position.set(x, topY(x, z) + lift, z);
		o.rotation.set(...rot);
		o.traverse((m) => (m.renderOrder = 1));
		g.add(o);
	};
	[[0.2, 0.1], [-0.12, 0.22], [0.05, -0.24]].forEach(([x, z], i) => {
		put(strawberryHalf(mats, { H: 0.28, R: 0.12, seed: i + 2 }), x, z, 0.08, [-Math.PI / 2 + 0.4, r() * 6, 0.3]);
	});
	[[-0.25, -0.05], [0.28, -0.18]].forEach(([x, z], i) => put(bananaCoin(mats, { r: 0.12, seed: i + 9 }), x, z, 0.03, [0.3, 0, 0.2 * (i ? 1 : -1)]));
	[[-0.05, 0.05], [0.1, 0.32], [-0.3, 0.15], [0.22, -0.02]].forEach(([x, z], i) => put(granola(mats, { r: 0.08, seed: i + 1 }), x, z, 0.03, [0, r() * 6, 0]));
	[[0.02, 0.2], [-0.18, -0.2], [0.32, 0.12], [-0.06, -0.08], [0.15, -0.3]].forEach(([x, z], i) => put(blueberry(mats, { r: 0.06, seed: i }), x, z, 0.05, [0.3, r() * 6, 0]));
	// Gobelet : paroi fine, bord roulé.
	const cup = [[0, 0], [r0 - 0.02, 0], [r0, 0.018]];
	for (let i = 1; i <= 16; i++) {
		const y = (i / 16) * Hc;
		cup.push([cupR(y), y]);
	}
	cup.push([r1 + 0.012, Hc + 0.008], [r1 + 0.02, Hc + 0.022], [r1 + 0.008, Hc + 0.032], [r1 - 0.006, Hc + 0.016]);
	for (let i = 16; i >= 1; i--) {
		const y = (i / 16) * Hc - 0.004;
		cup.push([cupR(y) - 0.008, y]);
	}
	cup.push([r0 - 0.02, 0.012], [0, 0.012]);
	const wall = mesh(new THREE.LatheGeometry(cup.map(([rr, y]) => V(rr, y)), 96), mats.glass, false);
	wall.renderOrder = 3;
	// Couvercle dôme avec rebord et trou central.
	const lid = [[r1 + 0.03, Hc + 0.012], [r1 + 0.036, Hc + 0.04], [r1 + 0.012, Hc + 0.05], [r1 - 0.012, Hc + 0.064]];
	for (let i = 1; i <= 14; i++) {
		const a = (i / 14) * (Math.PI / 2) * 0.86;
		lid.push([0.1 + (r1 - 0.12) * Math.cos(a), Hc + 0.064 + 0.42 * Math.sin(a)]);
	}
	lid.push([0.1, Hc + 0.5], [0.075, Hc + 0.5], [0.075, Hc + 0.47]);
	const dome = mesh(new THREE.LatheGeometry(lid.map(([rr, y]) => V(rr, y)), 96), mats.glass, false);
	dome.renderOrder = 4;
	g.add(wall, dome);
	return { group: g, settle() {} };
}

/* ---------------------------------------------------------------------------
   Effets
   ------------------------------------------------------------------------ */
/** Petites étincelles « dessinées » (traits crème) autour d'un impact. */
export function sparks(mats, count = 9) {
	const g = new THREE.Group();
	const geo = new THREE.CapsuleGeometry(0.018, 0.22, 4, 8);
	for (let i = 0; i < count; i++) {
		const m = new THREE.Mesh(geo, mats.spark);
		const a = (i / count) * Math.PI * 2;
		m.userData.dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
		m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), m.userData.dir);
		m.visible = false;
		g.add(m);
	}
	/** k : 0 → 1 (vie de l'étincelle). */
	g.userData.play = (k, radius = 0.8) => {
		g.children.forEach((m) => {
			m.visible = k > 0 && k < 1;
			const e = 1 - (1 - k) ** 3;
			m.position.copy(m.userData.dir).multiplyScalar(radius * (0.45 + e * 0.6));
			const s = Math.sin(Math.min(1, k) * Math.PI);
			m.scale.set(1, Math.max(0.001, s), 1);
		});
	};
	return g;
}

/** Ombre de contact douce posée au sol. */
export function contactShadow(mats, w = 2.6, d = 2) {
	const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mats.shadow);
	m.rotation.x = -Math.PI / 2;
	m.renderOrder = -1;
	return m;
}
