// تذكيرات محلية لأذكار الصباح والمساء — بلا أي سيرفر أو خدمة خارجية.
// تعمل طالما التطبيق مفتوح (تبويب أو PWA مثبّت)، مع تعويض التذكير الفائت
// عند العودة للتطبيق. الوقت يعتمد على الفجر والعصر من مواقيت الصلاة إن توفّرت.
import { showToast } from '../components/Toast';

const PREFS_KEY = 'huda_adhkar_reminder';
const SCHEDULE_KEY = 'huda_prayer_schedule';
const LAST_KEY = 'huda_reminder_last';
const CHECK_MS = 30000;
const CATCHUP_MS = 6 * 3600000; // نافذة تعويض التذكير الفائت

let intervalId = null;
let started = false;

function ymd(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function getReminderPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    if (p && typeof p.enabled === 'boolean') {
      return { enabled: p.enabled, morning: p.morning !== false, evening: p.evening !== false };
    }
  } catch {}
  return { enabled: false, morning: true, evening: true };
}

export function saveReminderPrefs(p) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
  restartInterval();
  return p;
}

export async function ensureNotificationPermission() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}

// تُستدعى من الصفحة الرئيسية عند توفّر مواقيت الصلاة (Fajr / Asr كـ Date).
export function setPrayerSchedule({ fajr, asr }) {
  if (!fajr || !asr) return;
  try {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify({
      date: ymd(fajr),
      fajr: new Date(fajr).toISOString(),
      asr: new Date(asr).toISOString(),
    }));
  } catch {}
}

function reminderTimes() {
  try {
    const s = JSON.parse(localStorage.getItem(SCHEDULE_KEY) || 'null');
    if (s && s.date === ymd(new Date()) && s.fajr && s.asr) {
      return { fajr: new Date(s.fajr), asr: new Date(s.asr) };
    }
  } catch {}
  // احتياطي عند غياب مواقيت الصلاة: صباح 6:00 ومساء 17:00
  const now = new Date();
  const f = new Date(now); f.setHours(6, 0, 0, 0);
  const a = new Date(now); a.setHours(17, 0, 0, 0);
  return { fajr: f, asr: a };
}

function getLast() {
  try { return JSON.parse(localStorage.getItem(LAST_KEY) || '{}') || {}; } catch { return {}; }
}
function setLast(kind, dateStr) {
  const l = getLast(); l[kind] = dateStr;
  try { localStorage.setItem(LAST_KEY, JSON.stringify(l)); } catch {}
}

function fire(kind) {
  const isMorning = kind === 'morning';
  const title = isMorning ? 'أذكار الصباح 🤲' : 'أذكار المساء 🤲';
  const body = isMorning
    ? 'حان وقت أذكار الصباح — ابدأ يومك بذكر الله.'
    : 'حان وقت أذكار المساء — اختم يومك بذكر الله.';

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(reg => reg.showNotification(title, {
          body,
          tag: 'huda-adhkar-' + kind,
          renotify: true,
          lang: 'ar',
          dir: 'rtl',
          icon: '/favicon.png',
          badge: '/favicon.png',
          vibrate: [120, 60, 120],
          data: { url: '/#adhkar', kind },
          actions: [{ action: 'open', title: 'افتح التطبيق' }],
        }))
        .catch(() => { try { new Notification(title, { body, icon: '/favicon.png' }); } catch {} });
    } else {
      try { new Notification(title, { body, icon: '/favicon.png' }); } catch {}
    }
    return true;
  }

  // المتصفح رفض الإشعارات: نكتفي بتنبيه داخل التطبيق.
  showToast(`${title} — ${body}`, 'info');
  return false;
}

function tick() {
  const prefs = getReminderPrefs();
  if (!prefs.enabled) return;
  const now = new Date();
  const today = ymd(now);
  const last = getLast();
  const times = reminderTimes();

  if (prefs.morning && last.morning !== today &&
      now >= times.fajr && (now - times.fajr) < CATCHUP_MS) {
    setLast('morning', today);
    fire('morning');
  }
  if (prefs.evening && last.evening !== today &&
      now >= times.asr && (now - times.asr) < CATCHUP_MS) {
    setLast('evening', today);
    fire('evening');
  }
}

function restartInterval() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  if (typeof window === 'undefined') return;
  if (!getReminderPrefs().enabled) return;
  intervalId = setInterval(tick, CHECK_MS);
}

export function initLocalReminders() {
  if (typeof window === 'undefined' || started) return;
  started = true;
  restartInterval();
  tick();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  window.addEventListener('focus', () => tick());
  window.addEventListener('huda:reminder-changed', () => { restartInterval(); tick(); });
}

export function testReminder(kind = 'morning') {
  return fire(kind);
}
