import db from '../../../lib/push-db';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const { subscription, prefs, loc, city, tz } = req.body || {};
  const sub = db.upsertSub({ subscription, prefs, loc, city, tz });
  if (!sub) return res.status(400).json({ error: 'invalid subscription' });
  res.status(200).json({ ok: true, id: sub.id });
}
