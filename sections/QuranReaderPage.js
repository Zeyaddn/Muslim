import { useState, useEffect } from 'react';
import { FONT_SIZES } from '../constants';
import { toArabicNum } from '../utils';

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

  const [renderLimit, setRenderLimit] = useState(30);

  useEffect(() => {
    if (surahData?.ayahs) {
      setRenderLimit(30); // reset on new surah
      
      const chunk = () => {
        setRenderLimit(prev => {
          if (prev >= surahData.ayahs.length) return prev;
          setTimeout(chunk, 100);
          return prev + 30;
        });
      };
      
      if (surahData.ayahs.length > 30) {
        setTimeout(chunk, 200);
      }
    }
  }, [surahData]);
    return (
    <section className={`page-section ${effectivePage === 'quran-reader' ? 'active' : ''}`}>
      <div className="qr-fullpage">

        <div className="qr-header">
          <button className="back-to-quran-btn" onClick={() => { setQuranModal(null); setSurahData(null); setTafsirMode(null); setAudioPlaying(false); if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; } try { localStorage.removeItem('lastReadSurahId'); } catch {} effectiveNavigate('quran'); }}>
            <i className="fas fa-arrow-right"></i> العودة للسور
          </button>
          <h2>{surahData ? `${surahData.name} (${surahData.englishName})` : ''}</h2>
          <div className="qr-header-actions">
            <button className={`night-mode-toggle ${quranNightMode ? 'active' : ''}`} onClick={() => setQuranNightMode(!quranNightMode)}>
              <i className={`fas ${quranNightMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
          </div>
        </div>

        <div className="qr-toolbar">
          <button className="qr-toolbar-play" onClick={() => { if (surahData) togglePlayback(); }}>
            <i className={`fas ${audioPlaying ? 'fa-pause' : 'fa-play'}`}></i> {audioPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          </button>

          <div className="tafsir-selector">
            <button className={`tafsir-toggle-btn ${tafsirMode ? 'active' : ''}`} onClick={toggleTafsir}>
              <i className="fas fa-book"></i> {tafsirMode ? 'إخفاء التفسير' : 'التفسير الميسر'}
            </button>
          </div>

          <div className="quran-font-controls">
            <span className="font-size-label"><i className="fas fa-font"></i></span>
            {FONT_SIZES.map(fs => (
              <button key={fs} className={`font-size-btn ${quranFontSize === fs ? 'active' : ''}`} onClick={() => setQuranFontSize && setQuranFontSize(fs)}>
                {fs}x
              </button>
            ))}
          </div>
        </div>

        <div className="qr-body">
          {loadingSurah ? (
            <div className="skeleton-loader" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
              <div style={{ height: '40px', width: '30%', backgroundColor: 'var(--border-color)', margin: '0 auto', borderRadius: '10px', animation: 'pulse 1.5s infinite ease-in-out' }}></div>
              <div style={{ height: '20px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '5px', animation: 'pulse 1.5s infinite ease-in-out', animationDelay: '0.1s' }}></div>
              <div style={{ height: '20px', width: '90%', backgroundColor: 'var(--border-color)', borderRadius: '5px', animation: 'pulse 1.5s infinite ease-in-out', animationDelay: '0.2s' }}></div>
              <div style={{ height: '20px', width: '95%', backgroundColor: 'var(--border-color)', borderRadius: '5px', animation: 'pulse 1.5s infinite ease-in-out', animationDelay: '0.3s' }}></div>
              <div style={{ height: '20px', width: '80%', backgroundColor: 'var(--border-color)', borderRadius: '5px', animation: 'pulse 1.5s infinite ease-in-out', animationDelay: '0.4s' }}></div>
            </div>
          ) : surahData ? (
            <div className="qr-content">
              <div className="bismillah">﷽</div>
              {surahData.ayahs.slice(0, renderLimit).map((ayah, i) => {
                const isActive = i === currentAyahIdx && audioPlaying;
                return (
                <span key={ayah.number || i} id={`ayah-${ayah.numberInSurah}`} className={`ayah-wrapper ${tafsirMode ? 'tafsir-on' : ''}`}>
                  <span
                    className={`quran-ayah${isActive ? ' ayah-active' : ''}`}
                    style={quranFontSize !== 1.4 ? { fontSize: `${quranFontSize}rem` } : undefined}
                    onClick={() => { setLastRead({ surahId: surahData.number, ayahNumber: ayah.numberInSurah }); saveLastRead(surahData.number, ayah.numberInSurah); seekToAyah(i); }}
                    ref={i === currentAyahIdx ? activeAyahRef : null}
                    data-ayah-idx={i}
                  >
                    <span className="ayah-text">{ayah.text}</span>
                    <span className="ayah-number">{toArabicNum(ayah.numberInSurah)}</span>
                  </span>
                  {tafsirMode && ayah.tafsir && (
                    <div className="tafsir-section">
                      <h4><i className="fas fa-book"></i> التفسير الميسر</h4>
                      <p>{ayah.tafsir}</p>
                    </div>
                  )}
                </span>
                );
              })}
            </div>
          ) : surahLoadError ? (
            <div className="qr-error-state">
              <i className="fas fa-cloud-arrow-down"></i>
              <p>تعذر تحميل نص السورة</p>
              <small>تأكد من اتصالك بالإنترنت ثم أعد المحاولة</small>
              <button className="qr-retry-btn" onClick={retryLoadSurah}>
                <i className="fas fa-rotate-right"></i> إعادة المحاولة
              </button>
            </div>
          ) : null}
        </div>
        {audioPlaying && surahData && (
          <div className="qr-scroll-nav">
            <button className="qr-scroll-btn" onClick={() => {
              const nextIdx = Math.min(currentAyahIdx + 1, surahData.ayahs.length - 1);
              const el = document.getElementById(`ayah-${surahData.ayahs[nextIdx].numberInSurah}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}>
              <i className="fas fa-arrow-down"></i>
            </button>
            <button className="qr-scroll-btn" onClick={() => {
              const prevIdx = Math.max(currentAyahIdx - 1, 0);
              const el = document.getElementById(`ayah-${surahData.ayahs[prevIdx].numberInSurah}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}>
              <i className="fas fa-arrow-up"></i>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
