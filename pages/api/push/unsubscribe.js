import db from '../../../lib/push-db';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  db.removeSubByEndpoint(endpoint);
  res.status(200).json({ ok: true });
}
