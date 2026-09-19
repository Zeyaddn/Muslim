import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [iosStepsOpen, setIosStepsOpen] = useState(false);

  useEffect(() => {
    let bipHandler;
    try {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        window.navigator.standalone === true;
      if (standalone || localStorage.getItem('huda_pwa_dismissed') || localStorage.getItem('huda_pwa_installed')) return;

      const ua = navigator.userAgent || '';
      const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(ios);

      bipHandler = (e) => { e.preventDefault(); setDeferred(e); };
      window.addEventListener('beforeinstallprompt', bipHandler);

      const onInstalled = () => {
        localStorage.setItem('huda_pwa_installed', '1');
        setVisible(false);
      };
      window.addEventListener('appinstalled', onInstalled);

      const t = setTimeout(() => setReady(true), 7000);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', bipHandler);
        window.removeEventListener('appinstalled', onInstalled);
      };
    } catch (e) { /* noop */ }
  }, []);

  useEffect(() => {
    if (ready && (deferred || isIOS)) setVisible(true);
  }, [ready, deferred, isIOS]);

  const install = async () => {
    if (!deferred) {
      if (isIOS) setIosStepsOpen(true);
      return;
    }
    try {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      localStorage.setItem(outcome === 'accepted' ? 'huda_pwa_installed' : 'huda_pwa_dismissed', '1');
    } catch (e) { /* noop */ }
    setVisible(false);
    setDeferred(null);
  };

  const dismiss = () => {
    try { localStorage.setItem('huda_pwa_dismissed', '1'); } catch (e) {}
    setVisible(false);
  };

  return (
    <>
      <div className={`install-banner${visible ? ' show' : ''}`} role="dialog" aria-label="تثبيت التطبيق">
        <div className="install-icon"><i className="fas fa-star-and-crescent"></i></div>
        <div className="install-text">
          <strong>ثبّت هُدَى على جهازك</strong>
          <span>وصول أسرع وتجربة تطبيق كاملة بدون شريط المتصفح</span>
        </div>
        <div className="install-actions">
          <button className="install-yes" onClick={install}>
            <i className={`fas ${isIOS && !deferred ? 'fa-circle-info' : 'fa-download'}`}></i>
            {isIOS && !deferred ? 'طريقة التثبيت' : 'تثبيت'}
          </button>
          <button className="install-no" onClick={dismiss} aria-label="إخفاء">لاحقاً</button>
        </div>
      </div>

      <div className={`ios-install-modal${iosStepsOpen ? ' open' : ''}`} onClick={() => setIosStepsOpen(false)}>
        <div className="ios-install-card" onClick={(e) => e.stopPropagation()}>
          <button className="ios-close" onClick={() => setIosStepsOpen(false)}><i className="fas fa-times"></i></button>
          <h3>إضافة هُدَى إلى الشاشة الرئيسية</h3>
          <ol className="ios-steps">
            <li>
              <span className="step-num">1</span>
              <span>اضغط على زر <i className="fas fa-arrow-up-from-bracket"></i> <b>المشاركة</b> في شريط سفاري أسفل الشاشة</span>
            </li>
            <li>
              <span className="step-num">2</span>
              <span>اختر <b>«إضافة إلى الشاشة الرئيسية»</b> <i className="fas fa-plus-square"></i></span>
            </li>
            <li>
              <span className="step-num">3</span>
              <span>اضغط <b>«إضافة»</b> — سيظهر تطبيق هُدَى على شاشتك كالتطبيقات الأخرى</span>
            </li>
          </ol>
        </div>
      </div>
    </>
  );
}
