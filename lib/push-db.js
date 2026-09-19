// هُدَى — Push subscriptions store (JSON file, survives restarts)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(process.cwd(), 'data', 'push-db.json');

let cache = null;

function load() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    cache = JSON.parse(raw);
    if (!cache || typeof cache !== 'object') throw new Error('bad db');
  } catch {
    cache = { subs: {}, sent: {} };
  }
  if (!cache.subs) cache.subs = {};
  if (!cache.sent) cache.sent = {};
  return cache;
}

function save() {
  if (!cache) return;
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const tmp = DB_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(cache));
    fs.renameSync(tmp, DB_PATH);
  } catch (e) {
    console.error('[push-db] save failed:', e.message);
  }
}

function subIdFromEndpoint(endpoint) {
  return crypto.createHash('sha256').update(String(endpoint)).digest('hex').slice(0, 24);
}

function upsertSub({ subscription, prefs, loc, city, tz }) {
  const db = load();
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys;
  if (!endpoint || !keys?.p256dh || !keys?.auth) return null;
  const id = subIdFromEndpoint(endpoint);
  const prev = db.subs[id];
  db.subs[id] = {
    id,
    endpoint,
    keys,
    prefs: {
      notify: prefs?.notify !== false,
      adhan: prefs?.adhan !== false,
      ...(prev ? {} : {}),
    },
    loc: loc && isFinite(loc.lat) && isFinite(loc.lng) ? { lat: +loc.lat, lng: +loc.lng } : null,
    city: String(city || ''),
    tz: String(tz || 'Africa/Cairo'),
    createdAt: prev?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  save();
  return db.subs[id];
}

function updateSub(id, patch) {
  const db = load();
  const sub = db.subs[id];
  if (!sub) return null;
  if (patch.prefs) sub.prefs = { ...sub.prefs, ...patch.prefs };
  if (patch.loc !== undefined) sub.loc = patch.loc && isFinite(patch.loc.lat) ? { lat: +patch.loc.lat, lng: +patch.loc.lng } : null;
  if (patch.city !== undefined) sub.city = String(patch.city || '');
  if (patch.tz) sub.tz = String(patch.tz);
  sub.updatedAt = Date.now();
  save();
  return sub;
}

function removeSubByEndpoint(endpoint) {
  const db = load();
  const id = subIdFromEndpoint(endpoint);
  if (db.subs[id]) { delete db.subs[id]; save(); return true; }
  return false;
}

function allSubs() {
  return Object.values(load().subs);
}

function wasSent(key) {
  return !!load().sent[key];
}

function markSent(key) {
  const db = load();
  db.sent[key] = Date.now();
  pruneSent(db);
  save();
}

function pruneSent(db) {
  const cutoff = Date.now() - 48 * 3600 * 1000;
  for (const k of Object.keys(db.sent)) {
    if (db.sent[k] < cutoff) delete db.sent[k];
  }
}

module.exports = { load, save, upsertSub, updateSub, removeSubByEndpoint, allSubs, wasSent, markSent, subIdFromEndpoint };
