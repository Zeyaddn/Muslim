import { toArabicNum, formatTime } from '../utils';
import { TV_IMAGES } from '../constants';

export default function QuranTvOverlay({
  quranTvMode, surahData, currentAyahIdx,
  selectedReciter, isMounted, currentSurahInfo,
  audioPlaying, audioRef, audioCurrentTime, audioDuration,
  seekToAyah, closeTvMode, setAudioPlaying,
}) {
  if (!quranTvMode) return null;

  return (
    <div className="quran-tv-overlay" style={{ display: 'block' }}>
      <div className="quran-tv-bg-video">
        <div
          className="quran-tv-bg-image"
          style={{ backgroundImage: `url(${TV_IMAGES[2]})` }}
        />
      </div>

      <div className="quran-tv-glass-container">
        <div className="tv-glass-card">
          <div className="tv-glass-header">
            <button className="tv-glass-btn" onClick={closeTvMode} title="إغلاق">
              <i className="fas fa-times"></i>
            </button>
            <div className="tv-glass-btn-group">
              <button className="tv-glass-btn">
                <i className="fas fa-book-open"></i> سورة {currentSurahInfo?.name || ''} ({surahData?.ayahs?.length || 0} آية)
              </button>
              <button className="tv-glass-btn">
                <i className="fas fa-microphone"></i> {isMounted ? selectedReciter.name : ''}
              </button>
            </div>
          </div>

          <div className="tv-glass-body">
            {surahData?.ayahs?.[currentAyahIdx] && (
              <>
                <div className="tv-glass-ayah-text">
                  {surahData.ayahs[currentAyahIdx].text} <span className="tv-glass-ayah-number">﴿{toArabicNum(surahData.ayahs[currentAyahIdx].numberInSurah)}﴾</span>
                </div>
                {surahData.ayahs[currentAyahIdx].tafsir && (
                  <div className="tv-glass-ayah-tafsir">{surahData.ayahs[currentAyahIdx].tafsir}</div>
                )}
              </>
            )}
          </div>

          <div className="tv-glass-footer">
            <div className="tv-glass-controls">
              <button className="tv-control-btn"><i className="fas fa-redo"></i></button>
              <button className="tv-control-btn" onClick={() => { if (currentAyahIdx > 0) seekToAyah(currentAyahIdx - 1); }}><i className="fas fa-step-forward"></i></button>
              <button className="tv-control-btn play-pause" onClick={() => { if (audioPlaying) { audioRef.current?.pause(); setAudioPlaying(false); } else { audioRef.current?.play().then(() => setAudioPlaying(true)).catch(() => {}); } }}>
                <i className={`fas ${audioPlaying ? 'fa-pause' : 'fa-play'}`}></i>
              </button>
              <button className="tv-control-btn" onClick={() => { if (currentAyahIdx < (surahData?.ayahs?.length || 1) - 1) seekToAyah(currentAyahIdx + 1); }}><i className="fas fa-step-backward"></i></button>
              <button className="tv-control-btn"><i className="fas fa-ellipsis-h"></i></button>
            </div>
            <div className="tv-glass-progress-wrap">
              <span id="audio-current-time-1" className="tv-glass-time">{formatTime(audioCurrentTime)}</span>
              <div className="tv-glass-progress-bar" onClick={(e) => { if (audioRef.current?.duration) { const r = e.currentTarget.getBoundingClientRect(); const pct = (e.clientX - r.left) / r.width; audioRef.current.currentTime = pct * audioRef.current.duration; } }}>
                <div id="audio-progress-1" className="tv-glass-progress-fill" style={{ width: `0%` }}></div>
              </div>
              <span className="tv-glass-time">{formatTime(audioDuration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
