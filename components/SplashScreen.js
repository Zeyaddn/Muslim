import { useState, useEffect } from 'react';

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Show splash for 1.8 seconds on initial boot
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 1800);

    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 2300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`app-splash-screen ${fading ? 'fade-out' : ''}`}>
      <div className="splash-pattern-bg"></div>
      
      <div className="splash-content">
        {/* Animated Emblem */}
        <div className="splash-logo-wrap">
          <div className="splash-glow"></div>
          <div className="splash-logo">
            <span className="splash-logo-icon">🕋</span>
          </div>
          <div className="splash-ring"></div>
        </div>

        {/* Brand Text */}
        <h1 className="splash-title">هُدَى</h1>
        <p className="splash-subtitle">منصة إسلامية شاملة</p>
        
        {/* Sleek Golden Progress Bar */}
        <div className="splash-loader-bar">
          <div className="splash-loader-progress"></div>
        </div>
      </div>

      {/* Developer Credit & Dedication Footer */}
      <div className="splash-footer">
        <span className="splash-credit-tag">صدقة جارية</span>
        <p className="splash-developer">
          <span>تطوير:</span> <strong>Zeyad</strong>
        </p>
      </div>
    </div>
  );
}
