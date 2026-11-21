/**
 * Scroll animations for every section (GSAP + ScrollTrigger + SplitText).
 * Values the 3D needs are written into `state`.
 */
export function initSections(state, lenis) {
	const { gsap, ScrollTrigger, SplitText } = window;
	const $ = (s, c = document) => c.querySelector(s);
	const $$ = (s, c = document) => [...c.querySelectorAll(s)];

	/* ---------- Titles: letters rise out of a mask ---------- */
	$$('[data-split-chars]').forEach((el) => {
		SplitText.create(el, {
			type: 'lines,chars',
			mask: 'lines',
			linesClass: 'split-line',
			charsClass: 'split-char',
			autoSplit: true,
			onSplit: (self) =>
				gsap.from(self.chars, {
					yPercent: 115,
					rotation: 'random(-14, 14)',
					duration: 1.1,
					ease: 'back.out(1.4)',
					stagger: { each: 0.025, from: 'start' },
					scrollTrigger: { trigger: el, start: 'top 85%', once: true },
					// Reveal done: release the masks (the 'jelly' letters can jump).
					onComplete: () => {
						(self.masks || []).forEach((m) => (m.style.overflow = 'visible'));
						self.lines.forEach((l) => (l.style.overflow = 'visible'));
					},
				}),
		});
	});

	$$('[data-split-lines]').forEach((el) => {
		SplitText.create(el, {
			type: 'lines',
			mask: 'lines',
			linesClass: 'split-line',
			autoSplit: true,
			onSplit: (self) => gsap.from(self.lines, { yPercent: 105, duration: 1.1, stagger: 0.1, ease: 'expo.out', delay: 1.1 }),
		});
	});

	/* ---------- 'Jelly' titles: each letter jumps as the mouse passes ---------- */
	$$('[data-jelly]').forEach((el) => {
		el.addEventListener('pointermove', (e) => {
			const ch = e.target.closest('.split-char');
			if (!ch || gsap.isTweening(ch)) return;
			gsap.fromTo(ch, { y: 0, scaleY: 1 }, { y: '-0.22em', scaleY: 1.12, duration: 0.22, yoyo: true, repeat: 1, ease: 'power2.out', transformOrigin: '50% 100%', color: '#F4B421', clearProps: 'color' });
		});
	});

	/* ---------- Self-drawing illustration: one brush stroke reveals it ----------
	   (a one-stroke mask over an image: almost free, unlike live-drawing
	   dozens of SVG outlines). */
	$$('[data-draw-reveal]').forEach((svg) => {
		const brush = svg.querySelector('[data-brush]');
		if (!brush) return;
		const len = brush.getTotalLength();
		brush.style.strokeDasharray = `${len} ${len}`;
		brush.style.strokeDashoffset = len;
		gsap.to(brush, {
			strokeDashoffset: 0,
			duration: 1.9,
			ease: 'power1.inOut',
			scrollTrigger: { trigger: svg, start: 'top 80%', once: true },
		});
	});

	/* ---------- Generic parallax ---------- */
	$$('[data-parallax]').forEach((el) => {
		const amt = parseFloat(el.dataset.parallax) || 10;
		gsap.fromTo(el, { yPercent: -amt }, {
			yPercent: amt,
			ease: 'none',
			scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
		});
	});

	/* ---------- Hand lettering: revealed like a brush stroke ---------- */
	// Transform-based wipe (GPU-composited): no animated clip-path that would
	// force a complex SVG to repaint every frame.
	$$('[data-sign]').forEach((el) => {
		const wipe = document.createElement('span');
		wipe.className = 'wipe';
		const inner = document.createElement('span');
		inner.className = 'wipe__in';
		el.replaceWith(wipe);
		wipe.appendChild(inner);
		inner.appendChild(el);
		gsap.timeline({ scrollTrigger: { trigger: wipe, start: 'top 85%', once: true } })
			.fromTo(wipe, { xPercent: -100 }, { xPercent: 0, duration: 1.6, ease: 'power2.inOut' }, 0)
			.fromTo(inner, { xPercent: 100 }, { xPercent: 0, duration: 1.6, ease: 'power2.inOut' }, 0);
	});

	/* ---------- 01 Hero ---------- */
	const hero = $('.s-hero');
	if (hero) {
		ScrollTrigger.create({
			trigger: hero,
			start: 'top top',
			end: 'bottom top',
			scrub: true,
			onUpdate: (s) => (state.hero.p = s.progress),
		});
		// Animate the logo inside the title, not the title itself: the title is centred with
		// CSS translate(-50%, -54%), which GSAP would bake into pixels if it touched it, and
		// then a resize/rotation (desktop -> phone, Android rotate) left it over the topbar.
		gsap.to('.s-hero__logo', {
			yPercent: 30,
			scale: 0.86,
			ease: 'none',
			scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
		});
		gsap.to('.s-hero__motif', {
			// CSS already tilts it -8deg (rotate property): +14 lands on the same 6deg as before.
			rotate: 14,
			scale: 1.2,
			ease: 'none',
			scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
		});
		gsap.to('.s-hero__kicker, .s-hero__foot, .s-hero__scroll', {
			opacity: 0,
			y: -40,
			ease: 'none',
			scrollTrigger: { trigger: hero, start: 'top top', end: '45% top', scrub: true },
		});
		addEventListener('pointermove', (e) => {
			state.hero.mx = (e.clientX / innerWidth) * 2 - 1;
			state.hero.my = (e.clientY / innerHeight) * 2 - 1;
		});
		addEventListener('deviceorientation', (e) => {
			if (e.gamma == null) return;
			state.hero.mx = gsap.utils.clamp(-1, 1, e.gamma / 30);
			state.hero.my = gsap.utils.clamp(-1, 1, (e.beta - 45) / 30);
		});
	}

	/* ---------- Topbar logo: rotates with scroll velocity ---------- */
	const badge = $('.topbar__logo');
	if (badge) {
		const rot = gsap.quickTo(badge, 'rotation', { duration: 0.6, ease: 'power3' });
		ScrollTrigger.create({ onUpdate: (s) => rot(gsap.utils.clamp(-20, 20, s.getVelocity() / 120)) });
	}

	/* ---------- Infinite marquees, sped up by scrolling ---------- */
	const loops = [];
	const loop = (row, dir, speed) => {
		const track = row.firstElementChild;
		// Exact loop period: distance between the 1st item and its copy
		// (content duplicated twice). Measuring a single item made the strip jump.
		const kids = [...track.children];
		const half = kids.length / 2;
		const w = half >= 1 ? kids[half].offsetLeft - kids[0].offsetLeft : 0;
		if (!w) return;
		gsap.set(track, { x: dir > 0 ? 0 : -w });
		const tw = gsap.to(track, { x: dir > 0 ? -w : 0, duration: w / speed, ease: 'none', repeat: -1 });
		loops.push(tw);
	};
	$$('[data-marquee]').forEach((m) => loop(m, Number(m.dataset.marquee), 90));
	$$('[data-names-row]').forEach((m) => loop(m, Number(m.dataset.namesRow), 70));
	if (loops.length) {
		let boost = 1;
		ScrollTrigger.create({
			onUpdate: (s) => {
				boost = 1 + Math.min(5, Math.abs(s.getVelocity()) / 300);
			},
		});
		gsap.ticker.add(() => {
			boost += (1 - boost) * 0.05;
			loops.forEach((l) => l.timeScale(boost));
		});
	}
	gsap.from('.marquee--a', {
		rotate: -8,
		ease: 'none',
		scrollTrigger: { trigger: '.s-marquee', start: 'top bottom', end: 'bottom top', scrub: true },
	});

	/* ---------- 03 Definition ---------- */
	const words = $('[data-words]');
	if (words) {
		const split = SplitText.create(words, { type: 'words', wordsClass: 'split-word' });
		gsap.fromTo(split.words, { opacity: 0.12 }, {
			opacity: 1,
			stagger: 0.08,
			ease: 'none',
			scrollTrigger: { trigger: words, start: 'top 78%', end: 'bottom 50%', scrub: true },
		});
	}
	gsap.from('[data-stamp]', {
		scale: 0.82,
		rotate: -4,
		ease: 'none',
		scrollTrigger: { trigger: '.s-def', start: 'top bottom', end: 'center center', scrub: true },
	});

	/* ---------- 04 The kebab builds itself (pinned) ---------- */
	const buildPin = $('[data-build-pin]');
	if (buildPin) {
		const steps = $$('.s-build__step');
		const bar = $('[data-build-bar]');
		const result = $('[data-build-result]');
		const twist = $('[data-build-twist]');
		const marks = [0.02, 0.14, 0.36, 0.46, 0.57, 0.66];
		const show = (el, on) => gsap.to(el, { autoAlpha: on ? 1 : 0, y: on ? 0 : 24, duration: 0.5, overwrite: true });
		let rOn = false;
		let tOn = false;
		let stepsHidden = false;
		const stepsEl = $('.s-build__steps');
		// Mobile: "A kebab, built simple" fades out when the bread drops, the dish name
		// takes its place and the board moves up (no overlap with the steps).
		const intro = $('.s-build__intro');
		const small = matchMedia('(max-width: 760px)');
		let introOff = false;
		ScrollTrigger.create({
			trigger: buildPin,
			start: 'top top',
			end: () => '+=' + innerHeight * 4,
			pin: true,
			// No anticipatePin: with Lenis it pins ~40px early and the section visibly snaps.
			scrub: true,
			onUpdate: (s) => {
				const p = s.progress;
				state.build.p = p;
				if (bar) bar.style.transform = `scaleX(${p})`;
				steps.forEach((li, i) => {
					li.classList.toggle('is-active', p >= marks[i] && p < marks[i + 1]);
					li.classList.toggle('is-done', p >= marks[i + 1]);
				});
				const r = p > 0.7 && p < 0.82;
				const t = p > 0.88;
				if (r !== rOn) show(result, (rOn = r));
				if (t !== tOn) show(twist, (tOn = t));
				const off = small.matches && p > 0.015;
				if (off !== introOff) gsap.to(intro, { autoAlpha: (introOff = off) ? 0 : 1, duration: 0.45, overwrite: true });
				const hide = p > 0.8;
				if (hide !== stepsHidden) gsap.to(stepsEl, { autoAlpha: (stepsHidden = hide) ? 0 : 1, duration: 0.3, overwrite: true });
			},
		});
	}

	/* ---------- 05 Horizontal gallery (pinned) ---------- */
	const gPin = $('[data-gallery-pin]');
	const track = $('[data-gallery-track]');
	if (gPin && track) {
		const dist = () => track.scrollWidth - innerWidth;
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: gPin,
				start: 'top top',
				end: () => '+=' + dist(),
				pin: true,
				scrub: true,
				invalidateOnRefresh: true,
			},
		});
		tl.to(track, { x: () => -dist(), ease: 'none' }, 0)
			.to('[data-gallery-giant]', { xPercent: -45, ease: 'none' }, 0);
		$$('[data-card]', track).forEach((card) => {
			const img = $('[data-card-img]', card);
			gsap.fromTo(card, { rotate: 6, scale: 0.86 }, {
				rotate: 0,
				scale: 1,
				ease: 'none',
				scrollTrigger: { trigger: card, containerAnimation: tl, start: 'left right', end: 'center center', scrub: true },
			});
			if (img) {
				gsap.fromTo(img, { xPercent: -6 }, {
					xPercent: 6,
					ease: 'none',
					scrollTrigger: { trigger: card, containerAnimation: tl, start: 'left right', end: 'right left', scrub: true },
				});
			}
			const title = $('.card__title', card);
			if (title) {
				gsap.from(title, {
					yPercent: 60,
					opacity: 0,
					rotate: -6,
					ease: 'back.out(2)',
					duration: 0.9,
					scrollTrigger: { trigger: card, containerAnimation: tl, start: 'left 70%', toggleActions: 'play none none reverse' },
				});
			}
		});
	}

	/* ---------- 07 Friends: the illustration becomes a photo ---------- */
	const duo = $('[data-duo]');
	if (duo) {
		const illu = $('[data-duo-illu]', duo);
		const illuImg = $('[data-duo-in]', illu);
		const line = $('[data-duo-line]', duo);
		const frame = $('.duo__frame', duo);
		const tl = gsap.timeline({
			scrollTrigger: { trigger: duo, start: 'center center', end: () => '+=' + innerHeight * 1.2, pin: true, scrub: true, invalidateOnRefresh: true },
		});
		// The illustration layer slides right while its content stays put:
		// a wipe, transforms only.
		tl.set(line, { opacity: 1 })
			.fromTo(illu, { xPercent: 0 }, { xPercent: 100, ease: 'none' }, 0)
			.fromTo(illuImg, { xPercent: 0 }, { xPercent: -100, ease: 'none' }, 0)
			.fromTo(line, { x: 0 }, { x: () => frame.offsetWidth, ease: 'none' }, 0)
			.to(line, { opacity: 0, duration: 0.05 });
	}
	gsap.from('.s-amigos__how > span', {
		y: 40,
		opacity: 0,
		stagger: 0.12,
		duration: 0.8,
		ease: 'back.out(2)',
		scrollTrigger: { trigger: '.s-amigos__how', start: 'top 90%', once: true },
	});

	/* ---------- 08 Hours + 3D drinks ---------- */
	const hours = $('.s-hours');
	if (hours) {
		ScrollTrigger.create({
			trigger: hours,
			start: 'top 85%',
			end: 'center center',
			scrub: true,
			onUpdate: (s) => (state.drinks.p = s.progress),
		});
		gsap.from('[data-hours-row]', {
			xPercent: -30,
			opacity: 0,
			stagger: 0.12,
			duration: 1,
			ease: 'expo.out',
			scrollTrigger: { trigger: '.hours', start: 'top 85%', once: true },
		});
		gsap.fromTo('.s-hours__disc', { scale: 0.5, rotate: -30 }, {
			scale: 1,
			rotate: 0,
			ease: 'none',
			scrollTrigger: { trigger: hours, start: 'top bottom', end: 'center center', scrub: true },
		});
	}

	/* ---------- 09 Find us ---------- */
	gsap.from('.s-visit__pictos li, .s-visit__actions > *', {
		y: 30,
		opacity: 0,
		stagger: 0.06,
		duration: 0.7,
		ease: 'back.out(2)',
		scrollTrigger: { trigger: '.s-visit__actions', start: 'top 90%', once: true },
	});
	gsap.fromTo('.s-visit__illu', { rotate: -25, scale: 0.6 }, {
		rotate: 8,
		scale: 1,
		ease: 'none',
		scrollTrigger: { trigger: '.s-visit', start: 'top bottom', end: 'bottom top', scrub: true },
	});

	// Giant watermark text that scrolls with the page.
	gsap.fromTo('[data-visit-marquee]', { xPercent: 0 }, {
		xPercent: -33.333,
		ease: 'none',
		scrollTrigger: { trigger: '.s-visit', start: 'top bottom', end: 'bottom top', scrub: true },
	});

	// Map: 3D tilt that follows the mouse (the line drawing lives in vmap.js).
	const map = $('[data-map]');
	if (map && matchMedia('(pointer: fine)').matches) {
		// 3D tilt of the map following the mouse.
		const wrap = map.parentElement;
		const rx = gsap.quickTo(map, 'rotationX', { duration: 0.6, ease: 'power3' });
		const ry = gsap.quickTo(map, 'rotationY', { duration: 0.6, ease: 'power3' });
		wrap.addEventListener('pointermove', (e) => {
			const r = wrap.getBoundingClientRect();
			ry(((e.clientX - r.left) / r.width - 0.5) * 9);
			rx(-((e.clientY - r.top) / r.height - 0.5) * 7);
		});
		wrap.addEventListener('pointerleave', () => {
			rx(0);
			ry(0);
		});
	}

	/* ---------- 10 Finale: LAZEEEZ! + rain ---------- */
	const big = $('[data-end-big] span');
	if (big) {
		const split = SplitText.create(big, { type: 'chars', charsClass: 'split-char' });
		// While the letters wait below their line they extend the page's scrollable height
		// (~20px); re-measure for Lenis when they land / drop back, or the very bottom gets a
		// dead zone. dimensions.resize() only re-measures; it doesn't reset the scroll motion.
		const remeasure = () => lenis?.dimensions?.resize();
		gsap.from(split.chars, {
			yPercent: 120,
			rotation: 'random(-30, 30)',
			stagger: 0.04,
			duration: 1.2,
			ease: 'elastic.out(1, 0.5)',
			onComplete: remeasure,
			onReverseComplete: remeasure,
			scrollTrigger: { trigger: '.s-end', start: 'top 55%', toggleActions: 'play none none reverse' },
		});
		// Little hop on hover.
		big.parentElement.parentElement.addEventListener('pointermove', (e) => {
			const c = split.chars.find((ch) => {
				const r = ch.getBoundingClientRect();
				return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
			});
			if (c && !gsap.isTweening(c)) gsap.fromTo(c, { y: 0 }, { y: -40, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' });
		});
	}
	const end = $('.s-end');
	const meta = $('.s-end__meta');
	if (end && meta) {
		const setMeta = () => end.style.setProperty('--meta-h', meta.offsetHeight + 24 + 'px');
		setMeta();
		ScrollTrigger.addEventListener('refreshInit', setMeta);
	}
	ScrollTrigger.create({
		trigger: '.s-end',
		start: 'top 60%',
		end: 'bottom top',
		onToggle: (s) => (state.rain.active = s.isActive),
		onLeaveBack: () => state.rain.reset?.(),
	});

}
