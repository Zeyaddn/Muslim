import { useState, useEffect, useRef, useCallback } from 'react';
import { getQiblaDirection, getDirectionName } from '../utils';
import { getGeoCache, saveGeoCache } from '../utils/prayer-push';

const KAABA = { lat: 21.4224779, lng: 39.8251832 };
const EARTH_R = 6371;

function kaabaDistanceKm(lat, lng) {
  const dLat = (KAABA.lat - lat) * Math.PI / 180;
  const dLng = (KAABA.lng - lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat * Math.PI / 180) * Math.cos(KAABA.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(a));
}

const CARDINALS = [
  { deg: 0, label: 'ش' },
  { deg: 90, label: 'ق' },
  { deg: 180, label: 'ج' },
  { deg: 270, label: 'غ' },
];

function shortestDiff(a, b) {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export default function QiblaPage({ effectivePage }) {
  const [phase, setPhase] = useState('idle'); // idle | locating | active | denied | error | unsupported
  const [coords, setCoords] = useState(null);
  const [bearing, setBearing] = useState(null);
  const [distance, setDistance] = useState(null);
  const [heading, setHeading] = useState(0);
  const [compassMode, setCompassMode] = useState(null); // 'abs' | 'webkit' | 'none'
  const [showCalibrate, setShowCalibrate] = useState(false);
  const headingRef = useRef(null);
  const watchIdRef = useRef(null);

  // Prefill from the shared location cache — no new permission prompt needed
  useEffect(() => {
    if (phase !== 'idle') return;
    const g = getGeoCache();
    if (g?.status === 'granted' && Number.isFinite(g.lat) && Number.isFinite(g.lng)) {
      setCoords({ lat: g.lat, lng: g.lng });
      setBearing(getQiblaDirection(g.lat, g.lng));
      setDistance(kaabaDistanceKm(g.lat, g.lng));
      setPhase('active');
      setCompassMode('checking');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aligned = phase === 'active' && compassMode !== 'none'
    ? Math.abs(shortestDiff(heading, bearing || 0)) <= 5
    : false;

  const attachCompass = useCallback(() => {
    let modeFound = null;
    const extract = (e) => {
      if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
        return { h: e.webkitCompassHeading, m: 'webkit' };
      }
      if (e.absolute === true && typeof e.alpha === 'number') {
        return { h: 360 - e.alpha, m: 'abs' };
      }
      return null;
    };
    const onOrient = (e) => {
      const r = extract(e);
      if (!r) return;
      if (!modeFound) { modeFound = r.m; setCompassMode(r.m); }
      const prev = headingRef.current;
      const h = prev == null ? r.h : prev + shortestDiff(prev % 360, r.h) * 0.3;
      headingRef.current = h;
      setHeading(((h % 360) + 360) % 360);
    };
    window.addEventListener('deviceorientationabsolute', onOrient, true);
    window.addEventListener('deviceorientation', onOrient, true);
    const t = setTimeout(() => { if (!modeFound) setCompassMode('none'); }, 1600);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrient, true);
      window.removeEventListener('deviceorientation', onOrient, true);
      clearTimeout(t);
    };
  }, []);

  const startLocate = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setPhase('unsupported');
      return;
    }
    setPhase('locating');

    let sensorGranted = true;
    const proceed = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          saveGeoCache({ lat, lng, status: 'granted', ts: Date.now() });
          setCoords({ lat, lng });
          setBearing(getQiblaDirection(lat, lng));
          setDistance(kaabaDistanceKm(lat, lng));
          headingRef.current = null;
          setPhase('active');
          if (sensorGranted) {
            setCompassMode('checking');
          } else {
            setCompassMode('none');
          }
        },
        (err) => {
          setPhase(err.code === 1 ? 'denied' : 'error');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    };

    // iOS 13+ requires explicit permission for motion sensors, inside a user gesture
    try {
      if (
        typeof window.DeviceOrientationEvent !== 'undefined' &&
        typeof window.DeviceOrientationEvent.requestPermission === 'function'
      ) {
        window.DeviceOrientationEvent.requestPermission()
          .then((res) => { sensorGranted = res === 'granted'; proceed(); })
          .catch(() => { sensorGranted = false; proceed(); });
      } else {
        proceed();
      }
    } catch (e) {
      sensorGranted = false;
      proceed();
    }
  }, []);

  useEffect(() => {
    if (phase !== 'active') return;
    if (compassMode !== 'checking') return;
    const cleanup = attachCompass();
    return cleanup;
  }, [phase, compassMode, attachCompass]);

  useEffect(() => () => {
    if (watchIdRef.current !== null && watchIdRef.current !== undefined) navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);

  // Re-request compass permission (iOS) / restart sensor detection — user initiated
  const enableCompass = useCallback(() => {
    const begin = () => { headingRef.current = null; setCompassMode('checking'); };
    try {
      if (
        typeof window.DeviceOrientationEvent !== 'undefined' &&
        typeof window.DeviceOrientationEvent.requestPermission === 'function'
      ) {
        window.DeviceOrientationEvent.requestPermission()
          .then((r) => { if (r === 'granted') begin(); else setCompassMode('none'); })
          .catch(() => setCompassMode('none'));
      } else {
        begin();
      }
    } catch {
      setCompassMode('none');
    }
  }, []);

  const recalibrate = useCallback(() => {
    headingRef.current = null;
    setShowCalibrate(false);
  }, []);

  const ticks = [];
  for (let i = 0; i < 72; i++) {
    ticks.push(<span key={i} className={`qibla-tick${i % 6 === 0 ? ' major' : ''}`} style={{ transform: `rotate(${i * 5}deg)` }} />);
  }

  const dialRotation = compassMode === 'none' ? 0 : -heading;
  const markerAngle = bearing !== null && bearing !== undefined ? bearing + dialRotation : null;

  return (
    <section className={`page-section ${effectivePage === 'qibla' ? 'active' : ''}`}>
      <div className="page-header">
        <h1><i className="fas fa-kaaba"></i> القبلة</h1>
        <p>حدد اتجاه القبلة إلى الكعبة المشرفة من مكانك</p>
      </div>

      <div className="page-content">
        <div className="qibla-wrap">

          {(phase === 'idle' || phase === 'unsupported') && (
            <div className="qibla-state-card">
              <div className="qibla-state-icon"><i className="fas fa-location-crosshairs"></i></div>
              <h2>تحديد اتجاه القبلة</h2>
              <p>
                سنحتاج إلى معرفة موقعك الحالي لحساب اتجاه الكعبة بدقة،
                وستُستخدم صلاحية الموقع داخل هذه الصفحة فقط.
              </p>
              {phase === 'unsupported' && (
                <div className="qibla-note warn"><i className="fas fa-triangle-exclamation"></i> متصفحك لا يدعم تحديد الموقع</div>
              )}
              <button className="qibla-start-btn" onClick={startLocate}>
                <i className="fas fa-compass"></i> حدد موقعي واعرض القبلة
              </button>
            </div>
          )}

          {phase === 'locating' && (
            <div className="qibla-state-card">
              <div className="qibla-spinner"></div>
              <h2>جارٍ تحديد موقعك…</h2>
              <p>تأكد من تشغيل خدمة GPS على جهازك للحصول على أدق نتيجة</p>
            </div>
          )}

          {phase === 'denied' && (
            <div className="qibla-state-card">
              <div className="qibla-state-icon denied"><i className="fas fa-location-slash"></i></div>
              <h2>تم رفض إذن الموقع</h2>
              <p>
                للسماح بالموقع: افتح إعدادات المتصفح ← الأذونات ← الموقع واختر «سماح» لهذا الموقع، ثم أعد المحاولة.
                في آيفون: الإعدادات ← الخصوصية ← خدمات الموقع ← المتصفح ← «أثناء استخدام التطبيق».
              </p>
              <button className="qibla-start-btn" onClick={startLocate}>
                <i className="fas fa-rotate-right"></i> إعادة المحاولة
              </button>
            </div>
          )}

          {phase === 'error' && (
            <div className="qibla-state-card">
              <div className="qibla-state-icon denied"><i className="fas fa-satellite-dish"></i></div>
              <h2>تعذر تحديد موقعك</h2>
              <p>تأكد من تفعيل خدمة الموقع GPS وإشارة الشبكة ثم أعد المحاولة</p>
              <button className="qibla-start-btn" onClick={startLocate}>
                <i className="fas fa-rotate-right"></i> إعادة المحاولة
              </button>
            </div>
          )}

          {phase === 'active' && bearing !== null && bearing !== undefined && (
            <>
              <div className={`qibla-compass${aligned ? ' aligned' : ''}`}>
                <div className="qibla-dial" style={{ transform: `rotate(${dialRotation}deg)` }}>
                  <div className="qibla-ring">{ticks}</div>
                  {CARDINALS.map(c => (
                    <span key={c.label} className={`qibla-cardinal${c.deg === 0 ? ' north' : ''}`}
                      style={{ transform: `rotate(${c.deg}deg) translateY(-118px) rotate(${-c.deg}deg)` }}>
                      {c.label}
                    </span>
                  ))}
                </div>

                <div className="qibla-marker" style={{ transform: `rotate(${markerAngle}deg)` }}>
                  <span className="qibla-marker-line" />
                  <span className="qibla-marker-kaaba">🕋</span>
                </div>

                <div className="qibla-center-dot" />
                <div className={`qibla-top-arrow${aligned ? ' hit' : ''}`}>
                  <i className="fas fa-caret-up"></i>
                </div>

                {aligned && <div className="qibla-aligned-badge">أنت الآن باتجاه القبلة</div>}
              </div>

              <div className="qibla-readouts">
                <div className="qibla-chip">
                  <span className="qc-label">اتجاه القبلة من الشمال</span>
                  <span className="qc-value">{Math.round(bearing)}°</span>
                </div>
                <div className="qibla-chip">
                  <span className="qc-label">اتجاهك الحالي</span>
                  <span className="qc-value">{compassMode === 'none' ? '—' : `${Math.round(heading)}°`}</span>
                </div>
                <div className="qibla-chip">
                  <span className="qc-label">المسافة إلى الكعبة</span>
                  <span className="qc-value">{distance >= 1000 ? `${(distance / 1000).toFixed(1)} ألف كم` : `${Math.round(distance)} كم`}</span>
                </div>
              </div>

              <div className="qibla-direction-line">
                <i className="fas fa-compass"></i>
                <span>اتجاه القبلة: <strong>{Math.round(bearing)}°</strong></span>
                <span className="qdl-sep">•</span>
                <span>القبلة تقع باتجاه {getDirectionName(bearing)}</span>
              </div>

              {compassMode === 'none' ? (
                <>
                  <div className="qibla-note info">
                    <i className="fas fa-circle-info"></i>
                    بوصلة جهازك غير مفعّلة هنا. الدائرة أعلاه ثابتة جهة الشمال للأعلى:
                    وجّه نفسك شمالاً أولاً ثم اتبع علامة 🕋 بالزاوية الموضحة.
                  </div>
                  <button className="qibla-compass-btn" onClick={enableCompass}>
                    <i className="fas fa-compass"></i> تفعيل البوصلة
                  </button>
                </>
              ) : (
                <div className="qibla-note ok">
                  <i className="fas fa-mobile-screen-button"></i>
                  امسك الهاتف مستوياً بعيداً عن المعادن وحرّكه بحركة دائرية واسعة عند الحاجة لمعايرة البوصلة.
                </div>
              )}

              <button className="qibla-calibrate-toggle" onClick={() => setShowCalibrate(s => !s)}>
                <i className="fas fa-arrows-spin"></i> إعادة معايرة البوصلة
              </button>
              {showCalibrate && (
                <div className="qibla-calibrate-panel">
                  <ol>
                    <li>ابتعد عن المعادن والإلكترونيات والحقول المغناطيسية.</li>
                    <li>امسك الهاتف أمامك وحرّكه بحركة «8» العربية واسعة 2–3 مرات.</li>
                    <li>أدر الهاتف بكل الاتجاهات ثم ثبّته مستوياً.</li>
                  </ol>
                  <button className="qibla-calibrate-reset" onClick={recalibrate}>
                    <i className="fas fa-rotate-right"></i> إعادة ضبط المؤشر الآن
                  </button>
                </div>
              )}

              <button className="qibla-restart" onClick={startLocate}>
                <i className="fas fa-arrows-rotate"></i> تحديث الموقع
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
