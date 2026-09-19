import Link from 'next/link';
import ISLAMIC_DATA from '../data/islamic-data';
import { EGYPT_CITIES, EGYPT_CITY_COORDS } from '../constants';
import { formatPrayerTime } from '../utils';

export default function HomePage({
  effectivePage, effectiveNavigate, randomAyah, randomHadith,
  prayerTimes, nextPrayerIdx, countdown, userCity, setUserCity,
  geoStatus, onRequestLocation,
  ramadanCountdown, sadaqahIdea, sadaqahDone, sadaqahStreak, sadaqahCoins,
  markSadaqahDone, newSadaqah, userLoc, showToast,
}) {
  return (
    <section className={`page-section ${effectivePage === 'home' ? 'active' : ''}`}>
      <div className="hero">
        <div className="hero-content">
          <div className="hero-bismillah"><i className="fas fa-star-and-crescent"></i> بسم الله الرحمن الرحيم</div>
          <div className="hero-ayah">{randomAyah.text}</div>
          <div className="hero-hadith" style={{ fontFamily: 'var(--font-quran)', fontSize: '1.1rem', lineHeight: 2, marginBottom: 16, opacity: 0.85 }}>
            {randomHadith.text}
          </div>
          <div className="hero-quick-actions">
            <a href="#" className="hero-btn hero-btn-primary" onClick={e => { e.preventDefault(); effectiveNavigate('quran'); }}>
              <i className="fas fa-book-open"></i> اقرأ القرآن
            </a>
            <a href="#" className="hero-btn hero-btn-secondary" onClick={e => { e.preventDefault(); effectiveNavigate('tasbeeh'); }}>
              <i className="fas fa-pray"></i> سبح
            </a>
            <a href="#" className="hero-btn hero-btn-secondary" onClick={e => { e.preventDefault(); effectiveNavigate('adhkar'); }}>
              <i className="fas fa-praying-hands"></i> الأذكار والدعاء
            </a>
          </div>
        </div>
      </div>

      <div className="prayer-widget">
        <div className="prayer-card">
          <div className="prayer-city-select">
            <i className="fas fa-location-dot"></i>
            <select value={userCity} onChange={e => { const v = e.target.value; setUserCity(v); if (v) showToast('تم اختيار محافظة ' + v + ' بنجاح', 'success'); }} className="city-select">
              <option value="">اختر المدينة</option>
              {EGYPT_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {geoStatus !== 'granted' && onRequestLocation && (
              <button type="button" className="prayer-loc-btn" onClick={() => onRequestLocation({ quiet: false })}
                title="تفعيل تحديد الموقع التلقائي">
                <i className="fas fa-location-crosshairs"></i> تفعيل الموقع
              </button>
            )}
          </div>
          <div className="prayer-card-body">
            <div className="prayer-current">
              <div className="next-prayer-label">الصلاة القادمة</div>
              <div className="next-prayer-name">{prayerTimes[nextPrayerIdx]?.name || 'الفجر'}</div>
              <div className="next-prayer-time">{prayerTimes[nextPrayerIdx] ? formatPrayerTime(prayerTimes[nextPrayerIdx].date) : '--:--'}</div>
              <div className="prayer-countdown"><i className="fas fa-clock"></i> <span id="prayer-countdown-text">{countdown || '--:--:--'}</span></div>
            </div>
            <div className="prayer-times-grid">
              {prayerTimes.map((pt, i) => (
                <div key={i} className={`prayer-time-item ${i === nextPrayerIdx ? 'active' : ''}`}>
                  <div className="prayer-name">{pt.name}</div>
                  <div className="prayer-time">{pt.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {ramadanCountdown && (
        <div className="ramadan-banner">
          <i className="fas fa-moon"></i> {ramadanCountdown}
        </div>
      )}

      <div className="section quran-messages-section">
        <div className="section-header">
          <h2 className="section-title"><i className="fas fa-book-open"></i> رسائل قرآنية</h2>
        </div>
        <div className="quran-messages-carousel">
          {ISLAMIC_DATA.quranMessages.slice(0, 4).map((msg, i) => (
            <div key={i} className="quran-message-card" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="quran-message-text">{msg.text}</div>
              <div className="quran-message-reference">
                <span className="quran-message-surah">سورة {msg.surah}</span>
                <span className="quran-message-sep">•</span>
                <span className="quran-message-ayah">الآية {msg.ayah}</span>
                <span className="quran-message-sep">•</span>
                <span className="quran-message-theme">{msg.theme}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title"><i className="fas fa-hand-holding-heart"></i> صدقة اليوم</h2>
        </div>
        {sadaqahIdea && (
          <div className="sadaqah-widget">
            <div className="sadaqah-header">
              <h3>جاري الصدقات</h3>
            </div>
            <div className="sadaqah-jar">
              <div className="sadaqah-jar-icon"><i className="fas fa-jar"></i></div>
              <div>
                <div className="sadaqah-coin-count">{sadaqahCoins} <i className="fas fa-coins" style={{ color: 'var(--gold)', fontSize: '1.2rem' }}></i></div>
                <div className="sadaqah-streak">
                  <i className="fas fa-fire"></i> {sadaqahStreak} يوم متتالي
                </div>
              </div>
            </div>
            <div className="sadaqah-idea-card">
              <div className="sadaqah-idea-text">{sadaqahIdea.text}</div>
              <div className="sadaqah-idea-meta">
                <span><i className="fas fa-tag"></i> {sadaqahIdea.category}</span>
              </div>
            </div>
            <div className="sadaqah-actions">
              <button className="sadaqah-btn sadaqah-btn-primary" disabled={sadaqahDone} onClick={markSadaqahDone}>
                <i className={`fas ${sadaqahDone ? 'fa-check-circle' : 'fa-hand-holding-heart'}`}></i>
                {sadaqahDone ? 'تم الإنجاز اليوم' : 'أنجزتها'}
              </button>
              <button className="sadaqah-btn sadaqah-btn-secondary" onClick={newSadaqah}>
                <i className="fas fa-shuffle"></i> اقتراح آخر
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="section" style={{ textAlign: 'center' }}>
        <Link className="qibla-home-link" href="/qibla">
          <span className="qhl-icon"><i className="fas fa-kaaba"></i></span>
          <span className="qhl-text">
            <strong>تحديد اتجاه القبلة</strong>
            <small>بوصلة تفاعلية تعمل من موقعك الحالي</small>
          </span>
          <i className="fas fa-chevron-left qhl-arrow"></i>
        </Link>
      </div>
    </section>
  );
}

