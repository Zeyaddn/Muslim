const UPSTREAM = 'https://api.alquran.cloud/v1';

const cache = {};
const MAX_CACHED = 130;

function cacheSet(key, value) {
  const keys = Object.keys(cache);
  if (keys.length >= MAX_CACHED) delete cache[keys[0]];
  cache[key] = value;
}

async function fetchEdition(surahId, edition) {
  const key = `${surahId}:${edition}`;
  if (cache[key]) return cache[key];
  const res = await fetch(`${UPSTREAM}/surah/${surahId}/${edition}`);
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const json = await res.json();
  if (!json?.data?.ayahs) throw new Error('unexpected upstream shape');
  cacheSet(key, json.data);
  return json.data;
}

export default async function handler(req, res) {
  const { id, tafsir } = req.query;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1 || numId > 114) {
    return res.status(400).json({ error: 'Invalid surah ID' });
  }

  const edition = tafsir || 'ar.alafasy';
  try {
    const data = await fetchEdition(numId, edition);
    return res.status(200).json({ data });
  } catch {
    return res.status(502).json({ error: 'Tafsir source unavailable' });
  }
}
