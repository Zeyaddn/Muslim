import { useRef } from 'react';
import ISLAMIC_DATA from '../data/islamic-data';

export default function QuranPage({
  effectivePage, apiSurahs, quranSearch, setQuranSearch,
  selectedReciter, setSelectedReciter, isMounted,
  quranBookmarks, toggleBookmark, lastRead,
  openSurah, fetchSurahAndPlay, audioPlaying, audioRef,
  playingSurahId, toggleSurahPlay,
}) {
  const surahList = (apiSurahs.length > 0 ? apiSurahs : []).filter(s =>
    s.name.includes(quranSearch) || s.nameEn.toLowerCase().includes(quranSearch.toLowerCase())
  );

  return (
    <section className={`page-section ${effectivePage === 'quran' ? 'active' : ''}`}>
      <div id="quran-surah-list">
        <div className="page-header">
          <h1><i className="fas fa-book-open"></i> القرآن الكريم</h1>
          <p>اقرأ واستمع لآيات الله مع التفسير</p>
        </div>
        <div className="page-content">
          {lastRead && (
            <div className="last-read-banner" onClick={() => openSurah(lastRead.surahId)}>
              <div className="last-read-info">
                <div className="last-read-icon"><i className="fas fa-book-open"></i></div>
                <div>
                  <div className="last-read-text">متابعة القراءة</div>
                  <div className="last-read-sub">
                    {apiSurahs.find(s => s.id === lastRead.surahId)?.name || ''}
                    {lastRead.ayahNumber ? ` - الآية ${lastRead.ayahNumber}` : ''}
                  </div>
                </div>
              </div>
              <div className="last-read-btn"><i className="fas fa-play"></i> تابع</div>
            </div>
          )}
          <div className="reciter-select">
            <label><i className="fas fa-microphone"></i> القارئ:</label>
            {isMounted && (
              <select value={selectedReciter.id} onChange={e => setSelectedReciter(ISLAMIC_DATA.reciters.find(r => r.id === e.target.value) || ISLAMIC_DATA.reciters[0])}>
                {ISLAMIC_DATA.reciters.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="search-bar">
            <i className="fas fa-search search-icon"></i>
            <input type="text" placeholder="ابحث عن سورة..." value={quranSearch} onChange={e => setQuranSearch(e.target.value)} />
          </div>
          {quranSearch && <div className="search-results-count">نتائج البحث: {surahList.length}</div>}
          <div className="quran-surahs">
            {surahList.map(s => (
              <div key={s.id} className="surah-card" style={{ position: 'relative' }}>
                <button className={`bookmark-btn ${quranBookmarks.includes(s.id) ? 'bookmarked' : ''}`}
                  onClick={() => toggleBookmark(s.id)} aria-label="حفظ">
                  <i className={`fas fa-bookmark`}></i>
                </button>
                <div className="surah-number">{s.id}</div>
                <div className="surah-info">
                  <div className="surah-name">{s.name}</div>
                  <div className="surah-name-en">{s.nameEn}</div>
                  <div className="surah-meta">
                    <span className="badge badge-primary">{s.type}</span>
                    {' '}<span className="badge badge-gold">{s.verses} آية</span>
                  </div>
                </div>
                <div className="surah-actions">
                  <button onClick={() => openSurah(s.id)}><i className="fas fa-book-open"></i></button>
                  <button onClick={() => toggleSurahPlay(s.id)} aria-label={playingSurahId === s.id && audioPlaying ? 'إيقاف مؤقت' : 'تشغيل'}>
                    <i className={`fas ${playingSurahId === s.id && audioPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
