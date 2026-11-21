/**
 * Live open/closed status (shop time, Australia/Brisbane), optional launch
 * countdown, and today's row highlighted in the opening hours.
 */
const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_LONG = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
/** '21:00' -> '9pm', '11:30' -> '11:30am', '12:00' -> '12pm'. */
const h = (s) => {
	const [a, b] = s.split(':').map(Number);
	const hr = a % 12 || 12;
	return `${hr}${b ? ':' + String(b).padStart(2, '0') : ''}${a < 12 ? 'am' : 'pm'}`;
};
const toMin = (s) => {
	const [a, b] = s.split(':').map(Number);
	return a * 60 + b;
};

/** ISO day (1-7) and minutes since midnight, in the shop's time zone. */
function zurichNow(tz) {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: tz,
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(new Date());
	const get = (t) => parts.find((p) => p.type === t)?.value;
	const day = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[get('weekday')];
	return { day, min: Number(get('hour')) * 60 + Number(get('minute')) };
}

function compute(data) {
	const hours = data.hours || {};
	const { day, min } = zurichNow(data.tz || 'Australia/Brisbane');
	const launch = data.launch ? Date.parse(data.launch) : 0;
	const before = launch && Date.now() < launch;

	if (before) {
		const parts = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hourCycle: 'h12', timeZone: data.tz }).formatToParts(new Date(launch));
		const get = (t) => parts.find((p) => p.type === t)?.value;
		const date = `${get('day')} ${get('month')}`;
		const time = `${get('hour')}:${get('minute')}${(get('dayPeriod') || '').toLowerCase()}`;
		const narrow = innerWidth < 520;
		return { open: false, today: day, text: narrow ? `Opening ${date}` : `Opening ${date} at ${time}`, k: '', sub: '' };
	}

	// After launch: a permanent status worked out from the opening hours.
	const today = hours[day];
	if (today) {
		const [o, c] = today;
		if (min >= toMin(o) && min < toMin(c)) {
			return { open: true, today: day, text: `Open now · till ${h(c)}`, k: 'Open now!', sub: `Till ${h(c)} tonight` };
		}
		if (min < toMin(o)) {
			return { open: false, today: day, text: `Opens ${h(o)} today`, k: 'Today!', sub: `Opens ${h(o)}` };
		}
	}
	for (let i = 1; i <= 7; i++) {
		const d = ((day - 1 + i) % 7) + 1;
		if (hours[d]) {
			const label = i === 1 ? 'Tomorrow' : DAYS_LONG[d];
			return { open: false, today: day, text: `Opens ${i === 1 ? 'tomorrow' : DAYS[d]} ${h(hours[d][0])}`, k: 'See you soon!', sub: `${label} from ${h(hours[d][0])}` };
		}
	}
	return { open: false, today: day, text: '', k: '', sub: '' };
}

export function initStatus(data) {
	const statusText = document.querySelector('[data-status-text]');
	const counters = [...document.querySelectorAll('[data-countdown]')];
	const launch = data.launch ? Date.parse(data.launch) : 0;
	const pad = (n) => String(Math.max(0, n)).padStart(2, '0');
	const setText = (el, v) => {
		if (el && el.textContent !== v) el.textContent = v;
	};

	const render = () => {
		const s = compute(data);
		setText(statusText, s.text);
		document.documentElement.classList.toggle('is-open', s.open);
		document.querySelectorAll('[data-hours-row]').forEach((row) => {
			const days = row.dataset.days.split(',').map(Number);
			row.classList.toggle('is-today', days.includes(s.today));
		});

		const left = launch - Date.now();
		for (const cd of counters) {
			if (left > 0) {
				const sec = Math.floor(left / 1000);
				setText(cd.querySelector('[data-cd="d"]'), pad(Math.floor(sec / 86400)));
				setText(cd.querySelector('[data-cd="h"]'), pad(Math.floor((sec % 86400) / 3600)));
				setText(cd.querySelector('[data-cd="m"]'), pad(Math.floor((sec % 3600) / 60)));
				setText(cd.querySelector('[data-cd="s"]'), pad(sec % 60));
				continue;
			}
			// Countdown reached zero: it becomes a permanent status.
			if (!cd.classList.contains('is-live')) {
				cd.classList.add('is-live');
				const label = cd.querySelector('[data-cd-label]');
				if (label) label.textContent = cd.dataset.summary || '';
				const open = cd.querySelector('.countdown__open');
				if (open) open.hidden = false;
			}
			setText(cd.querySelector('[data-open-k]'), s.k || 'Lazeez!');
			setText(cd.querySelector('[data-open-text]'), s.sub || cd.dataset.summary || '');
		}
	};
	render();
	setInterval(render, 1000);
}
