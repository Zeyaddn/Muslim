import { useState, useEffect, useCallback } from 'react';

const isIOSDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const isAndroidDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
};

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.navigator.standalone === true
  );
};

const STEPS = {
  ios: [
    { icon: 'fa-arrow-up-from-bracket', html: <>اضغط زر <i className="fas fa-arrow-up-from-bracket"></i> <b>المشاركة</b> في شريط سفاري <b>بالأسفل</b> (ليس في جنب شريط العنوان)</> },
    { icon: 'fa-square-plus', html: <>انزل في القائمة واختر <b>«إضافة إلى الشاشة الرئيسية»</b></> },
    { icon: 'fa-check', html: <>اضغط <b>«إضافة»</b> في الأعلى — هيظهر أيقونة هُدَى على شاشتك</> },
  ],
  android: [
    { icon: 'fa-ellipsis-vertical', html: <>اضغط النقاط الثلاث <i className="fas fa-ellipsis-vertical"></i> في <b>أعلى يمين</b> متصفح كروم</> },
    { icon: 'fa-download', html: <>اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b></> },
    { icon: 'fa-check', html: <>اضغط <b>«تثبيت»</b> — هيظهر أيقونة هُدَى على شاشتك</> },
  ],
  android_samsung: [
    { icon: 'fa-ellipsis-vertical', html: <>اضغط النقاط الثلاث <i className="fas fa-ellipsis-vertical"></i> في <b>أسفل</b> متصفح Samsung Internet</> },
    { icon: 'fa-plus-square', html: <>اختر <b>«إضافة إلى الشاشة الرئيسية»</b></> },
    { icon: 'fa-check', html: <>اضغط <b>«إضافة»</b> — هيظهر أيقونة هُدَى على شاشتك</> },
  ],
  desktop: [
    { icon: 'fa-download', html: <>اضغط أيقونة <b>التثبيت</b> في شريط العنوان (أو من قائمة المتصفح)</> },
  ],
};

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState('desktop');
  const [installed, setInstalled] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);

  // Decide the platform + whether we are already running as an installed app.
  useEffect(() => {
    setPlatform(
      isIOSDevice() ? 'ios' : isAndroidDevice() ? (/SamsungBrowser/i.test(navigator.userAgent) ? 'android_samsung' : 'android') : 'desktop'
    );
    setInstalled(isStandalone());
  }, []);

  // Capture the native Android/Chrome install event. Must run before anything
  // else so Chrome does not consider the event "used up".
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      try { localStorage.removeItem('huda_pwa_dismissed'); } catch (err) {}
      setVisible(true);
    };
    const onInstalled = () => {
      try { localStorage.setItem('huda_pwa_installed', '1'); } catch (err) {}
      setInstalled(true);
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // iOS has no programmatic install API — surface the guide by itself.
  // Android/Desktop wait for the real event so we never show a fake button.
  useEffect(() => {
    if (installed) return;
    if (platform === 'ios') {
      try { if (localStorage.getItem('huda_pwa_dismissed')) return; } catch (e) {}
      const t = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(t);
    }
  }, [installed, platform]);

  // Manual trigger: the Navbar menu and ?install=1 can re-open this any time.
  const open = useCallback(() => {
    if (isStandalone()) return;
    setVisible(true);
  }, []);

  useEffect(() => {
    window.addEventListener('huda:open-install', open);
    if (typeof window !== 'undefined' && /[?&]install=1/.test(window.location.search)) open();
    return () => window.removeEventListener('huda:open-install', open);
  }, [open]);

  const install = async () => {
    if (deferred) {
      try {
        deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === 'accepted') return;
      } catch (e) {}
      // User said no, or the native sheet failed — fall back to the guide.
    }
    setStepsOpen(true);
  };

  const dismiss = () => {
    try { localStorage.setItem('huda_pwa_dismissed', '1'); } catch (e) {}
    setVisible(false);
  };

  const steps = STEPS[platform] || STEPS.desktop;
  const showStepsInstead = !deferred;

  return (
    <>
      <div className={`install-banner${visible ? ' show' : ''}`} role="dialog" aria-label="تثبيت التطبيق">
        <div className="install-icon"><i className="fas fa-star-and-crescent"></i></div>
        <div className="install-text">
          <strong>ثبّت هُدَى على جهازك</strong>
          <span>
            {deferred
              ? 'وصول أسرع وتجربة تطبيق كاملة بدون شريط المتصفح'
              : platform === 'ios'
                ? 'اضغط للتعرف على طريقة الإضافة على الآيفون'
                : 'اضغط لعرض خطوات التثبيت على جهازك'}
          </span>
        </div>
        <div className="install-actions">
          <button className="install-yes" onClick={install}>
            <i className={`fas ${showStepsInstead ? 'fa-circle-info' : 'fa-download'}`}></i>
            {showStepsInstead ? 'طريقة التثبيت' : 'تثبيت'}
          </button>
          <button className="install-no" onClick={dismiss} aria-label="إخفاء">لاحقاً</button>
        </div>
      </div>

      <div className={`ios-install-modal${stepsOpen ? ' open' : ''}`} onClick={() => setStepsOpen(false)}>
        <div className="ios-install-card" onClick={(e) => e.stopPropagation()}>
          <button className="ios-close" onClick={() => setStepsOpen(false)} aria-label="إغلاق"><i className="fas fa-times"></i></button>
          <h3>إضافة هُدَى إلى الشاشة الرئيسية</h3>
          <ol className="ios-steps">
            {steps.map((s, i) => (
              <li key={i}>
                <span className="step-num">{i + 1}</span>
                <span>{s.html}</span>
              </li>
            ))}
          </ol>
          {deferred && (
            <button className="ios-steps-direct" onClick={install}>
              <i className="fas fa-download"></i> جرّب التثبيت المباشر
            </button>
          )}
        </div>
      </div>
    </>
  );
}