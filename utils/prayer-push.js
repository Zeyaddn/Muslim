// هُدَى — Push subscription client (Web Push + SW). No page timers involved in delivery.
import { PUSH_ENABLED } from './deploy';

const PREFS_KEY = 'huda_notif_prefs';
const GEO_KEY = 'huda_geo_cache';

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function getPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    if (p && typeof p.notify === 'boolean') return { notify: p.notify, adhan: p.adhan !== false };
  } catch {}
  return null;
}

export function savePrefs(prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

export function getGeoCache() {
  try {
    const g = JSON.parse(localStorage.getItem(GEO_KEY) || 'null');
    if (g && g.status) return g;
  } catch {}
  return null;
}

export function saveGeoCache(patch) {
  const next = { ...getGeoCache(), ...patch };
  try { localStorage.setItem(GEO_KEY, JSON.stringify(next)); } catch {}
  return next;
}

function userTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo'; } catch { return 'Africa/Cairo'; }
}

async function getVapidKey() {
  const r = await fetch('/api/push/config');
  const j = await r.json();
  return j.publicKey;
}

// Ensure a push subscription exists & server has latest prefs/location.
export async function syncPushState({ prefs, loc, city }) {
  if (!PUSH_ENABLED) return { ok: false, reason: 'disabled' };
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return { ok: false, reason: 'no-sw' };
  if (!('PushManager' in window)) return { ok: false, reason: 'no-push' };

  const registration = await navigator.serviceWorker.ready;
  let sub = await registration.pushManager.getSubscription();

  // Notifications disabled (or never granted): clean up so nothing is sent.
  if (!prefs?.notify || (typeof Notification !== 'undefined' && Notification.permission !== 'granted')) {
    if (sub) {
      try { await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }); } catch {}
      try { await sub.unsubscribe(); } catch {}
    }
    return { ok: true, state: 'off' };
  }

  if (!sub) {
    const key = await getVapidKey();
    if (!key) return { ok: false, reason: 'no-vapid' };
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: { endpoint: sub.endpoint, keys: sub.toJSON().keys },
      prefs,
      loc,
      city,
      tz: userTimezone(),
    }),
  });
  return { ok: true, state: 'on', endpoint: sub.endpoint };
}

export async function unsubscribePush() {
  if (!PUSH_ENABLED) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) {
      try { await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }); } catch {}
      await sub.unsubscribe();
    }
  } catch {}
}

export async function sendTestPush(kind = 'athan') {
  if (!PUSH_ENABLED) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (!sub) return false;
    const r = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, kind }),
    });
    return r.ok;
  } catch { return false; }
}

// ===== Native first-run permission flow (no custom UI) =====
// Opens the BROWSER'S OWN prompts on the very first visit: location bubble,
// then notifications. Works across devices; runs exactly once per device.
let permFlowStarted = false;
export function startNativePermissionFlow() {
  if (typeof window === 'undefined' || permFlowStarted) return;
  permFlowStarted = true;
  try {
    if (localStorage.getItem('huda_perm_asked') === '1') return;
    localStorage.setItem('huda_perm_asked', '1');
  } catch (e) { return; }

  let geoLoc = null, geoDone = false, notifDone = false, finished = false;
  const maybeFinish = () => {
    if (finished || !geoDone || !notifDone) return;
    finished = true;
    syncPushState({ loc: geoLoc ? { lat: geoLoc.lat, lng: geoLoc.lng } : undefined, city: '' })
      .then(() => window.dispatchEvent(new Event('huda:prefs-changed')))
      .catch(() => window.dispatchEvent(new Event('huda:prefs-changed')));
  };

  // 1) Location — native browser prompt appears immediately
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        geoLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveGeoCache({ lat: geoLoc.lat, lng: geoLoc.lng, status: 'granted', city: '' });
        geoDone = true; maybeFinish();
      },
      () => {
        saveGeoCache({ status: 'denied' });
        geoDone = true; maybeFinish();
      },
      { timeout: 15000, maximumAge: 600000 }
    );
  } else { geoDone = true; }

  // 2) Notifications — try natively right away; if this browser requires a
  // user gesture, retry once automatically on the first tap anywhere.
  (async () => {
    try {
      if (!PUSH_ENABLED) { notifDone = true; maybeFinish(); return; }
      if ('Notification' in window) {
        const r = await Notification.requestPermission();
        if (r !== 'default') { notifDone = true; maybeFinish(); return; }
        const onTap = async () => {
          document.removeEventListener('pointerdown', onTap);
          document.removeEventListener('touchstart', onTap);
          try { await Notification.requestPermission(); } catch (e) {}
          notifDone = true; maybeFinish();
        };
        document.addEventListener('pointerdown', onTap);
        document.addEventListener('touchstart', onTap);
        setTimeout(() => {
          document.removeEventListener('pointerdown', onTap);
          document.removeEventListener('touchstart', onTap);
          notifDone = true; maybeFinish();
        }, 30000);
        return;
      }
    } catch (e) {}
    notifDone = true; maybeFinish();
  })();

  // Safety valve: never hang forever
  setTimeout(() => { geoDone = true; notifDone = true; maybeFinish(); }, 20000);
}
