import { useState, useEffect, useRef, useCallback } from 'react';
import { toArabicNum } from '../utils';

function buildPages(ayahs, fontRem = 1.4) {
  if (!ayahs || !ayahs.length) return [];
  const pages = [];
  let buf = [];
  let charCount = 0;
  const LIMIT = Math.round(480 / fontRem);
  ayahs.forEach(function(ayah, i) {
    buf.push(Object.assign({}, ayah, { idx: i }));
    charCount += (ayah.text || '').length;
    if (charCount >= LIMIT || i === ayahs.length - 1) {
      pages.push(buf);
      buf = [];
      charCount = 0;
    }
  });
  return pages;
}

export default function QuranReaderPage({
  effectivePage, effectiveNavigate, surahData, loadingSurah,
  surahLoadError, retryLoadSurah,
  audioPlaying, currentAyahIdx, activeAyahRef,
  tafsirMode, toggleTafsir,
  quranFontSize, quranNightMode, setQuranNightMode,
  fetchSurahAndPlay, loadTafsirForSurah, togglePlayback,
  seekToAyah, setLastRead, saveLastRead,
  setQuranModal, setSurahData, setTafsirMode, setAudioPlaying,
  audioRef, setQuranFontSize,
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showToolbar, setShowToolbar] = useState(true);
  const pages = surahData ? buildPages(surahData.ayahs, quranFontSize) : [];
  const totalPages = pages.length;
  const toolbarTimer = useRef(null);
  const touchStartX = useRef(null);

  useEffect(function() { if (surahData) setCurrentPage(0); }, [surahData && surahData.number]);

  useEffect(function() {
    if (!surahData || currentAyahIdx < 0 || !pages.length) return;
    const pgIdx = pages.findIndex(function(pg) { return pg.some(function(a) { return a.idx === currentAyahIdx; }); });
    if (pgIdx >= 0 && pgIdx !== currentPage) setCurrentPage(pgIdx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAyahIdx]);

  const goToPage = useCallback(function(next) {
    if (next === currentPage) return;
    setCurrentPage(next);
  }, [currentPage]);

  const nextPage = useCallback(function() { if (currentPage < totalPages - 1) goToPage(currentPage + 1); }, [currentPage, totalPages, goToPage]);
  const prevPage = useCallback(function() { if (currentPage > 0) goToPage(currentPage - 1); }, [currentPage, goToPage]);

  const resetToolbarTimer = useCallback(function() {
    setShowToolbar(true);
    clearTimeout(toolbarTimer.current);
    toolbarTimer.current = setTimeout(function() { setShowToolbar(false); }, 5000);
  }, []);

  useEffect(function() { resetToolbarTimer(); return function() { clearTimeout(toolbarTimer.current); }; }, [resetToolbarTimer]);

  useEffect(function() {
    const h = function(e) {
      if (e.key === 'ArrowRight' || e.key === 'PageUp') prevPage();
      else if (e.key === 'ArrowLeft' || e.key === 'PageDown') nextPage();
    };
    window.addEventListener('keydown', h);
    return function() { window.removeEventListener('keydown', h); };
  }, [nextPage, prevPage]);

  function handleTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(diff) < 25) return;
    if (diff > 0) prevPage(); else nextPage();
  }

  const currentPageAyahs = pages[currentPage] || [];
  const fs = quranFontSize || 1.4;

  return (
    <section
      className={`page-section ${effectivePage === 'quran-reader' ? 'active' : ''} ${quranNightMode ? 'mushaf-night' : ''}`}
      onMouseMove={resetToolbarTimer}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`qr-header mushaf-header ${showToolbar ? 'toolbar-visible' : 'toolbar-hidden'}`}>
        <button className="back-to-quran-btn" onClick={function() {
          setQuranModal(null); setSurahData(null); setTafsirMode(null);
          try { localStorage.removeItem('lastReadSurahId'); } catch(e) {}
          effectiveNavigate('quran');
        }}>
          <i className="fas fa-arrow-right"></i> السور
        </button>
        <div className="mushaf-surah-title">
          {surahData && (
            <>
              <span className="mushaf-surah-ar">{surahData.name}</span>
              <span className="mushaf-page-badge">{toArabicNum(currentPage + 1)} / {toArabicNum(totalPages)}</span>
            </>
          )}
        </div>
        <div className="qr-header-actions">
          <button className={`night-mode-toggle ${quranNightMode ? 'active' : ''}`} onClick={function() { setQuranNightMode(!quranNightMode); }}>
            <i className={`fas ${quranNightMode ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
        </div>
      </div>

      <div className={`qr-toolbar mushaf-toolbar ${showToolbar ? 'toolbar-visible' : 'toolbar-hidden'}`}>
        <button className="qr-toolbar-play" onClick={function() { if (surahData) togglePlayback(); }}>
          <i className={`fas ${audioPlaying ? 'fa-pause' : 'fa-play'}`}></i>
          {audioPlaying ? 'إيقاف' : 'تشغيل'}
        </button>
        <button className={`tafsir-toggle-btn ${tafsirMode ? 'active' : ''}`} onClick={toggleTafsir}>
          <i className="fas fa-book"></i> {tafsirMode ? 'إخفاء التفسير' : 'التفسير'}
        </button>
        <div className="quran-font-controls mushaf-font-controls">
          <button className="font-size-btn" onClick={function() { if (setQuranFontSize) setQuranFontSize(function(s) { return Math.max(1.2, parseFloat((s - 0.2).toFixed(1))); }); }}>أ−</button>
          <span className="font-size-label">{fs.toFixed(1)}x</span>
          <button className="font-size-btn" onClick={function() { if (setQuranFontSize) setQuranFontSize(function(s) { return Math.min(2.4, parseFloat((s + 0.2).toFixed(1))); }); }}>أ+</button>
        </div>
      </div>

      <div className="mushaf-body">
        {loadingSurah && (
          <div className="mushaf-page mushaf-loading">
            <div className="mushaf-skeleton">
              {[0,1,2,3,4,5,6,7,8].map(function(i) {
                return <div key={i} className="mushaf-skeleton-line" style={{ width: (68 + Math.sin(i * 1.3) * 28) + '%', animationDelay: (i * 0.07) + 's' }}></div>;
              })}
            </div>
          </div>
        )}

        {!loadingSurah && surahLoadError && (
          <div className="mushaf-page mushaf-error">
            <i className="fas fa-cloud-arrow-down"></i>
            <p>تعذر تحميل نص السورة</p>
            <small>تأكد من اتصالك بالإنترنت</small>
            <button className="qr-retry-btn" onClick={retryLoadSurah}>
              <i className="fas fa-rotate-right"></i> إعادة المحاولة
            </button>
          </div>
        )}

        {!loadingSurah && surahData && (
          <div className="mushaf-page-wrap">
            <div className="mushaf-page mushaf-page-main">
              <div className="mushaf-touch-zone right-zone" onClick={prevPage} aria-label="السابق"></div>
              <div className="mushaf-touch-zone left-zone" onClick={nextPage} aria-label="التالي"></div>

              <div className="mushaf-ornament top">
                <span className="orn-line"></span>
                <span className="orn-icon"><i className="fas fa-star-and-crescent"></i></span>
                <span className="orn-text">{surahData.name}</span>
                <span className="orn-icon"><i className="fas fa-star-and-crescent"></i></span>
                <span className="orn-line"></span>
              </div>

              {currentPage === 0 && surahData.number !== 9 && surahData.number !== 1 && (
                <div className="mushaf-bismillah">
                  <span className="bismillah-text">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
                </div>
              )}

              <div className="mushaf-text" style={{ fontSize: fs + 'rem' }}>
                {currentPageAyahs.map(function(ayah) {
                  const isActive = ayah.idx === currentAyahIdx;
                  return (
                    <span
                      key={ayah.number || ayah.idx}
                      id={`ayah-${ayah.numberInSurah}`}
                      className={`mushaf-ayah ${isActive ? 'mushaf-ayah-active' : ''}`}
                      onClick={function() {
                        setLastRead({ surahId: surahData.number, ayahNumber: ayah.numberInSurah });
                        saveLastRead(surahData.number, ayah.numberInSurah);
                        seekToAyah(ayah.idx);
                      }}
                      ref={isActive ? activeAyahRef : null}
                      data-ayah-idx={ayah.idx}
                    >
                      {ayah.text}
                      <span className="mushaf-ayah-num">{toArabicNum(ayah.numberInSurah)}</span>
                    </span>
                  );
                })}
              </div>

              {tafsirMode && currentPageAyahs.some(function(a) { return a.tafsir; }) && (
                <div className="mushaf-tafsir-section">
                  <div className="mushaf-tafsir-divider">
                    <span></span><i className="fas fa-book"></i><span></span>
                  </div>
                  {currentPageAyahs.filter(function(a) { return a.tafsir; }).map(function(ayah) {
                    return (
                      <div key={ayah.idx} className="mushaf-tafsir-item">
                        <span className="mushaf-tafsir-num">آية ({toArabicNum(ayah.numberInSurah)})</span>
                        <p>{ayah.tafsir}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mushaf-ornament bottom">
                <span className="orn-line"></span>
                <span className="orn-page">{toArabicNum(currentPage + 1)}</span>
                <span className="orn-line"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {!loadingSurah && surahData && (
        <div className="mushaf-nav">
          <button className="mushaf-nav-btn prev-btn" onClick={prevPage} disabled={currentPage === 0} aria-label="السابق">
            <i className="fas fa-chevron-right"></i>
            <span>السابق</span>
          </button>
          <div className="mushaf-nav-dots">
            {totalPages <= 12
              ? pages.map(function(_, i) {
                  return <button key={i} className={`mnav-dot ${i === currentPage ? 'active' : ''}`} onClick={function() { goToPage(i); }} />;
                })
              : <span className="mushaf-nav-counter">{toArabicNum(currentPage + 1)} / {toArabicNum(totalPages)}</span>
            }
          </div>
          <button className="mushaf-nav-btn next-btn" onClick={nextPage} disabled={currentPage >= totalPages - 1} aria-label="التالي">
            <span>التالي</span>
            <i className="fas fa-chevron-left"></i>
          </button>
        </div>
      )}
    </section>
  );
}
