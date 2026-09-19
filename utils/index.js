import { getQuranSurahIDB, setQuranSurahIDB } from './idb';
import { HIJRI_MONTHS, HIJRI_MONTH_DAYS, ARABIC_NUMS, DIRECTION_NAMES } from '../constants';
import { showToast } from '../components/Toast';

export function toArabicNum(n) {
  return String(n).split('').map(d => ARABIC_NUMS[+d]).join('');
}

export function stripBasmalah(ayahs, surahId) {
  if (surahId === 1 || surahId === 9 || ayahs.length === 0) return ayahs;
  const txt = ayahs[0].text;
  const from = txt.charCodeAt(0) === 0xFEFF ? txt.slice(1) : txt;
  if (from.charCodeAt(0) !== 0x0628) return ayahs;
  let spaces = 0;
  for (let i = 0; i < from.length; i++) {
    if (from.charCodeAt(i) === 0x0020) spaces++;
    if (spaces === 4) {
      const after = from.slice(i + 1).trim();
      if (!after) { ayahs = ayahs.slice(1); return ayahs; }
      ayahs = [...ayahs];
      ayahs[0] = { ...ayahs[0], text: after };
      return ayahs;
    }
  }
  return ayahs;
}

export function paginateText(chapters, charsPerPage = 600) {
  const pages = [];
  chapters.forEach((ch, ci) => {
    let text = ch.text;
    let pos = 0;
    while (pos < text.length) {
      const end = Math.min(pos + charsPerPage, text.length);
      let breakAt = end;
      if (end < text.length) {
        const lookFrom = Math.max(pos + Math.floor(charsPerPage * 0.6), pos);
        const seg = text.slice(lookFrom, end);
        const breaks = [];
        let idx = -1;
        while ((idx = seg.indexOf('\n', idx + 1)) !== -1) breaks.push(lookFrom + idx);
        while ((idx = seg.indexOf('؟', idx + 1)) !== -1) breaks.push(lookFrom + idx + 1);
        while ((idx = seg.indexOf('!', idx + 1)) !== -1) breaks.push(lookFrom + idx + 1);
        while ((idx = seg.indexOf('،', idx + 1)) !== -1) breaks.push(lookFrom + idx + 1);
        breakAt = breaks.length > 0 ? Math.max(...breaks) : end;
      }
      pages.push({ text: text.slice(pos, breakAt).trim(), chapterTitle: ch.title, chapterIdx: ci });
      pos = breakAt;
    }
  });
  return pages;
}

export function calculatePrayerTimes(lat, lng) {
  const nn = new Date();
  const doy = Math.floor((nn - new Date(nn.getFullYear(), 0, 0)) / 86400000);
  const latitude = lat || 21.4;
  const decl = 23.44 * Math.sin((Math.PI / 180) * (doy - 81) * 360 / 365);
  const rawTimes = [
    4.5 - decl / 30 + (30 - latitude) / 60,
    6 - decl / 25 + (latitude - 20) / 90,
    12 + (30 - latitude) / 180,
    (12 + (30 - latitude) / 180) + (Math.abs(decl) / 30 + 1.5),
    (12 + (30 - latitude) / 180) + (6 + decl / 20),
    (12 + (30 - latitude) / 180) + (6 + decl / 20) + 1.5 + Math.abs(latitude - 21.4) / 60,
  ];
  const today = new Date(nn.getFullYear(), nn.getMonth(), nn.getDate());
  const PRAYER_NAMES = ['الفجر', 'الشروق', 'الظهر', 'العصر', 'المغرب', 'العشاء'];
  return rawTimes.map((t, i) => {
    const h = Math.floor(t);
    const m = Math.floor((t - h) * 60);
    const date = new Date(today);
    date.setHours(h, m, 0, 0);
    const ap = t >= 12 ? 'م' : 'ص';
    const dh = h % 12 || 12;
    return { name: PRAYER_NAMES[i], time: `${dh.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ap}`, date };
  });
}

export function getHijriDate() {
  const n = new Date();
  const day = (Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 86400000 * 0.97) % 30) + 1;
  const month = HIJRI_MONTHS[Math.floor((n.getFullYear() - 622) * 12.36) % 12];
  const year = Math.floor((n.getFullYear() - 622) * 1.030) + 1;
  return { day, month, year };
}

export function hijriToGregorian(hijriYear, monthIdx, day) {
  const refYear = 1446;
  const refDate = new Date(2024, 6, 7);
  let totalDays = (hijriYear - refYear) * 354;
  for (let m = 0; m < monthIdx; m++) totalDays += HIJRI_MONTH_DAYS[m];
  totalDays += day - 1;
  const result = new Date(refDate);
  result.setDate(result.getDate() + totalDays);
  return result;
}

export function getQiblaDirection(lat, lng) {
  const mlat = 21.4225 * Math.PI / 180;
  const mlng = 39.8262 * Math.PI / 180;
  const blat = lat * Math.PI / 180;
  const dlng = mlng - lng * Math.PI / 180;
  return (Math.atan2(Math.sin(dlng), Math.cos(blat) * Math.tan(mlat) - Math.sin(blat) * Math.cos(dlng)) * 180 / Math.PI + 360) % 360;
}

export function getBookmarks() {
  try { return JSON.parse(localStorage.getItem('quranBookmarks') || '[]'); } catch { return []; }
}

export function setBookmark(id) {
  const b = getBookmarks();
  const idx = b.indexOf(id);
  if (idx > -1) b.splice(idx, 1);
  else b.push(id);
  localStorage.setItem('quranBookmarks', JSON.stringify(b));
  return b;
}

const quranMemCache = new Map();

try { localStorage.removeItem('quranCache'); } catch {}

export async function getCachedSurah(id) {
  if (quranMemCache.has(id)) return quranMemCache.get(id);
  
  // Try IDB first (offline first)
  const idbData = await getQuranSurahIDB(id);
  if (idbData) {
    quranMemCache.set(id, idbData);
    return idbData;
  }
  
  // Fallback to localStorage (legacy)
  try {
    const raw = localStorage.getItem(`surah:${id}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.ayahs)) return null;
    quranMemCache.set(id, data);
    return data;
  } catch { return null; }
}

export function setCachedSurah(id, data) {
  if (!data || !Array.isArray(data.ayahs)) return;
  quranMemCache.set(id, data);
  
  // Write to both IDB and LS for smooth migration
  setQuranSurahIDB(id, data);
  
  try { localStorage.setItem(`surah:${id}`, JSON.stringify(data)); } catch {}
}

export function getLastRead() {
  try { return JSON.parse(localStorage.getItem('lastRead') || 'null'); } catch { return null; }
}

export function saveLastRead(surahId, ayahNumber) {
  try { localStorage.setItem('lastRead', JSON.stringify({ surahId, ayahNumber })); } catch {}
}

export function htmlToDuaText(html) {
  return String(html || '')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map(l => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Hisn al-Muslim English translations contain stray footnote digits
// e.g. "a new day 1 and", "to You. 2", "this day,2 its victory".
// Removes standalone 1-2 digit markers while keeping real numbers (e.g. "100 times").
export function stripFootnotes(text) {
  return String(text || '')
    .replace(/([.,;:])(\d{1,2})(?=[\s)]|$)/g, '$1')
    .replace(/\s(\d{1,2})(?=[\s.,;)]|$)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Extract authentic repetition count from Hisn al-Muslim hints
// ("Recite seven times...", "(ثلاث مرات)") instead of trusting count fields.
export function parseDuaCount(arText, enText) {
  const m = String(enText || '').match(/[Rr]ecite\s+(one hundred|hundred|\d{1,3}|three|four|five|seven|ten)\s*(?:\(\d+\)\s*)?times?/);
  if (m) {
    if (/hundred/.test(m[1])) return 100;
    if (/^\d+$/.test(m[1])) return parseInt(m[1], 10);
    const words = { three: 3, four: 4, five: 5, seven: 7, ten: 10 };
    if (words[m[1]]) return words[m[1]];
  }
  const p = String(arText || '').match(/\(([^)]*(?:مرة|مرّة|مرات)[^)]*)\)/);
  if (p) {
    const pairs = [['مائة', 100], ['مية', 100], ['عشرين', 20], ['ثلاث', 3], ['ثلاثة', 3], ['أربع', 4], ['اربع', 4], ['خمس', 5], ['سبع', 7], ['تسع', 9], ['عشر', 10]];
    for (const [w, n] of pairs) if (p[1].includes(w)) return n;
    const d = p[1].match(/\d{1,3}/);
    if (d) return parseInt(d[0], 10);
  }
  return 1;
}

// Strip repetition instructions embedded inside the dhikr body itself.
export function stripCountHints(arText) {
  return String(arText || '')
    .replace(/\([^)]*(?:مرة|مرّة|مرات)[^)]*\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Convert common English hadith source names to Arabic.
export function arabizeRef(ref) {
  let out = String(ref || '');
  const pairs = [
    [/Al-Bukhari/g, 'البخاري'], [/Bukhari/g, 'البخاري'], [/Muslim/g, 'مسلم'],
    [/Tirmidhi/g, 'الترمذي'], [/Abu Dawud/g, 'أبو داود'], [/An-Nasa'?i/g, 'النسائي'],
    [/Ibn Majah/g, 'ابن ماجه'], [/Ahmad/g, 'أحمد'], [/Malik/g, 'مالك'],
  ];
  for (const [re, ar] of pairs) out = out.replace(re, ar);
  return out;
}

// Pull the reference span out of Hisn al-Muslim HTML bodies.
export function extractHisnRef(enBody) {
  const m = String(enBody || '').match(/<span class="hisn_english_reference">([^<]+)<\/span>/);
  return m ? m[1] : '';
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('تم النسخ', 'success');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('تم النسخ', 'success');
  }
}

export async function shareText(text) {
  if (navigator.share) {
    try { await navigator.share({ text }); } catch {}
  } else {
    copyText(text);
  }
}

export function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function getDirectionName(deg) {
  const keys = Object.keys(DIRECTION_NAMES).map(Number);
  let closest = keys[0];
  for (const k of keys) {
    if (Math.abs(deg - k) < Math.abs(deg - closest)) closest = k;
  }
  return DIRECTION_NAMES[closest] || '';
}

export function findNearestCity(lat, lng, cityCoords) {
  let nearest = '';
  let minDist = Infinity;
  for (const [name, coord] of Object.entries(cityCoords)) {
    const d = Math.sqrt((lat - coord.lat) ** 2 + (lng - coord.lng) ** 2);
    if (d < minDist) { minDist = d; nearest = name; }
  }
  return nearest;
}

export function formatPrayerTime(d) {
  const h = d.getHours(), m = d.getMinutes();
  const ap = h >= 12 ? 'م' : 'ص';
  const dh = h % 12 || 12;
  return `${dh.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ap}`;
}
