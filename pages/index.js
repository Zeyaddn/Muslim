import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useRef } from 'react';
import ISLAMIC_DATA from '../data/islamic-data';
import { showToast } from '../components/Toast';
import { EGYPT_CITY_COORDS } from '../constants';
import {
  stripBasmalah, getCachedSurah, setCachedSurah,
  getLastRead, saveLastRead, getBookmarks, setBookmark,
  findNearestCity, formatTime, calculatePrayerTimes,
} from '../utils';
import { getPrefs, savePrefs, getGeoCache, saveGeoCache, syncPushState } from '../utils/prayer-push';
import { setPrayerSchedule } from '../utils/local-reminders';

import HomePage from '../sections/HomePage';

// Heavy / rarely-used views are code-split so react-pdf, TV overlays and
// secondary sections never ship in the initial JS bundle. Only loaded
// on demand when the user first opens that tab — cached by SW after.
// The shared `loading` fallback shows a spinner during the very first
// chunk fetch so tab switches never flash a blank screen.
const TabLoading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
    <div style={{ width: 44, height: 44, border: '4px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spinnerRotate .8s linear infinite' }} />
  </div>
);
const LF = { loading: TabLoading };
const QuranReaderPage = dynamic(() => import('../sections/QuranReaderPage'), { ssr: false, ...LF });
const AdhkarPage = dynamic(() => import('../sections/AdhkarPage'), { ssr: false, ...LF });
const TasbeehPage = dynamic(() => import('../sections/TasbeehPage'), { ssr: false, ...LF });
const NamesPage = dynamic(() => import('../sections/NamesPage'), { ssr: false, ...LF });
const ArticlesPage = dynamic(() => import('../sections/ArticlesPage'), { ssr: false, ...LF });
const LibraryPage = dynamic(() => import('../sections/LibraryPage'), { ssr: false, ...LF });
const VideosPage = dynamic(() => import('../sections/VideosPage'), { ssr: false, ...LF });
const ContactPage = dynamic(() => import('../sections/ContactPage'), { ssr: false, ...LF });
const BookViewer = dynamic(() => import('../overlays/BookViewer'), { ssr: false, ...LF });
const QuranTvOverlay = dynamic(() => import('../overlays/QuranTvOverlay'), { ssr: false, ...LF });
const QuranPage = dynamic(() => import('../sections/QuranPage'), { ssr: false, ...LF });
const FloatingAudioPlayer = dynamic(() => import('../overlays/FloatingAudioPlayer'), { ssr: false, ...LF });

const PRAYER_NAMES = ['الفجر', 'الشروق', 'الظهر', 'العصر', 'المغرب', 'العشاء'];
const TV_IMAGES = [
  'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?q=80&w=1920&auto=format&fit=crop',
];

export { formatTime };

const RECITER_SERVERS = {
  abdulbasit: [{ server: 7, folder: 'basit' }],
  husary: [{ server: 13, folder: 'husr' }],
  minshawy: [{ server: 10, folder: 'minsh' }],
  mishary: [{ server: 8, folder: 'afs' }],
  sudais: [{ server: 11, folder: 'sds' }],
  shuraym: [{ server: 7, folder: 'shur' }],
  ayyoub: [{ server: 8, folder: 'ayyoub' }],
  ajamy: [{ server: 10, folder: 'ajm' }],
  maher: [{ server: 12, folder: 'maher' }],
  dosari: [{ server: 11, folder: 'yasser' }],
  ghamdi: [{ server: 6, folder: 'ghamdi' }, { server: 7, folder: 's_gmd' }],
  jaleel: [{ server: 10, folder: 'jleel' }],
  qutami: [{ server: 6, folder: 'qtm' }],
  faris: [{ server: 8, folder: 'frs_a' }],
  raad: [{ server: 8, folder: 'ra3ad' }],
  bukhater: [{ server: 8, folder: 'bu_khtr' }],
  abkar: [{ server: 6, folder: 'abkr' }],
  banna: [{ server: 8, folder: 'bna' }],
  ajabr: [{ server: 11, folder: 'a_jbr' }],
  lhdan: [{ server: 8, folder: 'lhdan' }],
  hani: [{ server: 8, folder: 'hani' }],
};

// ===== UNIFIED AYAH SYNC ENGINE =====
// One system drives highlight/scroll/seek for EVERY reciter. A reciter is playable
// ayah-by-ayah if EITHER source resolves (checked in this order):
//   1. quran.com API v4 (reciter.qcomId) -> real per-ayah audio files on verses.quran.com
//      + genuine millisecond segments from the same trusted source. Adding a future
//      reciter = adding one line { id, name, qcomId } in islamic-data.js. No engine changes.
//   2. everyayah.com folder map -> per-ayah files (offline of the quran.com API).
// Reciters with neither play a full-surah stream WITHOUT any estimated timestamps
// (no fake equal-division sync).
const QCOM_API = 'https://api.quran.com/api/v4';
const absolutizeQcomUrl = (u) =>
  u.startsWith('http') ? (u.startsWith('//') ? 'https:' + u : u) : 'https://verses.quran.com/' + u;

// Fallback per-ayah source (used when quran.com API is unreachable for a mapped reciter).
const EVERYAYAH_FOLDERS = {
  abdulbasit: 'Abdul_Basit_Murattal_192kbps',
  husary: 'Husary_128kbps',
  banna: 'Mahmoud_Ali_Al_Banna_32kbps',
  minshawy: 'Minshawy_Murattal_128kbps',
  mishary: 'Alafasy_128kbps',
  sudais: 'Abdurrahmaan_As-Sudais_192kbps',
  shuraym: 'Saood_ash-Shuraym_128kbps',
  ayyoub: 'Muhammad_Ayyoub_128kbps',
  ajamy: 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net',
  maher: 'MaherAlMuaiqly128kbps',
  dosari: 'Yasser_Ad-Dussary_128kbps',
  ghamdi: 'Ghamadi_40kbps',
  qutami: 'Nasser_Alqatami_128kbps',
  faris: 'Fares_Abbad_64kbps',
  ajabr: 'Ali_Jaber_64kbps',
  hani: 'Hani_Rifai_192kbps',
};

const buildAyahUrl = (reciterId, surahId, ayahInSurah) =>
  `https://everyayah.com/data/${EVERYAYAH_FOLDERS[reciterId]}/${String(surahId).padStart(3, '0')}${String(ayahInSurah).padStart(3, '0')}.mp3`;

export default function Index({ activePage, onNavigate, theme }) {
  const [page, setPage] = useState('home');
  const effectivePage = activePage || page;
  const effectiveNavigate = onNavigate || setPage;
  const [isOffline, setIsOffline] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => {
    const applyHash = () => {
      try {
        const hash = window.location.hash.replace('#', '');
        if (['quran', 'tasbeeh', 'adhkar', 'names', 'articles', 'library', 'videos', 'contact'].includes(hash)) {
          if (typeof effectiveNavigate === 'function') effectiveNavigate(hash);
          else setPage(hash);
        }
      } catch (e) {}
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [effectiveNavigate]);

  // Returning home from a standalone route (/qibla): open the section the
  // navbar asked for (stored by Layout before router.push('/')).
  useEffect(() => {
    let target = null;
    try {
      target = sessionStorage.getItem('huda_nav_target');
      sessionStorage.removeItem('huda_nav_target');
    } catch (e) {}
    if (target && ['quran', 'tasbeeh', 'adhkar', 'names', 'articles', 'library', 'videos', 'contact'].includes(target)) {
      if (typeof effectiveNavigate === 'function') effectiveNavigate(target);
      else setPage(target);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      const handleOnline = () => { setIsOffline(false); showToast('تم استعادة الاتصال بالإنترنت', 'success'); };
      const handleOffline = () => { setIsOffline(true); showToast('أنت الآن في وضع عدم الاتصال (Offline)', 'error'); };
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
    }
  }, []);

  const [quranSearch, setQuranSearch] = useState('');
  const [selectedReciter, setSelectedReciter] = useState(ISLAMIC_DATA.reciters[0]);
  const [_quranModal, setQuranModal] = useState(null);
  const [surahData, setSurahData] = useState(null);
  const surahDataRef = useRef(null);
  useEffect(() => { surahDataRef.current = surahData; }, [surahData]);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [surahLoadError, setSurahLoadError] = useState(false);
  const [tafsirMode, setTafsirMode] = useState(null);
  const [selectedTafsir, setSelectedTafsir] = useState('ar.muyassar');
  const [quranBookmarks, setQuranBookmarks] = useState([]);
  const audioRef = useRef(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const ayahModeRef = useRef(false);
  const nextAudioRef = useRef(null);
  const syncPlanRef = useRef(null);      // active per-ayah plan {source, urls?}
  const ayahDurationsRef = useRef({});   // real measured durations (seconds) per ayah idx
  const ayahStateRef = useRef({ surahId: null, idx: -1 });
  const [playingSurahId, setPlayingSurahId] = useState(null);
  const playingSurahIdRef = useRef(null);
  useEffect(() => { playingSurahIdRef.current = playingSurahId; }, [playingSurahId]);
  const [_audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const ayahTimestampsRef = useRef(null);
  const activeAyahRef = useRef(null);
  const fpElsRef = useRef({});
  const lastTsIdxRef = useRef(-1);
  const completedAudioRef = useRef(0); // seconds of finished ayahs in this play session
  const consecutiveErrRef = useRef(0); // broken ayah files in a row (auto-skip guard)

  const [prayerTimes, setPrayerTimes] = useState([]);
  const [nextPrayerIdx, setNextPrayerIdx] = useState(0);
  const [countdown, setCountdown] = useState('');
  const [userLoc, setUserLoc] = useState(null);
  const [userCity, setUserCity] = useState('');
  const [prayerMethod] = useState(5);

  // ===== Location permission UX + prayer push sync =====
  const [geoStatus, setGeoStatus] = useState(null); // 'granted' | 'denied' | 'manual'
  const [showGeoBanner, setShowGeoBanner] = useState(false);
  const [prefsTick, setPrefsTick] = useState(0);
  const geoWatchRef = useRef(null);
  const lastSyncKeyRef = useRef('');

  const [adhkarPlaying, setAdhkarPlaying] = useState(null);
  const [adhkarPaused, setAdhkarPaused] = useState(false);
  const [adhkarAudioLoading, setAdhkarAudioLoading] = useState(null);
  const adhkarAudioRef = useRef(null);

  const [tasbeehDhikr, setTasbeehDhikr] = useState(ISLAMIC_DATA.tasbeehOptions[0]);
  const [tasbeehCount, setTasbeehCount] = useState(0);
  const [tasbeehTarget, setTasbeehTarget] = useState(33);
  const [namesSearch, setNamesSearch] = useState('');
  const [randomAyah, setRandomAyah] = useState({ text: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', surah: 'الشرح', ayah: 5 });
  const [randomHadith, setRandomHadith] = useState({ text: 'خيركم من تعلم القرآن وعلمه' });
  const [quranFontSize, setQuranFontSize] = useState(1.4);
  const [quranNightMode, setQuranNightMode] = useState(false);
  const [lastRead, setLastRead] = useState(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCategory, setLibraryCategory] = useState('all');
  const [sadaqahIdea, setSadaqahIdea] = useState(null);
  const [sadaqahDone, setSadaqahDone] = useState(false);
  const [sadaqahStreak, setSadaqahStreak] = useState(0);
  const [sadaqahCoins, setSadaqahCoins] = useState(0);
  const [_ramadanCountdown, _setRamadanCountdown] = useState('');
  const [bookModal, setBookModal] = useState(null);
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [pdfPageIdx, setPdfPageIdx] = useState(1);
  const [_pdfLoading, _setPdfLoading] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(1.3);
  const [pdfJumpInput, setPdfJumpInput] = useState('');
  const [pdfScrollMode, setPdfScrollMode] = useState(false);
  const [pdfFocusMode, setPdfFocusMode] = useState(false);
  const [pdfCustomWidth, setPdfCustomWidth] = useState(null);
  const [currentSurahInfo, setCurrentSurahInfo] = useState(null);
  const [quranTvMode, setQuranTvMode] = useState(false);
  const [_tvImageSrc, _setTvImageSrc] = useState(TV_IMAGES[0]);
  const [currentAyahIdx, setCurrentAyahIdx] = useState(0);

  const [apiSurahs, setApiSurahs] = useState([]);
  const [apiNamesData, setApiNamesData] = useState([]);

  useEffect(() => {
    // Non-critical API data (Quran chapters + Names of Allah) is only fetched
    // by the Quran/Names tabs. Kick off the request during idle time instead of
    // blocking initial render.
    const idle = (cb) => (typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? window.requestIdleCallback(cb, { timeout: 3000 })
      : setTimeout(cb, 1200));
    const id = idle(() => {
      fetch('https://api.islamic.app/v1/chapters').then(r => r.json()).then(j => {
        if (j.data?.chapters) setApiSurahs(j.data.chapters.map(s => ({ id: s.id, name: s.name_arabic || s.name_simple, nameEn: s.name_simple, type: s.revelation_place === 'makkah' ? 'مكية' : 'مدنية', verses: s.verses_count, juz: null })));
      }).catch(() => {});
      fetch('https://api.islamic.app/v1/asma-al-husna').then(r => r.json()).then(j => { if (j.data) setApiNamesData(j.data); }).catch(() => {});
    });
    return () => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) window.cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

  useEffect(() => { setQuranBookmarks(getBookmarks()); setLastRead(getLastRead()); }, []);

  useEffect(() => {
    const msg = ISLAMIC_DATA.quranMessages[Math.floor(Math.random() * ISLAMIC_DATA.quranMessages.length)];
    if (msg) setRandomAyah(msg);
  }, []);

  useEffect(() => {
    fetch('https://api.islamic.app/v1/hadith/random').then(r => r.json()).then(j => {
      if (j.data) { const h = j.data; setRandomHadith({ text: h.body || h.text || '', narrator: '', source: h.collection?.title || '' }); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const idx = Math.floor(Math.random() * ISLAMIC_DATA.sadaqahIdeas.length);
    setSadaqahIdea(ISLAMIC_DATA.sadaqahIdeas[idx]);
    try {
      const saved = JSON.parse(localStorage.getItem('sadaqahData') || '{}');
      if (saved.streak) setSadaqahStreak(saved.streak);
      if (saved.coins) setSadaqahCoins(saved.coins);
      const today = new Date().toDateString();
      if (saved.date === today) setSadaqahDone(true);
    } catch {}
  }, []);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme || 'light'); }, [theme]);

  const getCityFromCoords = useCallback(async (lat, lng) => {
    const nearest = findNearestCity(lat, lng, EGYPT_CITY_COORDS);
    if (nearest) { setUserCity(nearest); showToast('تم تحديد موقعك: ' + nearest, 'success'); }
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`);
      const j = await r.json();
      const osmCity = j?.address?.city || j?.address?.town || j?.address?.village || j?.address?.county || '';
      if (osmCity && EGYPT_CITY_COORDS[osmCity]) { setUserCity(osmCity); showToast('تم تحديد موقعك: ' + osmCity, 'success'); }
    } catch {}
  }, []);

  const applyLocation = useCallback((lat, lng, { silent } = {}) => {
    setUserLoc({ lat, lng });
        if (silent) {
      const nearest = findNearestCity(lat, lng, EGYPT_CITY_COORDS);
      if (nearest) setUserCity(prev => prev || nearest);
    } else {
      getCityFromCoords(lat, lng);
    }
  }, [getCityFromCoords]);

  const requestLocation = useCallback((opts = {}) => {
    if (!('geolocation' in navigator)) { showToast('متصفحك لا يدعم تحديد الموقع', 'error'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        saveGeoCache({ lat, lng, status: 'granted', ts: Date.now(), city: '' });
        setGeoStatus('granted');
        setShowGeoBanner(false);
        try { sessionStorage.removeItem('huda_geo_dismissed'); } catch {}
        const nearest = findNearestCity(lat, lng, EGYPT_CITY_COORDS);
        if (nearest) setUserCity(nearest);
        applyLocation(lat, lng, { silent: true });
        if (!opts.quiet) showToast('تم تحديد موقعك: ' + (nearest || 'تم'), 'success');
        // Respectful one-time notification opt-in chained to the location consent
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          savePrefs(getPrefs() || { notify: true, adhan: true });
          Notification.requestPermission().then(r => {
            if (r === 'granted') showToast('تم تفعيل تنبيهات مواقيت الصلاة 🔔', 'success');
          }).catch(() => {});
        }
      },
      () => {
        saveGeoCache({ status: 'denied' });
        setGeoStatus('denied');
        setShowGeoBanner(false);
        showToast('لم يُسمح بالموقع — اختر مدينتك يدوياً ويمكنك التفعيل لاحقاً من زر الموقع', 'info');
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, [applyLocation]);

  const chooseManualCity = useCallback(() => {
    saveGeoCache({ status: 'manual' });
    setGeoStatus('manual');
    setShowGeoBanner(false);
    showToast('اختر مدينتك من القائمة في بطاقة مواقيت الصلاة 📍', 'info');
  }, []);

  const dismissGeoBanner = useCallback(() => {
    setShowGeoBanner(false);
    try { sessionStorage.setItem('huda_geo_dismissed', '1'); } catch {}
  }, []);

  // Restore cached location instead of re-prompting every visit
  useEffect(() => {
    const g = getGeoCache();
    if (g?.status) setGeoStatus(g.status);
    if (g?.status === 'granted' && g.lat && g.lng) {
      applyLocation(g.lat, g.lng, { silent: true });
      if (g.city) setUserCity(g.city);
    } else {
      // First-run permissions are handled by OnboardingGate (Layout) now
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow significant moves (>5km): refresh city & push schedule silently
  useEffect(() => {
    if (geoStatus !== 'granted' || typeof navigator === 'undefined' || !('geolocation' in navigator)) return undefined;
    let lastCheck = 0;
    const id = navigator.geolocation.watchPosition(pos => {
      const now = Date.now();
      if (now - lastCheck < 60000) return;
      lastCheck = now;
      const g = getGeoCache();
      if (!g?.lat) return;
      const dLat = (pos.coords.latitude - g.lat) * Math.PI / 180;
      const dLng = (pos.coords.longitude - g.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(g.lat * Math.PI / 180) * Math.cos(pos.coords.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const km = 12742 * Math.asin(Math.sqrt(a));
      if (km > 5) {
        const nearest = findNearestCity(pos.coords.latitude, pos.coords.longitude, EGYPT_CITY_COORDS);
        saveGeoCache({ lat: pos.coords.latitude, lng: pos.coords.longitude, ts: now });
        if (nearest && nearest !== userCity) { setUserCity(nearest); showToast('تم تحديث موقعك إلى ' + nearest, 'info'); }
        else { applyLocation(pos.coords.latitude, pos.coords.longitude, { silent: true }); }
      }
    }, () => {}, { enableHighAccuracy: false, maximumAge: 300000 });
    return () => { if (id !== null && id !== undefined) navigator.geolocation.clearWatch(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoStatus]);

  // Keep server-side schedule in sync with location/city/prefs changes
  useEffect(() => {
    if (!isMounted) return;
    const prefs = getPrefs() || { notify: true, adhan: true };
    const g = getGeoCache();
    syncPushState({
      prefs,
      loc: userLoc || (g?.lat !== null && g?.lat !== undefined ? { lat: g.lat, lng: g.lng } : null),
      city: userCity || g?.city || '',
    }).catch(() => {});
  }, [isMounted, userLoc, userCity, prefsTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onPrefsChanged = () => setPrefsTick(t => t + 1);
    window.addEventListener('huda:prefs-changed', onPrefsChanged);
    return () => window.removeEventListener('huda:prefs-changed', onPrefsChanged);
  }, []);

  useEffect(() => {
    if (userLoc) return;
    const city = userCity || 'القاهرة';
    const coords = EGYPT_CITY_COORDS[city];
      }, [userCity, userLoc]);

  useEffect(() => {
    const city = userCity || 'القاهرة';
    const coords = EGYPT_CITY_COORDS[city];
    const loadPrayerTimes = async () => {
      try {
        const r = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=EG&method=${prayerMethod}`);
        const j = await r.json();
        if (j?.data?.timings) {
          const t = j.data.timings;
          const today = new Date();
          const pNames = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
          setPrayerTimes(pNames.map((name, i) => {
            const timeStr = t[name];
            if (!timeStr) return { name: PRAYER_NAMES[i], time: '--:--', date: today };
            const [h, m] = timeStr.split(':').map(Number);
            const date = new Date(today); date.setHours(h, m, 0, 0);
            const ap = h >= 12 ? 'م' : 'ص'; const dh = h % 12 || 12;
            return { name: PRAYER_NAMES[i], time: `${dh.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ap}`, date };
          }));
          return;
        }
      } catch {}
      if (coords) setPrayerTimes(calculatePrayerTimes(coords.lat, coords.lng));
    };
    loadPrayerTimes();
  }, [userCity, prayerMethod]);

  // Feed today's Fajr/Asr to the local adhkar reminder engine.
  useEffect(() => {
    if (prayerTimes.length < 6) return;
    const fajr = prayerTimes[0]?.date;
    const asr = prayerTimes[3]?.date;
    if (fajr && asr) setPrayerSchedule({ fajr, asr });
  }, [prayerTimes]);

  useEffect(() => {
    if (prayerTimes.length === 0) return;
    const update = () => {
      const n2 = new Date();
      let nextIdx = prayerTimes.findIndex(t => t.date > n2);
      if (nextIdx === -1) nextIdx = 0;
      setNextPrayerIdx(nextIdx);
      const diff = prayerTimes[nextIdx].date - n2;
      if (diff > 0) {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const str = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        setCountdown(str);
        const el = document.getElementById('prayer-countdown-text');
        if (el && el.innerText !== str) el.innerText = str;
      }
    };
    update();
    const iv = setInterval(() => {
      const n2 = new Date();
      let nextIdx = prayerTimes.findIndex(t => t.date > n2);
      if (nextIdx === -1) nextIdx = 0;
      setNextPrayerIdx(prev => prev !== nextIdx ? nextIdx : prev);
      const diff = prayerTimes[nextIdx].date - n2;
      if (diff > 0) {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const str = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        const el = document.getElementById('prayer-countdown-text');
        if (el && el.innerText !== str) el.innerText = str;
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [prayerTimes]);

  useEffect(() => { if (effectivePage === 'library') setPdfNumPages(null); }, [effectivePage]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };
    }
  }, []);

  useEffect(() => {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;
    const handler = () => btn.classList.toggle('visible', window.scrollY > 400);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // ===== OPTIMIZED AUDIO FUNCTIONS =====

  const openSurah = useCallback(async (id) => {
    setQuranModal(id);
    setLoadingSurah(true);
    setSurahLoadError(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setAudioPlaying(false);
    setTafsirMode(null);
    try { localStorage.setItem('lastReadSurahId', String(id)); } catch {}
    effectiveNavigate('quran-reader');

    const cached = await getCachedSurah(id);
    if (cached) {
      const stripped = stripBasmalah([...cached.ayahs], id);
      setSurahData({ ...cached, ayahs: stripped });
      setLoadingSurah(false);
    }

    let loaded = false;
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${id}/ar.alafasy`);
      const json = await res.json();
      if (json?.data) {
        const data = json.data;
        let ayahs = data.ayahs.map(a => ({ number: a.number, numberInSurah: a.numberInSurah, text: a.text, juz: a.juz || 1 }));
        ayahs = stripBasmalah(ayahs, id);
        const mapped = { number: data.number, name: data.name, englishName: data.englishName, numberOfAyahs: ayahs.length, revelationType: data.revelationType, ayahs };
        setSurahData(mapped);
        setCachedSurah(id, mapped);
        loaded = true;
      }
    } catch {}
    if (!loaded && !cached) setSurahLoadError(true);
    setLoadingSurah(false);
  }, []);

  useEffect(() => {
    if (!isMounted || effectivePage !== 'quran-reader' || surahData) return;
    try {
      const savedId = localStorage.getItem('lastReadSurahId');
      if (savedId) {
        openSurah(Number(savedId));
      } else {
        effectiveNavigate('quran');
      }
    } catch {}
  }, [isMounted, effectivePage, surahData, openSurah]);

  const loadTafsirForSurah = useCallback(async (tafsirId) => {
    if (!surahData) return;
    const surahNum = surahData.number;
    const loadTafsirFrom = async (url) => {
      try { const res = await fetch(url); const json = await res.json(); if (!json?.data) return null; let tafsirAyahs = json.data.ayahs.map(a => ({ text: a.text })); tafsirAyahs = stripBasmalah(tafsirAyahs, surahNum); return tafsirAyahs; } catch { return null; }
    };
    const tafsirTexts = await loadTafsirFrom(`https://api.alquran.cloud/v1/surah/${surahNum}/${tafsirId}`);
    if (tafsirTexts) {
      const merged = { ...surahData };
      merged.ayahs = surahData.ayahs.map((a, i) => ({ ...a, tafsir: tafsirTexts[i]?.text || null }));
      setSurahData(merged);
    } else showToast('التفسير غير متاح لهذه السورة', 'error');
  }, [surahData]);

  const toggleTafsir = useCallback(async () => {
    if (tafsirMode) { setTafsirMode(null); return; }
    setTafsirMode(selectedTafsir);
    await loadTafsirForSurah(selectedTafsir);
  }, [tafsirMode, selectedTafsir, loadTafsirForSurah]);

  const retryLoadSurah = useCallback(() => {
    let id = null;
    try { id = Number(localStorage.getItem('lastReadSurahId')); } catch {}
    if (id >= 1 && id <= 114) {
      openSurah(id);
    } else {
      effectiveNavigate('quran');
    }
  }, [openSurah, effectiveNavigate]);

  const openPdfBook = useCallback((book) => {
    setPdfNumPages(null);
    setPdfPageIdx(1);
    setPdfZoom(1);
    setPdfJumpInput('');
    setPdfCustomWidth(null);
    setPdfFocusMode(false);
    setBookModal(book);
  }, []);

  const toggleBookmark = useCallback((id) => {
    const b = setBookmark(id);
    setQuranBookmarks(b);
    showToast(b.indexOf(id) > -1 ? 'تمت الإضافة للمحفوظات' : 'تمت الإزالة من المحفوظات', 'success');
  }, []);

  // ===== UNIFIED PER-AYAH PLAYBACK ENGINE =====
  // Resolves the ayah-audio plan for (reciter, surah). One interface for all reciters.
  const resolveAyahPlan = useCallback(async (reciter, surahId, expectedCount) => {
    // Source 1: quran.com — trusted unified source with real per-ayah audio + ms segments
    if (reciter.qcomId) {
      try {
        const collected = [];
        const durations = [];
        let page = 1;
        while (page <= 15) {
          const res = await fetch(`${QCOM_API}/verses/by_chapter/${surahId}?audio=${reciter.qcomId}&fields=audio&per_page=300&page=${page}`);
          const j = await res.json();
          const vs = j?.verses || [];
          for (const v of vs) {
            if (!v.audio?.url) return null;
            collected.push(absolutizeQcomUrl(v.audio.url));
            // Real per-ayah duration (seconds) from the same trusted source —
            // gives the exact surah total BEFORE anything plays.
            durations.push(typeof v.audio.duration === 'number' && v.audio.duration > 0 ? v.audio.duration : 0);
          }
          if (!j?.pagination?.next_page || (expectedCount && collected.length >= expectedCount)) break;
          page++;
        }
        if (collected.length) return { source: 'qurancom', urls: collected, durations };
      } catch (e) { /* fall through to next source */ }
    }
    // Source 2: everyayah folders (deterministic URL scheme, zero API dependency)
    if (EVERYAYAH_FOLDERS[reciter.id]) return { source: 'everyayah' };
    return null;
  }, []);

  // Scroll the given ayah into view (shared by per-ayah and timestamp modes).
  const scrollAyahIntoView = useCallback((idx) => {
    if (activeAyahRef.current && activeAyahRef.current.dataset.ayahIdx === String(idx)) return;
    const el = document.querySelector(`[data-ayah-idx="${idx}"]`);
    if (el) {
      activeAyahRef.current = el;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const playAyahFile = useCallback((surahId, idx, opts = {}) => {
    const a = audioRef.current;
    const sd = surahDataRef.current;
    if (!a || !sd || sd.number !== surahId) return;
    const bounded = Math.max(0, Math.min(idx, sd.ayahs.length - 1));
    ayahStateRef.current = { surahId, idx: bounded };
    // NOTE: the visible highlight/counter intentionally does NOT move yet.
    // It moves only when the new file is actually audible (in play().then)
    // so the UI always matches what the user hears, never the loading state.
    const plan = syncPlanRef.current;
    const urlFor = (i) => (plan?.source === 'qurancom'
      ? plan.urls[i]
      : buildAyahUrl(selectedReciter.id, surahId, sd.ayahs[i].numberInSurah));
    a.src = urlFor(bounded);
    a.load();
    // Capture the REAL duration of each ayah file as it loads (measured timing data
    // also powers the surah-level progress bar).
    a.addEventListener('loadedmetadata', () => {
      if (a.duration && isFinite(a.duration)) {
        ayahDurationsRef.current[bounded] = a.duration;
        // No exact durations source (everyayah): refine the surah-total estimate
        // as real files get measured (avg × count converges quickly).
        if (syncPlanRef.current?.source !== 'qurancom') {
          const durs = ayahDurationsRef.current;
          let sum = 0, n = 0;
          for (const k in durs) { sum += durs[k]; n++; }
          if (n > 0 && sd.ayahs.length) setAudioDuration((sum / n) * sd.ayahs.length);
        }
      }
    }, { once: true });
    // Pre-buffer the next ayah so transitions are gapless (SW serves it from cache)
    if (bounded + 1 < sd.ayahs.length) {
      if (!nextAudioRef.current && typeof Audio !== 'undefined') nextAudioRef.current = new Audio();
      nextAudioRef.current.src = urlFor(bounded + 1);
      nextAudioRef.current.preload = 'auto';
      nextAudioRef.current.load();
    }
    if (opts.autoPlay === false) { setAudioPlaying(false); return; }
    a.play().then(() => {
      consecutiveErrRef.current = 0;
      setCurrentAyahIdx(bounded);
      scrollAyahIntoView(bounded);
      setAudioPlaying(true);
    }).catch(() => {
      showToast('تعذر تشغيل الصوت', 'error');
    });
  }, [selectedReciter]);

  // Unified entry point: resolves text + one sync plan, then plays.
  const fetchSurahAndPlay = useCallback(async (surahId, openTv, startAyahIdx, opts = {}) => {
    if (!audioRef.current) return;
    if (openTv) showToast('جاري تحضير التلاوة، يرجى الانتظار...', 'info');
    setLoadingSurah(true);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setCurrentAyahIdx(startAyahIdx || 0);
    setQuranModal(surahId);
    ayahTimestampsRef.current = null;
    lastTsIdxRef.current = -1;
    syncPlanRef.current = null;
    nextAudioRef.current = null;
    completedAudioRef.current = 0;
    consecutiveErrRef.current = 0;

    const cached = await getCachedSurah(surahId);
    if (cached) {
      const stripped = stripBasmalah([...cached.ayahs], surahId);
      setSurahData({ ...cached, ayahs: stripped });
    }

    const textPromise = cached ? Promise.resolve(null) : fetch(`https://api.alquran.cloud/v1/surah/${surahId}/ar.alafasy`).then(r => r.json()).catch(() => null);

    // Surah text (needed by both modes)
    let sd = null;
    if (cached) {
      sd = { ...cached, ayahs: stripBasmalah([...cached.ayahs], surahId) };
      setLoadingSurah(false);
    } else {
      const textResult = await textPromise;
      if (textResult?.data) {
        const d = textResult.data;
        let ayahs = d.ayahs.map(a => ({ number: a.number, numberInSurah: a.numberInSurah, text: a.text, juz: a.juz || 1 }));
        ayahs = stripBasmalah(ayahs, surahId);
        sd = { number: d.number, name: d.name, englishName: d.englishName, numberOfAyahs: ayahs.length, revelationType: d.revelationType, ayahs };
        setSurahData(sd);
        setCachedSurah(surahId, sd);
      }
      setLoadingSurah(false);
    }
    if (!sd?.ayahs?.length) { showToast('تعذر تحميل السورة', 'error'); return; }

    // One unified plan drives highlight/scroll/seek for this reciter+surah.
    const plan = await resolveAyahPlan(selectedReciter, surahId, sd.ayahs.length);

    if (plan) {
      ayahModeRef.current = true;
      syncPlanRef.current = plan;
      if (plan.durations) {
        // Seed exact measured durations up-front → progress bar + total time are
        // precise from the very first second (no 0:00).
        const seeded = {};
        let total = 0;
        plan.durations.forEach((d, i) => { if (d > 0) { seeded[i] = d; total += d; } });
        ayahDurationsRef.current = seeded;
        if (total > 0) setAudioDuration(total);
      } else {
        ayahDurationsRef.current = {};
      }
      setPlayingSurahId(surahId);
      playAyahFile(surahId, startAyahIdx || 0, { autoPlay: opts.autoPlay !== false });
    } else {
      // No trusted timing source for this reciter: honest stream without fake sync.
      ayahModeRef.current = false;
      syncPlanRef.current = null;
      nextAudioRef.current = null;
      if (startAyahIdx > 0) showToast('المزامنة آية-بآية غير متاحة لهذا القارئ — سيتم التشغيل من بداية السورة', 'info');
      const servers = RECITER_SERVERS[selectedReciter.id];
      const audioUrl = servers?.length
        ? `https://server${servers[0].server}.mp3quran.net/${servers[0].folder}/${String(surahId).padStart(3, '0')}.mp3`
        : null;
      if (!audioUrl) { showToast('لا يوجد رابط للصوت', 'error'); return; }
      setPlayingSurahId(surahId);
      const a = audioRef.current;
      a.preload = 'auto';
      a.src = audioUrl;
      a.load();
      const doPlay = () => {
        if (opts.resumeAt !== null && opts.resumeAt !== undefined && isFinite(opts.resumeAt)) { try { a.currentTime = opts.resumeAt; } catch (e) {} }
        a.play().then(() => setAudioPlaying(true)).catch(() => showToast('تعذر تشغيل الصوت', 'error'));
      };
      a.addEventListener('canplay', doPlay, { once: true });
    }

    if (openTv) {
      setQuranTvMode(true);
      setCurrentSurahInfo(apiSurahs.find(s => s.id === surahId) || null);
      _setTvImageSrc(TV_IMAGES[Math.floor(Math.random() * TV_IMAGES.length)]);
    }
  }, [selectedReciter, apiSurahs, playAyahFile, resolveAyahPlan]);

  // Reciter switch mid-surah: keep the exact current ayah and restart the new
  // reciter's recitation from that same ayah (paused stays paused).
  const prevReciterIdRef = useRef(selectedReciter.id);
  useEffect(() => {
    if (prevReciterIdRef.current === selectedReciter.id) return;
    prevReciterIdRef.current = selectedReciter.id;
    const sd = surahDataRef.current;
    const a = audioRef.current;
    if (!playingSurahId || !sd || !a || !a.src || playingSurahId !== sd.number) return;
    const wasPlaying = audioPlaying;
    showToast(`التلاوة الآن بصوت ${selectedReciter.name} من نفس الآية`, 'success');
    if (ayahModeRef.current && selectedReciter.qcomId) {
      // Re-resolve the plan for the NEW reciter — the cached plan belongs to the previous one.
      resolveAyahPlan(selectedReciter, sd.number, sd.ayahs.length).then(plan => {
        if (!playingSurahId || playingSurahId !== surahDataRef.current?.number) return;
        if (plan) {
          syncPlanRef.current = plan;
          playAyahFile(sd.number, currentAyahIdx, { autoPlay: wasPlaying });
        } else {
          fetchSurahAndPlay(sd.number, false, currentAyahIdx);
        }
      }).catch(() => {});
    } else if (EVERYAYAH_FOLDERS[selectedReciter.id]) {
      // everyayah-only reciter: deterministic URLs need no resolution
      syncPlanRef.current = { source: 'everyayah' };
      playAyahFile(sd.number, currentAyahIdx, { autoPlay: wasPlaying });
    } else {
      fetchSurahAndPlay(sd.number, false, currentAyahIdx);
    }
  }, [selectedReciter, playingSurahId, audioPlaying, currentAyahIdx, playAyahFile, fetchSurahAndPlay]);

  // Toggle play/pause for a surah from the list: pause if this surah is playing,
  // resume if paused mid-surah, otherwise start it fresh.
  const toggleSurahPlay = useCallback((surahId) => {
    const a = audioRef.current;
    const padded = String(surahId).padStart(3, '0');
    if (a && a.src && a.src.includes(padded)) {
      if (audioPlaying) { a.pause(); setAudioPlaying(false); }
      else { a.play().then(() => setAudioPlaying(true)).catch(() => showToast('تعذر تشغيل الصوت', 'error')); }
      return;
    }
    fetchSurahAndPlay(surahId, true);
  }, [audioPlaying, fetchSurahAndPlay]);

  // Toolbar toggle inside the reader: pause/resume current audio instead of reloading.
  const togglePlayback = useCallback(() => {
    const a = audioRef.current;
    if (!a || !a.src) {
      if (surahDataRef.current?.number) fetchSurahAndPlay(surahDataRef.current.number, true);
      return;
    }
    if (audioPlaying) { a.pause(); setAudioPlaying(false); }
    else { a.play().then(() => setAudioPlaying(true)).catch(() => showToast('تعذر تشغيل الصوت', 'error')); }
  }, [audioPlaying, fetchSurahAndPlay]);

  const stopRecitation = useCallback(() => {
    setPlayingSurahId(null);
    ayahStateRef.current = { surahId: null, idx: -1 };
    if (audioRef.current) { audioRef.current.pause(); }
  }, []);

  const closeTvMode = useCallback(() => {
    setQuranTvMode(false);
    setAudioPlaying(false);
    setPlayingSurahId(null);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setCurrentSurahInfo(null);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    const ct = a.currentTime;
    const dur = a.duration || 0;

    // Default display values (element-level). Per-ayah mode overrides them with
    // SURAH-level values so the bar never sawtooths back to zero every ayah.
    let dispPct = dur ? (ct / dur) * 100 : 0;
    let dispCur = ct;
    let dispTot = dur;

    if (ayahModeRef.current) {
      const sd = surahDataRef.current;
      const durs = ayahDurationsRef.current;
      const idxNow = ayahStateRef.current.idx;
      let sumKnown = 0, knownCount = 0;
      for (const k in durs) { sumKnown += durs[k]; knownCount++; }
      const avg = knownCount ? sumKnown / knownCount : 0;
      let totalEst = 0;
      if (sd?.ayahs?.length) {
        for (let i = 0; i < sd.ayahs.length; i++) totalEst += durs[i] || avg;
      }
      const elapsed = completedAudioRef.current + Math.min(ct, dur || ct);
      if (totalEst > 0) {
        dispPct = Math.min(100, (elapsed / totalEst) * 100);
        dispCur = elapsed;
        dispTot = totalEst;
      }
      // Live ayah counter badge: "آية X من Y"
      const badge = fpElsRef.current.badge && fpElsRef.current.badge.isConnected
        ? fpElsRef.current.badge
        : (fpElsRef.current.badge = document.getElementById('fp-ayah-badge'));
      if (badge && sd?.ayahs?.length) {
        const txt = `آية ${idxNow + 1} من ${sd.ayahs.length}`;
        if (badge.textContent !== txt) badge.textContent = txt;
      }
    }

    const pct = dispPct;
    const timeStr = formatTime(dispCur);
    const totStr = dispTot ? formatTime(dispTot) : '';

    const getEl = (key, id) => {
      let el = fpElsRef.current[key];
      if (!el || !el.isConnected) {
        el = document.getElementById(id);
        fpElsRef.current[key] = el;
      }
      return el;
    };
    const ctEl1 = getEl('ct1', 'audio-current-time-1');
    if (ctEl1 && ctEl1.innerText !== timeStr) ctEl1.innerText = timeStr;
    const ctEl2 = getEl('ct2', 'audio-current-time-2');
    if (ctEl2 && ctEl2.innerText !== timeStr) ctEl2.innerText = timeStr;
    const totEl2 = getEl('tot2', 'audio-total-time-2');
    if (totEl2 && totEl2.innerText !== totStr && totStr) totEl2.innerText = totStr;
    const pEl1 = getEl('p1', 'audio-progress-1');
    if (pEl1) pEl1.style.width = `${pct}%`;
    const pEl2 = getEl('p2', 'audio-progress-2');
    if (pEl2) pEl2.style.width = `${pct}%`;
    const tEl2 = getEl('thumb2', 'audio-progress-thumb-2');
    if (tEl2) tEl2.style.left = `${pct}%`;

    const ts = ayahModeRef.current ? null : ayahTimestampsRef.current;
    if (ts && ts.length > 0) {
      const ctMs = ct * 1000;
      let found = -1;
      const start = lastTsIdxRef.current >= 0 ? Math.max(0, lastTsIdxRef.current - 2) : 0;
      for (let i = start; i < ts.length; i++) {
        if (ctMs >= ts[i].timestamp_from && ctMs < ts[i].timestamp_to) { found = i; break; }
      }
      if (found === -1 && start > 0) {
        for (let i = 0; i < start; i++) {
          if (ctMs >= ts[i].timestamp_from && ctMs < ts[i].timestamp_to) { found = i; break; }
        }
      }
      if (found === -1 && ctMs >= (ts[ts.length - 1]?.timestamp_to || 0)) found = ts.length - 1;
      if (found >= 0) {
        lastTsIdxRef.current = found;
        setCurrentAyahIdx(found);
        scrollAyahIntoView(found);
      }
    } else if (!ayahModeRef.current) {
      // Stream mode without real timestamps: highlight stays where the user
      // left it. We never fake sync with equal-division estimates.
    }
  }, [scrollAyahIntoView]);

  const handleAudioEnded = useCallback(() => {
    // Per-ayah mode: chain straight into the next ayah.
    if (ayahModeRef.current && playingSurahId) {
      const sd = surahDataRef.current;
      const finished = ayahStateRef.current.idx;
      const a = audioRef.current;
      const durs = ayahDurationsRef.current;
      // Bank this ayah's real duration into surah-level elapsed time
      if (a && isFinite(a.duration) && a.duration > 0) durs[finished] = a.duration;
      if (durs[finished]) completedAudioRef.current += durs[finished];
      const next = finished + 1;
      if (sd && sd.number === ayahStateRef.current.surahId && next < sd.ayahs.length) {
        playAyahFile(sd.number, next);
        return;
      }
    }
    setAudioPlaying(false);
    setPlayingSurahId(null);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setCurrentSurahInfo(null);
  }, [playingSurahId, playAyahFile]);

  const seekAudio = useCallback((e) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // Per-ayah mode: the bar shows SURAH-level progress, so map the click to
    // the ayah whose cumulative duration contains that fraction and jump there.
    if (ayahModeRef.current && playingSurahId) {
      const sd = surahDataRef.current;
      const durs = ayahDurationsRef.current;
      if (!sd?.ayahs?.length) return;
      let sumKnown = 0, knownCount = 0;
      for (const k in durs) { sumKnown += durs[k]; knownCount++; }
      const avg = knownCount ? sumKnown / knownCount : 0;
      let totalEst = 0;
      for (let i = 0; i < sd.ayahs.length; i++) totalEst += durs[i] || avg;
      const target = pct * totalEst;
      let acc = 0, hit = sd.ayahs.length - 1;
      for (let i = 0; i < sd.ayahs.length; i++) {
        const d = durs[i] || avg;
        if (target < acc + d || i === sd.ayahs.length - 1) { hit = i; break; }
        acc += d;
      }
      completedAudioRef.current = acc;
      playAyahFile(playingSurahId, hit);
      return;
    }
    if (!audioRef.current.duration) return;
    audioRef.current.currentTime = pct * audioRef.current.duration;
  }, [playingSurahId, playAyahFile]);

  const seekToAyah = useCallback((ayahIdx) => {
    const sd = surahDataRef.current;
    // Per-ayah mode: jump straight to that ayah's file.
    if (ayahModeRef.current && playingSurahId) {
      const durs = ayahDurationsRef.current;
      let sumKnown = 0, knownCount = 0;
      for (const k in durs) { sumKnown += durs[k]; knownCount++; }
      const avg = knownCount ? sumKnown / knownCount : 0;
      let acc = 0;
      for (let i = 0; i < ayahIdx; i++) acc += durs[i] || avg;
      completedAudioRef.current = acc;
      playAyahFile(playingSurahId, ayahIdx);
      return;
    }
    // Stream mode WITH real API timestamps.
    const ts = ayahTimestampsRef.current;
    if (ts && ts[ayahIdx]?.timestamp_from !== undefined && playingSurahId) {
      audioRef.current.currentTime = ts[ayahIdx].timestamp_from / 1000;
      if (!audioPlaying) audioRef.current.play().then(() => setAudioPlaying(true)).catch(() => {});
      setCurrentAyahIdx(ayahIdx);
      return;
    }
    // Cold start (nothing playing yet): begin recitation AT the clicked ayah.
    // No equal-division estimates are ever used.
    if (sd?.number) {
      setCurrentAyahIdx(ayahIdx);
      fetchSurahAndPlay(sd.number, false, ayahIdx);
    }
  }, [audioPlaying, playingSurahId, playAyahFile, fetchSurahAndPlay]);

  // Stream (full-surah) mode: surface the REAL file duration as soon as metadata
  // loads, so total time is never stuck at 0:00.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onMeta = () => {
      if (!ayahModeRef.current && a.duration && isFinite(a.duration)) setAudioDuration(a.duration);
    };
    a.addEventListener('loadedmetadata', onMeta);
    return () => a.removeEventListener('loadedmetadata', onMeta);
  }, []);

  // Audio element error state: surface a clear message and SKIP the broken ayah
  // (max 3 consecutive failures → stop, so a dead CDN doesn't loop forever).
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onErr = () => {
      if (!a.src || a.src === window.location.href) return;
      if (ayahModeRef.current) {
        consecutiveErrRef.current += 1;
        if (consecutiveErrRef.current >= 3) {
          consecutiveErrRef.current = 0;
          showToast('تعذر تحميل الآيات، تم إيقاف التلاوة', 'error');
          setAudioPlaying(false);
          return;
        }
        showToast('تعذر تحميل ملف الآية، سيتم تخطيها...', 'error');
        const sd = surahDataRef.current;
        const next = ayahStateRef.current.idx + 1;
        setTimeout(() => {
          if (!ayahModeRef.current || !playingSurahIdRef.current) return;
          if (sd && sd.number === ayahStateRef.current.surahId && next < sd.ayahs.length) {
            playAyahFile(sd.number, next);
          } else {
            setAudioPlaying(false);
            setPlayingSurahId(null);
          }
        }, 700);
      } else {
        showToast('تعذر تشغيل ملف الصوت', 'error');
      }
    };
    a.addEventListener('error', onErr);
    return () => a.removeEventListener('error', onErr);
  }, [playAyahFile]);

  // ===== TASBEEH =====

  const handleTasbeeh = useCallback(() => {
    setTasbeehCount(prev => {
      const next = prev + 1;
      if (next >= tasbeehTarget) {
        if (navigator.vibrate) navigator.vibrate([100, 100, 200]);
        showToast(`أتممت ${tasbeehTarget} تسبيحة`, 'success');
      }
      return next >= tasbeehTarget ? 0 : next;
    });
  }, [tasbeehTarget]);

  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' && effectivePage === 'tasbeeh') { e.preventDefault(); handleTasbeeh(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [effectivePage, handleTasbeeh]);

  // ===== SADAQAH =====

  const markSadaqahDone = useCallback(() => {
    if (!sadaqahIdea) return;
    setSadaqahDone(true);
    setSadaqahCoins(prev => prev + 1);
    const newStreak = sadaqahStreak + 1;
    setSadaqahStreak(newStreak);
    try { localStorage.setItem('sadaqahData', JSON.stringify({ streak: newStreak, coins: sadaqahCoins + 1, date: new Date().toDateString() })); } catch {}
    showToast('أحسنت! صدقة جارية في ميزان حسناتك', 'success');
  }, [sadaqahIdea, sadaqahStreak, sadaqahCoins]);

  const newSadaqah = useCallback(() => {
    const idx = Math.floor(Math.random() * ISLAMIC_DATA.sadaqahIdeas.length);
    setSadaqahIdea(ISLAMIC_DATA.sadaqahIdeas[idx]);
  }, []);

  // ===== ADHKAR AUDIO =====

  function playAdhkarAudio(type) {
    const url = type === 'morning'
      ? 'https://archive.org/download/TvQuran.com__Athkar/TvQuran.com_athkar_08.mp3'
      : 'https://archive.org/download/TvQuran.com__Athkar/TvQuran.com_athkar_07.mp3';
    try {
      const cur = adhkarAudioRef.current;
      if (adhkarPlaying === type && cur && !cur.paused) { cur.pause(); setAdhkarPaused(true); return; }
      if (adhkarPlaying === type && adhkarPaused && cur) { cur.play().then(() => setAdhkarPaused(false)).catch(() => showToast('تعذر تشغيل الصوت', 'error')); return; }
      if (adhkarAudioLoading === type) return;
      if (cur) { cur.pause(); cur.src = ''; }
      setAdhkarPaused(false);
      setAdhkarAudioLoading(type);
      const audio = new Audio(url);
      audio.preload = 'auto';
      const mine = () => adhkarAudioRef.current === audio;
      audio.addEventListener('playing', () => { if (!mine()) return; setAdhkarAudioLoading(null); setAdhkarPlaying(type); setAdhkarPaused(false); });
      audio.addEventListener('ended', () => { if (!mine()) return; setAdhkarPlaying(null); setAdhkarAudioLoading(null); setAdhkarPaused(false); });
      audio.addEventListener('error', () => { if (!mine()) return; setAdhkarAudioLoading(null); showToast('تعذر تحميل الصوت، تأكد من اتصالك بالإنترنت', 'error'); setAdhkarPlaying(null); });
      audio.play().catch(() => {});
      adhkarAudioRef.current = audio;
    } catch { showToast('حدث خطأ', 'error'); }
  }

  // ===== PDF =====

  function onPdfLoadSuccess({ numPages }) { setPdfNumPages(numPages); _setPdfLoading(false); }
  function goToPdfPage(n) { const p = Math.max(1, Math.min(n, pdfNumPages || 1)); setPdfPageIdx(p); setPdfJumpInput(''); }
  function toggleFocusMode() { setPdfFocusMode(f => !f); }

  // ===== FILTERED DATA =====

  const filteredNames = (apiNamesData.length > 0 ? apiNamesData : []).filter(n => (n.name || '').includes(namesSearch) || (n.en?.meaning || '').includes(namesSearch));
  const tasbeehProgress = tasbeehTarget > 0 ? Math.min((tasbeehCount / tasbeehTarget) * 100, 100) : 0;

  return (
    <>
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={handleAudioEnded} preload="auto" />

      {isOffline && (
        <div style={{ backgroundColor: 'var(--primary-color)', color: '#fff', textAlign: 'center', padding: '0.5rem', fontWeight: 'bold', zIndex: 9999, position: 'relative' }}>
          <i className="fas fa-triangle-exclamation"></i> أنت الآن تتصفح في وضع عدم الاتصال (Offline) - بعض الميزات قد لا تعمل
        </div>
      )}

      {effectivePage === 'home' && (
        <HomePage
          effectivePage={effectivePage} effectiveNavigate={effectiveNavigate}
          randomAyah={randomAyah} randomHadith={randomHadith}
          prayerTimes={prayerTimes} nextPrayerIdx={nextPrayerIdx} countdown={countdown}
          userCity={userCity} setUserCity={setUserCity}
          geoStatus={geoStatus} onRequestLocation={requestLocation}
          ramadanCountdown={_ramadanCountdown}
          sadaqahIdea={sadaqahIdea} sadaqahDone={sadaqahDone} sadaqahStreak={sadaqahStreak} sadaqahCoins={sadaqahCoins}
          markSadaqahDone={markSadaqahDone} newSadaqah={newSadaqah}
          userLoc={userLoc} showToast={showToast}
        />
      )}

      {effectivePage === 'quran' && (
        <QuranPage
          effectivePage={effectivePage} apiSurahs={apiSurahs}
          quranSearch={quranSearch} setQuranSearch={setQuranSearch}
          selectedReciter={selectedReciter} setSelectedReciter={setSelectedReciter} isMounted={isMounted}
          quranBookmarks={quranBookmarks} toggleBookmark={toggleBookmark} lastRead={lastRead}
          openSurah={openSurah} fetchSurahAndPlay={fetchSurahAndPlay}
          audioPlaying={audioPlaying} audioRef={audioRef}
          playingSurahId={playingSurahId} toggleSurahPlay={toggleSurahPlay}
        />
      )}

      {effectivePage === 'quran-reader' && (
        <QuranReaderPage
          effectivePage={effectivePage} effectiveNavigate={effectiveNavigate}
          surahData={surahData} loadingSurah={loadingSurah}
          surahLoadError={surahLoadError} retryLoadSurah={retryLoadSurah}
          audioPlaying={audioPlaying} currentAyahIdx={currentAyahIdx} activeAyahRef={activeAyahRef}
          tafsirMode={tafsirMode} selectedTafsir={selectedTafsir} setSelectedTafsir={setSelectedTafsir}
          quranFontSize={quranFontSize} setQuranFontSize={setQuranFontSize}
          quranNightMode={quranNightMode} setQuranNightMode={setQuranNightMode}
          fetchSurahAndPlay={fetchSurahAndPlay} toggleTafsir={toggleTafsir} loadTafsirForSurah={loadTafsirForSurah}
          togglePlayback={togglePlayback}
          seekToAyah={seekToAyah} setLastRead={setLastRead} saveLastRead={saveLastRead}
          setQuranModal={setQuranModal} setSurahData={setSurahData} setTafsirMode={setTafsirMode}
          setAudioPlaying={setAudioPlaying} audioRef={audioRef}
        />
      )}

      {effectivePage === 'adhkar' && (
        <AdhkarPage
          effectivePage={effectivePage} adhkarPlaying={adhkarPlaying} adhkarPaused={adhkarPaused}
          adhkarAudioLoading={adhkarAudioLoading}
          playAdhkarAudio={playAdhkarAudio} setTasbeehDhikr={setTasbeehDhikr}
          setTasbeehCount={setTasbeehCount} effectiveNavigate={effectiveNavigate}
        />
      )}

      {effectivePage === 'tasbeeh' && (
        <TasbeehPage
          effectivePage={effectivePage} tasbeehDhikr={tasbeehDhikr} setTasbeehDhikr={setTasbeehDhikr}
          tasbeehCount={tasbeehCount} setTasbeehCount={setTasbeehCount}
          tasbeehTarget={tasbeehTarget} setTasbeehTarget={setTasbeehTarget}
          handleTasbeeh={handleTasbeeh} tasbeehProgress={tasbeehProgress}
        />
      )}

      {effectivePage === 'names' && (
        <NamesPage effectivePage={effectivePage} namesSearch={namesSearch} setNamesSearch={setNamesSearch} filteredNames={filteredNames} />
      )}

      {effectivePage === 'articles' && <ArticlesPage effectivePage={effectivePage} />}

      {effectivePage === 'library' && (
        <LibraryPage effectivePage={effectivePage} librarySearch={librarySearch} setLibrarySearch={setLibrarySearch} libraryCategory={libraryCategory} setLibraryCategory={setLibraryCategory} onOpenBook={openPdfBook} />
      )}

      {effectivePage === 'videos' && <VideosPage effectivePage={effectivePage} />}

      
      {effectivePage === 'contact' && <ContactPage effectivePage={effectivePage} />}

      {showGeoBanner && (
        <div className="geo-banner" role="dialog" aria-label="إذن الموقع">
          <div className="geo-banner-card">
            <button className="geo-banner-close" onClick={dismissGeoBanner} aria-label="لاحقاً">
              <i className="fas fa-xmark"></i>
            </button>
            <div className="geo-banner-icon"><i className="fas fa-location-dot"></i></div>
            <h3>مواقيت الصلاة والقبلة بدقة</h3>
            <p>اسمح لهُدَى بمعرفة موقعك لعرض مواقيت الصلاة والقبلة بدقة، وتصلك تنبيهات أوقات الصلاة في وقتها.</p>
            <div className="geo-banner-actions">
              <button className="gb-primary" onClick={() => requestLocation()}>
                <i className="fas fa-location-crosshairs"></i> تحديد موقعي تلقائياً
              </button>
              <button className="gb-secondary" onClick={chooseManualCity}>
                <i className="fas fa-city"></i> اختيار المدينة يدوياً
              </button>
            </div>
            <button className="gb-later" onClick={dismissGeoBanner}>ليس الآن</button>
          </div>
        </div>
      )}

      <BookViewer
        bookModal={bookModal} setBookModal={setBookModal}
        pdfNumPages={pdfNumPages} setPdfNumPages={setPdfNumPages}
        pdfPageIdx={pdfPageIdx} setPdfPageIdx={setPdfPageIdx}
        pdfZoom={pdfZoom} setPdfZoom={setPdfZoom}
        pdfJumpInput={pdfJumpInput} setPdfJumpInput={setPdfJumpInput}
        pdfScrollMode={pdfScrollMode} setPdfScrollMode={setPdfScrollMode}
        pdfFocusMode={pdfFocusMode} setPdfFocusMode={setPdfFocusMode}
        pdfCustomWidth={pdfCustomWidth} setPdfCustomWidth={setPdfCustomWidth}
        onPdfLoadSuccess={onPdfLoadSuccess} goToPdfPage={goToPdfPage} toggleFocusMode={toggleFocusMode}
      />

      <QuranTvOverlay
        quranTvMode={quranTvMode} surahData={surahData} currentAyahIdx={currentAyahIdx}
        selectedReciter={selectedReciter} isMounted={isMounted} currentSurahInfo={currentSurahInfo}
        audioPlaying={audioPlaying} audioRef={audioRef}
        audioCurrentTime={audioCurrentTime} audioDuration={audioDuration}
        seekToAyah={seekToAyah} closeTvMode={closeTvMode} setAudioPlaying={setAudioPlaying}
      />

      <FloatingAudioPlayer
        audioPlaying={audioPlaying} currentSurahInfo={currentSurahInfo} surahData={surahData}
        selectedReciter={selectedReciter} isMounted={isMounted} audioRef={audioRef}
        audioCurrentTime={audioCurrentTime} audioDuration={audioDuration}
        seekAudio={seekAudio} fetchSurahAndPlay={fetchSurahAndPlay} setAudioPlaying={setAudioPlaying}
        playingSurahId={playingSurahId} currentAyahIdx={currentAyahIdx} seekToAyah={seekToAyah}
        ayahMode={ayahModeRef.current} onClose={stopRecitation}
      />
    </>
  );
}

