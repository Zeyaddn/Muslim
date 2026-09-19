// هُدَى — Prayer times scheduling (server-side, Egyptian General Authority of Survey).
// adhan is ESM-only: loaded once via dynamic import (works from CJS in Node >=14).
let adhanMod = null;
async function getAdhan() {
  if (!adhanMod) adhanMod = await import('adhan');
  return adhanMod;
}

const PRAYER_KEYS = [
  { key: 'fajr', prop: 'fajr', ar: 'الفجر' },
  { key: 'dhuhr', prop: 'dhuhr', ar: 'الظهر' },
  { key: 'asr', prop: 'asr', ar: 'العصر' },
  { key: 'maghrib', prop: 'maghrib', ar: 'المغرب' },
  { key: 'isha', prop: 'isha', ar: 'العشاء' },
];

// Offset of a timezone vs UTC at a given instant (ms). Handles DST correctly.
function tzOffsetMs(tz, instant) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts = {};
    for (const { type, value } of dtf.formatToParts(instant)) parts[type] = value;
    const asUTC = Date.UTC(
      +parts.year, +parts.month - 1, +parts.day,
      +(parts.hour === '24' ? '0' : parts.hour), +parts.minute, +parts.second
    );
    return asUTC - instant.getTime();
  } catch {
    return 0;
  }
}

// Convert wall-clock components in tz → real UTC instant (DST-safe, two passes).
function wallToInstant(tz, y, m, d, h, min, sec = 0) {
  const naive = Date.UTC(y, m - 1, d, h, min);
  let instant = new Date(naive - tzOffsetMs(tz, new Date(naive)) - sec * 1000);
  // second pass refines across DST boundaries
  instant = new Date(naive - tzOffsetMs(tz, instant) - sec * 1000);
  return instant;
}

function userTodayParts(tz) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = {};
  for (const { type, value } of dtf.formatToParts(new Date())) p[type] = +value;
  return { y: p.year, m: p.month, d: p.day };
}

function addDays({ y, m, d }, n) {
  const t = Date.UTC(y, m - 1, d) + n * 86400000;
  const dt = new Date(t);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

const pad = n => String(n).padStart(2, '0');
const dateKeyOf = ({ y, m, d }) => `${y}-${pad(m)}-${pad(d)}`;

// Compute the 5 prayer instants for one user-calendar-day.
// adhan anchors its math to the INPUT date's local midnight and returns wall-clock
// hours in that same frame — so we read server-LOCAL components (wall clock for
// the user's tz) and convert them to a real UTC instant via Intl offsets.
async function dayPrayerInstants(lat, lng, tz, day) {
  const adhan = await getAdhan();
  const coords = new adhan.Coordinates(lat, lng);
  const params = adhan.CalculationMethod.Egyptian();
  params.madhab = adhan.Madhab.Shafi;
  const anchor = new Date(day.y, day.m - 1, day.d, 12);
  const pt = new adhan.PrayerTimes(coords, anchor, params);
  return PRAYER_KEYS.map(p => {
    const src = pt[p.prop];
    const instant = wallToInstant(tz, day.y, day.m, day.d, src.getHours(), src.getMinutes(), src.getSeconds());
    return { ...p, instant };
  });
}

// All upcoming prayer events (today + tomorrow) with their pre-notifications.
async function upcomingEvents(lat, lng, tz, opts = {}) {
  const zone = tz || 'Africa/Cairo';
  const today = userTodayParts(zone);
  const events = [];
  for (const day of [today, addDays(today, 1)]) {
    const dk = dateKeyOf(day);
    for (const p of await dayPrayerInstants(lat, lng, zone, day)) {
      events.push({
        key: p.key,
        nameAr: p.ar,
        dateKey: dk,
        instant: p.instant,
        preInstant: new Date(p.instant.getTime() - 10 * 60 * 1000),
      });
    }
  }
  return events;
}

module.exports = { upcomingEvents, tzOffsetMs, wallToInstant, userTodayParts, PRAYER_KEYS };
