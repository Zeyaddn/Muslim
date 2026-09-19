// هُدَى — Web Push sender + beautiful notification payloads
const webpush = require('web-push');
const { ADHANS, DEFAULT_ADHAN } = require('./adhans');

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:huda-app@localhost',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
}

function adhanUrl(prefs) {
  const chosen = ADHANS[prefs?.adhanMuezzin] || ADHANS[DEFAULT_ADHAN];
  return chosen.url;
}

function buildPrePayload(ev, ctx = {}) {
  return {
    kind: 'pre',
    title: `🕌 صلاة ${ev.nameAr} بعد 10 دقائق`,
    body: 'استعد للصلاة 🤍',
    tag: `huda-pre-${ev.dateKey}-${ev.key}`,
    lang: 'ar',
    dir: 'rtl',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [90, 60, 90],
    data: { url: '/', kind: 'pre', prayer: ev.key },
    ...(ctx.city ? {} : {}),
  };
}

function buildAthanPayload(ev, prefs = {}) {
  const withSound = prefs.adhan !== false;
  return {
    kind: 'athan',
    title: `🕌 حان الآن وقت صلاة ${ev.nameAr}`,
    body: 'حي على الصلاة',
    tag: `huda-athan-${ev.dateKey}-${ev.key}`,
    renotify: true,
    lang: 'ar',
    dir: 'rtl',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: withSound ? [400, 180, 400, 180, 900] : [140, 70, 140],
    silent: false,
    sound: withSound ? adhanUrl(prefs) : undefined,
    data: { url: '/', kind: 'athan', prayer: ev.key },
  };
}

async function sendTo(subRow, payload) {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: subRow.endpoint, keys: subRow.keys },
      JSON.stringify(payload),
      {
        TTL: 3 * 3600,
        urgency: payload.kind === 'athan' ? 'high' : 'normal',
      }
    );
    return { ok: true };
  } catch (e) {
    const sc = e?.statusCode;
    if (sc === 404 || sc === 410) return { gone: true };
    return { ok: false, error: String(e?.message || e).slice(0, 160) };
  }
}

module.exports = { sendTo, buildPrePayload, buildAthanPayload, ADHANS, DEFAULT_ADHAN };
