import { useState, useEffect } from 'react';

export default function ConnectionBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justCameOnline, setJustCameOnline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOffline = () => {
      setIsOffline(true);
      setJustCameOnline(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setJustCameOnline(true);
      setTimeout(() => setJustCameOnline(false), 3000);
    };

    // Initial check
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline && !justCameOnline) return null;

  return (
    <div className={`connection-banner ${isOffline ? 'offline' : 'online'}`}>
      <div className="connection-banner-content">
        <i className={`fas ${isOffline ? 'fa-wifi-slash' : 'fa-wifi'}`}></i>
        <span>
          {isOffline ? 'أنت غير متصل بالإنترنت' : 'تم استعادة الاتصال بالإنترنت'}
        </span>
      </div>
      
    </div>
  );
}
