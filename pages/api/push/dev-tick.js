import { runTick } from '../../../lib/scheduler-runner';
import { load as loadDb, save as saveDb } from '../../../lib/push-db';

// Dev/test endpoint: force a scheduler tick covering the last `sinceMinutes`,
// optionally arm a synthetic athan `fireInSeconds` from now (in-process memory).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  // Local-only guard: harmless on a developer machine, blocked when deployed.
  const ra = req.socket?.remoteAddress || '';
  const isLocal = ra === '::1' || ra === '127.0.0.1' || ra === '::ffff:127.0.0.1';
  if (!isLocal && process.env.NODE_ENV === 'production' && process.env.ALLOW_REMOTE_DEV_TICK !== '1') {
    return res.status(403).json({ error: 'forbidden' });
  }
  const { sinceMinutes = 1, fireInSeconds, clearFire } = req.body || {};
  if (clearFire) {
    const d = loadDb();
    Object.values(d.subs).forEach(s => { delete s.testFireAt; });
    saveDb();
  } else if (Number.isFinite(+fireInSeconds)) {
    const d = loadDb();
    const at = new Date(Date.now() + Math.max(0, Math.min(600, +fireInSeconds)) * 1000).toISOString();
    Object.values(d.subs).forEach(s => { s.testFireAt = at; });
    saveDb();
  }
  const since = Date.now() - Math.max(0, Math.min(60, +sinceMinutes || 1)) * 60 * 1000;
  const result = await runTick({ sinceOverride: since });
  res.status(200).json({ ok: true, ...result });
}
