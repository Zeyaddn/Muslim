import { useState, useEffect, useRef, useCallback } from 'react';
import { getQiblaDirection, getDirectionName } from '../utils';
import { getGeoCache, saveGeoCache } from '../utils/prayer-push';
import { EGYPT_CITY_COORDS } from '../constants';

const KAABA = { lat: 21.422487, lng: 39.826206 };
const EARTH_R = 6371;

function kaabaDistanceKm(lat, lng) {
  const dLat = ((KAABA.lat - lat) * Math.PI) / 180;
  const dLng = ((KAABA.lng - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat * Math.PI) / 180) * Math.cos((KAABA.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(a));
}

const CARDINALS = [
  { deg: 0, label: 'ش' },
  { deg: 90, label: 'ق' },
  { deg: 180, label: 'ج' },
  { deg: 270, label: 'غ' },
];

function shortestDiff(from, to) {
  let diff = (to - from) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

// 3D Tilt-compensated heading calculation for Android / standard sensors
function computeTiltCompensatedHeading(alpha, beta, gamma) {
  const degToRad = Math.PI / 180;
  const _x = (beta || 0) * degToRad;
  const _y = (gamma || 0) * degToRad;
  const _z = (alpha || 0) * degToRad;

  const cY = Math.cos(_y);
  const cZ = Math.cos(_z);
  const sX = Math.sin(_x);
  const sY = Math.sin(_y);
  const sZ = Math.sin(_z);

  const Vx = -cZ * sY - sZ * sX * cY;
  const Vy = -sZ * sY + cZ * sX * cY;

  let heading = Math.atan2(Vx, Vy) * (180 / Math.PI);
  if (heading < 0) heading += 360;
  return heading;
}

export default function QiblaPage({ effectivePage }) {
  const [phase, setPhase] = useState('idle'); // idle | locating | active | denied | error | unsupported
  const [coords, setCoords] = useState(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [bearing, setBearing] = useState(null);
  const [distance, setDistance] = useState(null);
  const [heading, setHeading] = useState(0);
  const [compassMode, setCompassMode] = useState('checking'); // 'webkit' | 'abs' | 'tilt' | 'none'
  const [showCalibrate, setShowCalibrate] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  const targetHeadingRef = useRef(0);
  const currentHeadingRef = useRef(0);
  const animFrameRef = useRef(null);
  const watchPosIdRef = useRef(null);
  const wasAlignedRef = useRef(false);

  // Smooth 60fps interpolation loop
  useEffect(() => {
    const loop = () => {
      const cur = currentHeadingRef.current;
      const target = targetHeadingRef.current;
      const delta = shortestDiff(cur, target);

      // Low-pass smooth filter (speed 0.22)
      if (Math.abs(delta) > 0.05) {
        const next = cur + delta * 0.22;
        currentHeadingRef.current = ((next % 360) + 360) % 360;
        setHeading(currentHeadingRef.current);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Update location data
  const applyCoordinates = useCallback((lat, lng, accuracy = null) => {
    setCoords({ lat, lng });
    if (accuracy) setGpsAccuracy(accuracy);
    const b = getQiblaDirection(lat, lng);
    setBearing(b);
    setDistance(kaabaDistanceKm(lat, lng));
    setPhase('active');
  }, []);

  // Prefill from cache on mount
  useEffect(() => {
    const g = getGeoCache();
    if (g?.status === 'granted' && Number.isFinite(g.lat) && Number.isFinite(g.lng)) {
      applyCoordinates(g.lat, g.lng);
    } else {
      // Default to Cairo coordinates until user grants location or picks city
      const def = EGYPT_CITY_COORDS['القاهرة'];
      if (def) {
        applyCoordinates(def.lat, def.lng);
        setSelectedCity('القاهرة');
      }
    }
  }, [applyCoordinates]);

  // Compass Sensor Listener
  const attachCompass = useCallback(() => {
    let modeDetected = null;

    const handleOrientation = (e) => {
      let rawHeading = null;
      let mode = null;

      // 1. iOS Safari webkitCompassHeading (High accuracy)
      if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
        rawHeading = e.webkitCompassHeading;
        mode = 'webkit';
      }
      // 2. Android absolute orientation
      else if (e.absolute === true && typeof e.alpha === 'number') {
        rawHeading = 360 - e.alpha;
        mode = 'abs';
      }
      // 3. Sensor fallback with 3D tilt compensation
      else if (typeof e.alpha === 'number' && typeof e.beta === 'number' && typeof e.gamma === 'number') {
        rawHeading = computeTiltCompensatedHeading(e.alpha, e.beta, e.gamma);
        mode = 'tilt';
      }

      if (rawHeading !== null) {
        if (!modeDetected) {
          modeDetected = mode;
          setCompassMode(mode);
        }

        // Adjust for device screen orientation (landscape / rotated)
        const screenAngle =
          (typeof window !== 'undefined' && window.screen?.orientation?.angle) ||
          (typeof window !== 'undefined' && window.orientation) || 0;

        const adjustedHeading = ((rawHeading + screenAngle) % 360 + 360) % 360;
        targetHeadingRef.current = adjustedHeading;
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    const timeoutId = setTimeout(() => {
      if (!modeDetected) {
        setCompassMode('none');
      }
    }, 2000);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
      clearTimeout(timeoutId);
    };
  }, []);

  // Request motion permission (iOS 13+) and attach compass
  const enableCompass = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      typeof window.DeviceOrientationEvent !== 'undefined' &&
      typeof window.DeviceOrientationEvent.requestPermission === 'function'
    ) {
      window.DeviceOrientationEvent.requestPermission()
        .then((res) => {
          if (res === 'granted') {
            setCompassMode('checking');
            attachCompass();
          } else {
            setCompassMode('none');
          }
        })
        .catch(() => setCompassMode('none'));
    } else {
      setCompassMode('checking');
      attachCompass();
    }
  }, [attachCompass]);

  useEffect(() => {
    if (effectivePage === 'qibla') {
      const cleanup = attachCompass();
      return cleanup;
    }
  }, [effectivePage, attachCompass]);

  // Live Continuous Geolocation Watcher
  const startLocate = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setPhase('unsupported');
      return;
    }
    setPhase('locating');

    if (watchPosIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchPosIdRef.current);
    }

    watchPosIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        saveGeoCache({ lat: latitude, lng: longitude, status: 'granted', ts: Date.now() });
        applyCoordinates(latitude, longitude, accuracy);
        setSelectedCity('');
      },
      (err) => {
        if (phase === 'locating') {
          setPhase(err.code === 1 ? 'denied' : 'error');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );

    enableCompass();
  }, [applyCoordinates, enableCompass, phase]);

  useEffect(() => {
    return () => {
      if (watchPosIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchPosIdRef.current);
      }
    };
  }, []);

  // Manual city change (PC / fallback)
  const handleCitySelect = (cityName) => {
    setSelectedCity(cityName);
    const c = EGYPT_CITY_COORDS[cityName];
    if (c) {
      applyCoordinates(c.lat, c.lng);
    }
  };

  const diffAngle = bearing !== null ? shortestDiff(heading, bearing) : 0;
  const isAligned = compassMode !== 'none' && Math.abs(diffAngle) <= 4;

  // Haptic feedback when aligned
  useEffect(() => {
    if (isAligned && !wasAlignedRef.current) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([45, 30, 45]); } catch (e) {}
      }
    }
    wasAlignedRef.current = isAligned;
  }, [isAligned]);

  const dialRotation = compassMode === 'none' ? 0 : -heading;
  const markerAngle = bearing !== null ? bearing + dialRotation : 0;

  const ticks = [];
  for (let i = 0; i < 72; i++) {
    ticks.push(
      <span
        key={i}
        className={`qibla-tick${i % 6 === 0 ? ' major' : ''}`}
        style={{ transform: `rotate(${i * 5}deg)` }}
      />
    );
  }

  return (
    <section className={`page-section ${effectivePage === 'qibla' ? 'active' : ''}`}>
      <div className="page-header">
        <h1><i className="fas fa-kaaba"></i> بوصلة القبلة المباشرة</h1>
        <p>تحديد دقيق وحي لاتجاه الكعبة المشرفة مع حساس البوصلة التفاعلي</p>
      </div>

      <div className="page-content">
        <div className="qibla-wrap">
          {phase === 'locating' && (
            <div className="qibla-state-card">
              <div className="qibla-spinner"></div>
              <h2>جارٍ تحديد موقعك بدقة…</h2>
              <p>يرجى التأكد من تشغيل الـ GPS والسماح بالموقع</p>
            </div>
          )}

          {phase === 'denied' && (
            <div className="qibla-state-card">
              <div className="qibla-state-icon denied"><i className="fas fa-location-slash"></i></div>
              <h2>لم يتم منح إذن الموقع</h2>
              <p>يمكنك اختيار مدينتك يدوياً من الأسفل أو إعادة المحاولة لتحديد موقعك التلقائي.</p>
              <button className="qibla-start-btn" onClick={startLocate}>
                <i className="fas fa-rotate-right"></i> إعادة طلب الإذن
              </button>
            </div>
          )}

          {bearing !== null && (
            <>
              {/* Dynamic Guidance Banner */}
              <div className={`qibla-guidance-banner ${isAligned ? 'aligned' : ''}`}>
                {compassMode === 'none' ? (
                  <span>
                    <i className="fas fa-compass"></i> وجه أعلى هاتفك بزاوية <strong>{Math.round(bearing)}°</strong> باتجاه {getDirectionName(bearing)}
                  </span>
                ) : isAligned ? (
                  <span>
                    <i className="fas fa-check-circle"></i> ✨ أنت الآن في اتجاه القبلة تماماً — تقبل الله صلاتك 🕋
                  </span>
                ) : diffAngle > 0 ? (
                  <span>
                    <i className="fas fa-arrow-turn-left"></i> أدر هاتفك <strong>{Math.round(diffAngle)}°</strong> يساراً
                  </span>
                ) : (
                  <span>
                    <i className="fas fa-arrow-turn-right"></i> أدر هاتفك <strong>{Math.round(Math.abs(diffAngle))}°</strong> يميناً
                  </span>
                )}
              </div>

              {/* Live Compass UI */}
              <div className={`qibla-compass ${isAligned ? 'aligned' : ''}`}>
                {/* Rotating Dial Ring */}
                <div className="qibla-dial" style={{ transform: `rotate(${dialRotation}deg)` }}>
                  <div className="qibla-ring">{ticks}</div>
                  {CARDINALS.map((c) => (
                    <span
                      key={c.label}
                      className={`qibla-cardinal${c.deg === 0 ? ' north' : ''}`}
                      style={{
                        transform: `rotate(${c.deg}deg) translateY(-118px) rotate(${-c.deg}deg)`,
                      }}
                    >
                      {c.label}
                    </span>
                  ))}
                </div>

                {/* Kaaba Direction Marker */}
                <div className="qibla-marker" style={{ transform: `rotate(${markerAngle}deg)` }}>
                  <span className="qibla-marker-line" />
                  <span className="qibla-marker-kaaba">🕋</span>
                </div>

                {/* Center dot & Device Heading Needle */}
                <div className="qibla-center-dot" />
                <div className={`qibla-top-arrow ${isAligned ? 'hit' : ''}`}>
                  <i className="fas fa-caret-up"></i>
                </div>

                {isAligned && <div className="qibla-aligned-badge">أنت باتجاه القبلة 🕋</div>}
              </div>

              {/* Real-time stats */}
              <div className="qibla-readouts">
                <div className="qibla-chip">
                  <span className="qc-label">اتجاه القبلة</span>
                  <span className="qc-value">{Math.round(bearing)}°</span>
                </div>
                <div className="qibla-chip">
                  <span className="qc-label">توجيه الهاتف</span>
                  <span className="qc-value">{compassMode === 'none' ? 'ثابت' : `${Math.round(heading)}°`}</span>
                </div>
                <div className="qibla-chip">
                  <span className="qc-label">المسافة للكعبة</span>
                  <span className="qc-value">
                    {distance >= 1000
                      ? `${(distance / 1000).toFixed(1)} ألف كم`
                      : `${Math.round(distance)} كم`}
                  </span>
                </div>
              </div>

              {/* Status Note & Sensor Calibration */}
              {compassMode === 'none' ? (
                <div className="qibla-note info">
                  <i className="fas fa-circle-info"></i>
                  <div>
                    حساس البوصلة غير مفعل أو غير متوفر على هذا الجهاز. يمكنك توجيه الهاتف باتجاه <strong>{Math.round(bearing)}°</strong> نسبة للشمال الحقيقي.
                    <br />
                    <button className="qibla-compass-btn" style={{ marginTop: '8px' }} onClick={enableCompass}>
                      <i className="fas fa-compass"></i> تفعيل حساس البوصلة
                    </button>
                  </div>
                </div>
              ) : (
                <div className="qibla-note ok">
                  <i className="fas fa-mobile-screen-button"></i>
                  البوصلة التفاعلية نشطة ومباشرة. احرص على مسك الهاتف أفقياً بعيداً عن الأجسام المغناطيسية.
                </div>
              )}

              {/* Manual City Selector for flexibility */}
              <div className="qibla-city-select-box">
                <label htmlFor="qibla-city-dropdown">
                  <i className="fas fa-map-pin"></i> اختر مدينتك لحساب الاتجاه:
                </label>
                <select
                  id="qibla-city-dropdown"
                  value={selectedCity}
                  onChange={(e) => handleCitySelect(e.target.value)}
                  className="qibla-city-dropdown"
                >
                  <option value="">-- موقعي الحالي (GPS دقيق) --</option>
                  {Object.keys(EGYPT_CITY_COORDS).map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="qibla-action-buttons">
                <button className="qibla-restart" onClick={startLocate}>
                  <i className="fas fa-location-crosshairs"></i> تحديث GPS الحي
                </button>
                <button className="qibla-restart" onClick={() => setShowCalibrate((s) => !s)}>
                  <i className="fas fa-arrows-spin"></i> معايرة البوصلة
                </button>
              </div>

              {showCalibrate && (
                <div className="qibla-calibrate-panel">
                  <h4>طريقة معايرة بوصلة الهاتف:</h4>
                  <ol>
                    <li>حرّك هاتفك في الهواء على شكل رقم <strong>8</strong> باللغة الإنجليزية مرتين أو ثلاثاً.</li>
                    <li>ابتعد عن المعادن، أغطية الهواتف المغناطيسية، والأجهزة الكهربائية.</li>
                    <li>امسك الهاتف مستوياً بشكل أفقي للحصول على أقصى دقة.</li>
                  </ol>
                  <button className="qibla-calibrate-reset" onClick={() => setShowCalibrate(false)}>
                    تمت المعايرة
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
