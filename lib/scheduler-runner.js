// هُدَى — Server-side scheduler runner (no browser timers involved).
const db = require('./push-db');
const { upcomingEvents } = require('./prayer-schedule');
const { sendTo, buildPrePayload, buildAthanPayload } = require('./push-sender');

const TICK_MS = 15000;

let lastRun = Date.now();

async function runTick({ sinceOverride } = {}) {
  const now = Date.now();
  const since = sinceOverride ?? lastRun;
  lastRun = now;
  if (since >= now) return { sent: 0 };

  const subs = db.allSubs();
  let sentCount = 0;

  for (const sub of subs) {
    try {
      const prefs = sub.prefs || {};
      if (!prefs.notify) continue; // notifications master gate
      if (!sub.loc) continue;

      const events = await upcomingEvents(sub.loc.lat, sub.loc.lng, sub.tz);
      const due = [];
      // Test hook: fire a synthetic athan exactly once at a chosen instant
      if (sub.testFireAt) {
        const t = Date.parse(sub.testFireAt);
        if (!Number.isNaN(t) && t > since && t <= now) {
          due.push({ kind: 'athan', ev: { key: 'test', nameAr: 'العصر', dateKey: 'fire-' + sub.testFireAt, instant: new Date(t), preInstant: new Date(0) } });
        }
      }
      for (const ev of events) {
        if (ev.preInstant.getTime() > since && ev.preInstant.getTime() <= now) due.push({ kind: 'pre', ev });
        if (ev.instant.getTime() > since && ev.instant.getTime() <= now) due.push({ kind: 'athan', ev });
      }
      due.sort((a, b) =>
        (a.kind === 'pre' ? a.ev.preInstant : a.ev.instant).getTime() -
        (b.kind === 'pre' ? b.ev.preInstant : b.ev.instant).getTime()
      );

      for (const d of due) {
        const dedupKey = `${sub.id}:${d.ev.dateKey}:${d.ev.key}:${d.kind}`;
        if (db.wasSent(dedupKey)) continue;
        db.markSent(dedupKey); // mark first — never double-send even on retry
        const payload = d.kind === 'pre'
          ? buildPrePayload(d.ev, { city: sub.city })
          : buildAthanPayload(d.ev, prefs);
        const res = await sendTo(sub, payload);
        if (res.gone) { db.removeSubByEndpoint(sub.endpoint); break; }
        if (res.ok) sentCount++;
      }
    } catch (e) {
      console.error('[scheduler] sub tick failed:', e && e.message);
    }
  }
  return { sent: sentCount };
}

function startScheduler() {
  lastRun = Date.now(); // don't fire stale events from downtime
  setInterval(() => { runTick().catch(() => {}); }, TICK_MS);
  console.log('[huda] prayer-push scheduler started (tick ' + TICK_MS + 'ms)');
}

module.exports = { startScheduler, runTick };
