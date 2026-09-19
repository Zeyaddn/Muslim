import { useState, useEffect, useRef } from 'react';
import { getPrefs, savePrefs, getGeoCache, syncPushState, sendTestPush } from '../utils/prayer-push';
import { ADHANS, DEFAULT_ADHAN } from '../lib/adhans';
import { PUSH_ENABLED } from '../utils/deploy';
import { getReminderPrefs, saveReminderPrefs, ensureNotificationPermission, testReminder } from '../utils/local-reminders';
import { showToast } from './Toast';

export default function SettingsModal({ open, onClose }) {
  const [prefs, setPrefs] = useState({ notify: true, adhan: true });
  const [rem, setRem] = useState({ enabled: false, morning: true, evening: true });
  const [testing, setTesting] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const p = getPrefs();
    setPrefs(p || { notify: true, adhan: true });
    setRem(getReminderPrefs());
  }, [open]);

  useEffect(() => () => {
    if (previewRef.current) { try { previewRef.current.pause(); } catch {} }
  }, []);

  const applyPrefs = async (next) => {
    setPrefs(next);
    savePrefs(next);
    const geo = getGeoCache();
    await syncPushState({
      prefs: next,
      loc: geo?.status === 'granted' && geo.lat ? { lat: geo.lat, lng: geo.lng } : null,
      city: geo?.city || '',
    });
    try { window.dispatchEvent(new CustomEvent('huda:prefs-changed', { detail: next })); } catch {}
  };

  const toggleNotify = async () => {
    const next = { ...prefs, notify: !prefs.notify };
    if (next.notify && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const res = await Notification.requestPermission();
      if (res !== 'granted') { showToast('لم يتم السماح بالإشعارات من المتصفح', 'error'); return; }
    }
    await applyPrefs(next);
    showToast(next.notify ? 'سيصلك تنبيه قبل كل صلاة وعند دخول وقتها' : 'تم إيقاف إشعارات الصلاة', next.notify ? 'success' : 'info');
  };

  const toggleAdhan = async () => {
    const next = { ...prefs, adhan: !prefs.adhan };
    await applyPrefs(next);
    showToast(next.adhan ? 'الأذان مفعّل مع إشعار الصلاة 🔊' : 'ستستمر الإشعارات بدون صوت الأذان', 'success');
  };

  const previewAdhan = () => {
    try {
      if (previewRef.current) { try { previewRef.current.pause(); } catch {} }
      const a = new Audio(ADHANS[DEFAULT_ADHAN].url);
      previewRef.current = a;
      a.play().catch(() => showToast('تعذر تشغيل المعاينة', 'error'));
    } catch {}
  };

  const testNotification = async () => {
    setTesting(true);
    const ok = await sendTestPush('athan');
    setTesting(false);
    showToast(ok ? 'أُرسل إشعار تجريبي — إن لم يظهر تأكد من سماح الإشعارات' : 'فعّل إشعارات الصلاة أولاً ثم أعد المحاولة', ok ? 'success' : 'error');
  };

  const toggleReminder = async () => {
    const next = { ...rem, enabled: !rem.enabled };
    setRem(next);
    saveReminderPrefs(next);
    try { window.dispatchEvent(new Event('huda:reminder-changed')); } catch {}
    if (next.enabled) {
      const perm = await ensureNotificationPermission();
      showToast(perm === 'granted'
        ? 'تم تفعيل تذكير أذكار الصباح والمساء'
        : 'تم التفعيل، لكن المتصفح منع الإشعارات — سيظهر التنبيه داخل التطبيق فقط',
        perm === 'granted' ? 'success' : 'info');
    } else {
      showToast('تم إيقاف تذكير الأذكار', 'info');
    }
  };

  const testLocalReminder = () => {
    if (!testReminder('morning')) showToast('المتصفح منع الإشعارات — سيظهر التنبيه داخل التطبيق فقط', 'info');
  };

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-card" onClick={e => e.stopPropagation()}>
        <div className="settings-head">
          <h2><i className="fas fa-gear"></i> الإعدادات</h2>
          <button className="settings-close" onClick={onClose} aria-label="إغلاق">
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        {PUSH_ENABLED && (
          <>
            <button type="button" className={`settings-row${prefs.notify ? ' on' : ''}`} onClick={toggleNotify}>
              <span className="sr-icon"><i className="fas fa-bell"></i></span>
              <span className="sr-text">
                <strong>إشعارات مواقيت الصلاة</strong>
                <small>تنبيه قبل الصلاة بـ10 دقائق وإشعار عند دخول الوقت</small>
              </span>
              <span className="switch"><span className="knob" /></span>
            </button>

            <button type="button" className={`settings-row${prefs.adhan ? ' on' : ''}`} onClick={toggleAdhan}>
              <span className="sr-icon"><i className="fas fa-volume-high"></i></span>
              <span className="sr-text">
                <strong>الأذان 🔊</strong>
                <small>يستمر إشعار دخول الوقت بدون صوت عند الإيقاف</small>
              </span>
              <span className="switch"><span className="knob" /></span>
            </button>
          </>
        )}

        <button type="button" className={`settings-row${rem.enabled ? ' on' : ''}`} onClick={toggleReminder}>
          <span className="sr-icon"><i className="fas fa-bell"></i></span>
          <span className="sr-text">
            <strong>تذكير أذكار الصباح والمساء</strong>
            <small>تنبيه عند وقت الفجر والعصر (يعمل والتطبيق مفتوح)</small>
          </span>
          <span className="switch"><span className="knob" /></span>
        </button>

        <div className="settings-row static">
          <span className="sr-icon"><i className="fas fa-microphone-lines"></i></span>
          <span className="sr-text">
            <strong>{ADHANS[DEFAULT_ADHAN].name}</strong>
            <small>المؤذن الافتراضي لجميع الصلوات</small>
          </span>
          <button type="button" className="adhan-preview-btn" onClick={previewAdhan} aria-label="معاينة الأذان">
            <i className="fas fa-play"></i> تشغيل
          </button>
        </div>

        <div className="settings-note">
          <i className="fas fa-circle-info"></i>
          {PUSH_ENABLED
            ? 'يعمل التنبيه حتى لو كان هُدَى مغلقاً تماماً. صوت الأذان الكامل يعتمد على جهازك: يظهر الإشعار دائماً، وبعض أنظمة أندرويد/الكمبيوتر تشغّل نغمة النظام بدلاً من الملف الكامل.'
            : 'تنبيهات الصلاة التلقائية (خلفية) غير متاحة في نسخة الاستضافة الحالية. تذكير الأذكار أعلاه يعمل محليًا طالما التطبيق مفتوح — ثبّت التطبيق على شاشتك ليصلك التنبيه عند الفجر والعصر.'}
        </div>

        {PUSH_ENABLED && (
          <button type="button" className="settings-test-btn" onClick={testNotification} disabled={testing}>
            <i className={`fas ${testing ? 'fa-spinner fa-spin' : 'fa-paper-plane'} `}></i>
            {testing ? 'جارٍ الإرسال…' : 'تجربة الإشعار الآن'}
          </button>
        )}

        {rem.enabled && (
          <button type="button" className="settings-test-btn" onClick={testLocalReminder}>
            <i className="fas fa-paper-plane"></i> تجربة تذكير الأذكار
          </button>
        )}
      </div>
    </div>
  );
}
