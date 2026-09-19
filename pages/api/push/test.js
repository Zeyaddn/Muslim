import db from '../../../lib/push-db';
import { sendTo, buildPrePayload, buildAthanPayload } from '../../../lib/push-sender';

// Test endpoint: sends a sample notification to the caller's own subscription.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const { endpoint, kind = 'athan', adhan = true } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  const id = db.subIdFromEndpoint(endpoint);
  const sub = db.load().subs[id];
  if (!sub) return res.status(404).json({ error: 'not subscribed' });

  const now = new Date();
  const ev = {
    key: 'test', nameAr: 'العصر',
    dateKey: now.toISOString().slice(0, 10) + '-' + Date.now(), // unique tag per test
    instant: now, preInstant: now,
  };
  const payload = kind === 'pre' ? buildPrePayload(ev, { city: sub.city }) : buildAthanPayload(ev, { ...sub.prefs, adhan });
  payload.data = { ...(payload.data || {}), test: true };
  const result = await sendTo(sub, payload);
  if (result.gone) db.removeSubByEndpoint(endpoint);
  res.status(200).json(result.ok === false ? { ok: false, error: result.error } : { ok: true, gone: !!result.gone });
}
