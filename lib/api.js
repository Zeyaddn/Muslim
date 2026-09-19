const BASE = 'https://api.islamic.app/v1';

async function get(url) {
  const r = await fetch(BASE + url);
  const j = await r.json();
  return j.data;
}

// === SURAHS ===
export async function fetchSurahs() {
  const data = await get('/surah');
  return data.map(s => ({ id: s.id, name: s.name_arabic || s.name_simple, nameEn: s.name_simple, type: s.revelation_type === 'meccan' ? 'مكية' : 'مدنية', verses: s.verses_count, juz: s.juz_range }));
}

// === RECITERS (app-specific mapping, not from API) ===
export const RECITERS = [
  { id: 'abdulbasit', name: 'عبد الباسط عبد الصمد', qcomId: 2 },
  { id: 'husary', name: 'محمود خليل الحصري', qcomId: null },
  { id: 'banna', name: 'محمود علي البنا', qcomId: null },
  { id: 'minshawy', name: 'محمد صديق المنشاوي', qcomId: 9 },
  { id: 'mishary', name: 'مشاري العفاسي', qcomId: null },
  { id: 'sudais', name: 'عبدالرحمن السديس', qcomId: 3 },
  { id: 'shuraym', name: 'سعود الشريم', qcomId: null },
  { id: 'ayyoub', name: 'محمد أيوب', qcomId: null },
  { id: 'ajamy', name: 'أحمد العجمي', qcomId: null },
  { id: 'maher', name: 'ماهر المعيقلي', qcomId: null },
  { id: 'dosari', name: 'ياسر الدوسري', qcomId: 174 },
  { id: 'ghamdi', name: 'سعد الغامدي', qcomId: 13 },
  { id: 'jaleel', name: 'خالد الجليل', qcomId: null },
  { id: 'qutami', name: 'ناصر القطامي', qcomId: null },
  { id: 'faris', name: 'فارس عباد', qcomId: null },
  { id: 'raad', name: 'رعد الكردي', qcomId: null },
  { id: 'bukhater', name: 'صلاح بو خاطر', qcomId: null },
  { id: 'abkar', name: 'إدريس أبكر', qcomId: null },
  { id: 'ajabr', name: 'علي جابر', qcomId: null },
  { id: 'lhdan', name: 'محمد اللحيدان', qcomId: null },
  { id: 'hani', name: 'هاني الرفاعي', qcomId: null },
];

// === DHIKR / HISN AL-MUSLIM ===
export async function fetchDhikrCategories() {
  return get('/dhikr');
}

export async function fetchDhikrByCategory(category) {
  return get(`/dhikr/${category}`);
}

export async function fetchDhikrShortcuts() {
  const data = await get('/dhikr');
  return data.shortcuts || [];
}

// Named shortcuts
export const DHIKR_SHORTCUTS = [
  'morning', 'evening', 'after-prayer', 'before-sleep', 'waking-up',
  'prayer', 'mosque', 'travel', 'food', 'home', 'anxiety', 'protection',
  'forgiveness', 'hajj'
];

export async function fetchMorningAdhkar() { return fetchDhikrByCategory('morning'); }
export async function fetchEveningAdhkar() { return fetchDhikrByCategory('evening'); }

// === ASMA AL-HUSNA ===
export async function fetchAsmaAlHusna() {
  return get('/asma-al-husna');
}

// === HADITH ===
export async function fetchHadithCollections() {
  return get('/hadith/collections');
}

export async function fetchRandomHadith() {
  return get('/hadith/random');
}

export async function fetchHadithToday() {
  return get('/hadith/today');
}

// === BOOKS ===
export async function fetchBooks() {
  return get('/library/books?limit=50&sort=title_ar');
}

export async function fetchBookText(slug) {
  const j = await fetch(`${BASE}/library/books/${slug}/text`);
  const r = await j.json();
  return r.data;
}

// === QURAN ===
export async function fetchSurah(surahId) {
  return get(`/surah/${surahId}`);
}

// === PRAYER TIMES ===
export async function fetchPrayerTimes(city, country = 'EG', method = 5) {
  return get(`/timingsByCity?city=${encodeURIComponent(city)}&country=${country}&method=${method}`);
}

// === HIJRI ===
export async function fetchHijriCalendar(year, month) {
  return get(`/hijri/calendar/${year}/${month}`);
}

export async function convertGregToHijri(day, month, year) {
  return get(`/hijri/g-to-h/${day}-${month}-${year}`);
}

export async function convertHijriToGreg(day, month, year) {
  return get(`/hijri/h-to-g/${day}-${month}-${year}`);
}
