import https from 'https';
import http from 'http';

const UA = { 'User-Agent': 'Mozilla/5.0' };

// id -> resolved archive.org URL
const urlCache = new Map();
const resolving = new Map();

// id -> { received, total, done, downloading, error, buf, chunks, lastBytesAt }
const bookStore = new Map();
const MAX_BOOK_BYTES = 60 * 1024 * 1024;
const STORE_BUDGET = 300 * 1024 * 1024;
let storeBytes = 0;

function isValidId(id) {
  return typeof id === 'string' && /^[\w][\w.\-()]{0,120}$/.test(id);
}

// Raw HTTP(S) GET with redirect following -> Node IncomingMessage.
// Bypasses Next.js patched fetch entirely (its body streams stall here).
function rawGet(urlStr, headers = {}, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 6) return reject(new Error('too many redirects'));
    let u;
    try { u = new URL(urlStr); } catch { return reject(new Error('bad url')); }
    const mod = u.protocol === 'http:' ? http : https;
    const req = mod.get(u, {
      headers: { ...UA, ...headers, 'Accept-Encoding': 'identity' },
      timeout: 45000,
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        res.resume();
        const loc = res.headers.location;
        if (!loc) return reject(new Error('redirect w/o location'));
        return resolve(rawGet(new URL(loc, u).href, headers, depth + 1));
      }
      resolve(res);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function collectBuffer(stream) {
  return new Promise((resolve, reject) => {
    const parts = [];
    stream.on('data', c => parts.push(Buffer.from(c)));
    stream.on('end', () => resolve(Buffer.concat(parts)));
    stream.on('error', reject);
  });
}

async function resolveUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  if (resolving.has(id)) return resolving.get(id);

  const job = (async () => {
    // Metadata-derived candidates, best first
    let metaUrls = [];
    try {
      const metaRes = await rawGet(`https://archive.org/metadata/${id}`);
      const raw = await collectBuffer(metaRes);
      const meta = JSON.parse(raw.toString('utf8'));
      metaUrls = (meta.files || [])
        .filter(f => /\.pdf$/i.test(f.name || '') && f.source !== 'metadata')
        .map(f => ({
          name: f.name,
          size: parseInt(f.size, 10) || Infinity,
          isText: /_text\.pdf$/i.test(f.name || '') || f.format === 'Additional Text PDF',
        }))
        .sort((a, b) => (b.isText - a.isText) || (a.size - b.size))
        .slice(0, 4)
        .map(p => `https://archive.org/download/${id}/${encodeURIComponent(p.name)}`);
    } catch {}

    const candidates = [
      ...metaUrls,
      `https://archive.org/download/${id}/${id}_text.pdf`,
      `https://archive.org/download/${id}/${id}.pdf`,
    ];

    for (const c of candidates) {
      try {
        const probe = await rawGet(c, { Range: 'bytes=0-0' });
        probe.resume();
        if (probe.statusCode && probe.statusCode < 400) {
          urlCache.set(id, c);
          return c;
        }
      } catch {}
    }
    return null;
  })();

  resolving.set(id, job);
  const result = await job.finally(() => resolving.delete(id));
  return result;
}

function evictIfNeeded() {
  for (const [k, st] of bookStore) {
    if (!st.buf) continue;
    if (storeBytes <= STORE_BUDGET) break;
    storeBytes -= st.buf.length;
    bookStore.delete(k);
  }
}

// Full background download (segmented parallel, sequential fallback).
async function ensureDownload(id) {
  const existing = bookStore.get(id);
  if (existing?.done || existing?.downloading) return;

  const url = await resolveUrl(id);
  if (!url) {
    if (existing) existing.error = true;
    return;
  }

  const st = bookStore.get(id) || { received: 0, total: 0, done: false, downloading: false };
  if (st.done || st.downloading) return;
  st.downloading = true;
  st.error = false;
  st.lastBytesAt = Date.now();
  st.chunks = [];
  st.received = 0;
  bookStore.set(id, st);

  try {
    // Probe total size
    const probe = await rawGet(url, { Range: 'bytes=0-0' });
    probe.resume();
    const cr = probe.headers['content-range'];
    const total = cr ? parseInt(String(cr).split('/')[1], 10)
      : parseInt(probe.headers['content-length'], 10);
    if (!total || isNaN(total)) { throw new Error('unknown size'); }
    if (total > MAX_BOOK_BYTES) throw new Error('too large');
    st.total = total;

    let buf = null;
    try {
      // Segmented parallel download
      const N = total > 1024 * 1024 ? 6 : 1;
      const slotSize = Math.ceil(total / N);
      const slotBufs = Array.from({ length: N }, () => []);
      const slotGot = Array(N).fill(0);

      const dlSlot = async (i, triesLeft = 3) => {
        const start = i * slotSize;
        const end = Math.min(total - 1, (i + 1) * slotSize - 1);
        try {
          const res = await rawGet(url, { Range: `bytes=${start}-${end}` });
          if (res.statusCode !== 206 && res.statusCode !== 200) throw new Error(`slot ${i} HTTP ${res.statusCode}`);
          st.received -= slotGot[i];
          slotBufs[i] = [];
          slotGot[i] = 0;
          await new Promise((res2, rej2) => {
            res.on('data', chunk => {
              const len = chunk.length;
              slotBufs[i].push(Buffer.from(chunk));
              slotGot[i] += len;
              st.received += len;
              st.lastBytesAt = Date.now();
            });
            res.on('end', res2);
            res.on('error', rej2);
          });
          if (slotGot[i] !== end - start + 1) throw new Error(`slot ${i} short`);
        } catch (e) {
          if (triesLeft <= 0) throw e;
          slotBufs[i] = [];
          slotGot[i] = 0;
          st.received = slotGot.reduce((a, b) => a + b, 0);
          await new Promise(r2 => setTimeout(r2, 600));
          return dlSlot(i, triesLeft - 1);
        }
      };

      await Promise.all(Array.from({ length: N }, (_, i) =>
        new Promise(res2 => setTimeout(res2, i * 180)).then(() => dlSlot(i))
      ));
      buf = Buffer.concat(slotBufs.map(bufs => Buffer.concat(bufs)));
    } catch {
      // Fallback: single-stream download
      st.chunks = [];
      st.received = 0;
      const res = await rawGet(url);
      if ((res.statusCode || 500) >= 400) throw new Error(`upstream ${res.statusCode}`);
      await new Promise((res2, rej2) => {
        res.on('data', chunk => {
          st.chunks.push(Buffer.from(chunk));
          st.received += chunk.length;
          st.lastBytesAt = Date.now();
        });
        res.on('end', res2);
        res.on('error', rej2);
      });
      buf = Buffer.concat(st.chunks);
    }

    st.buf = buf;
    st.chunks = [];
    if (st.buf.length !== total) throw new Error(`size mismatch ${st.buf.length}/${total}`);
    if (st.buf.slice(0, 5).toString('latin1') !== '%PDF-') throw new Error('not a pdf');
    st.done = true;
    storeBytes += st.buf.length;
    evictIfNeeded();
  } catch (e) {
    console.error('[pdf-proxy] download failed:', id, e.message);
    st.error = true;
    st.buf = null;
    st.received = 0;
  } finally {
    st.downloading = false;
    st.chunks = [];
  }
}

export default async function handler(req, res) {
  const { id, resolve, warm, progress } = req.query;
  if (!isValidId(id)) return res.status(400).json({ error: 'Invalid id' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  // Never let browsers/CDNs cache control responses
  if (resolve === '1' || warm === '1' || progress === '1') {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.setHeader('Vary', '*');
  }

  // Resolve-only: cheap URL warm-up (no PDF bytes).
  if (resolve === '1') {
    const url = await resolveUrl(id);
    return res.status(url ? 200 : 404).json({ ok: !!url });
  }

  // Warm: kick off the full background download immediately.
  if (warm === '1') {
    ensureDownload(id).catch(() => {});
    const st = bookStore.get(id);
    return res.json({ ok: true, size: st?.total || 0 });
  }

  // Progress polling for the loading screen.
  if (progress === '1') {
    const st = bookStore.get(id);
    if (!st) return res.json({ received: 0, total: 0, done: false, error: false, stale: false });
    return res.json({
      received: st.received,
      total: st.total,
      done: st.done,
      error: st.error,
      stale: !st.downloading && !st.done && !st.error && Date.now() - (st.lastBytesAt || 0) > 20000,
    });
  }

  const st = bookStore.get(id);

  // Fast path: fully downloaded -> serve straight from memory.
  if (st?.done && st.buf) {
    const range = req.headers['range'];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Accept-Ranges', 'bytes');
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? Math.min(parseInt(parts[1], 10), st.buf.length - 1) : st.buf.length - 1;
      if (isNaN(start) || start >= st.buf.length || start > end) {
        res.setHeader('Content-Range', `bytes */${st.buf.length}`);
        return res.status(416).end();
      }
      const chunk = st.buf.slice(start, end + 1);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${st.buf.length}`);
      res.setHeader('Content-Length', chunk.length);
      return res.status(206).end(chunk);
    }
    res.setHeader('Content-Length', st.buf.length);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return res.end(st.buf);
  }

  // Fallback: live stream from archive.org (before cache exists).
  const url = await resolveUrl(id);
  if (!url) return res.status(404).json({ error: 'PDF not found' });

  let up;
  try {
    up = await rawGet(url, req.headers['range'] ? { Range: req.headers['range'] } : {});
  } catch {
    return res.status(502).json({ error: 'Upstream unreachable' });
  }
  if ((up.statusCode || 500) >= 400) return res.status(404).json({ error: 'PDF not found' });

  res.status(up.statusCode === 206 ? 206 : 200);
  for (const h of ['content-type', 'content-length', 'content-range']) {
    if (up.headers[h]) res.setHeader(h, up.headers[h]);
  }
  res.setHeader('Accept-Ranges', 'bytes');
  if (up.statusCode !== 206 && !req.headers['range']) {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
  up.on('error', () => res.destroy());
  up.pipe(res);
}
