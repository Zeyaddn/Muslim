import { formatTime } from '../utils';

export default function FloatingAudioPlayer({
  audioPlaying, currentSurahInfo, surahData,
  selectedReciter, isMounted, audioRef,
  audioCurrentTime, audioDuration, seekAudio,
  fetchSurahAndPlay, setAudioPlaying,
  playingSurahId, currentAyahIdx, seekToAyah, ayahMode, onClose,
}) {
  // Stay visible while a surah session is active (even paused) — like Spotify.
  const visible = audioPlaying || !!playingSurahId;
  if (!visible) return null;

  const total = surahData?.ayahs?.length || 0;

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (audioPlaying) { a.pause(); setAudioPlaying(false); return; }
    if (a.src && !a.ended) {
      a.play().then(() => setAudioPlaying(true)).catch(() => {});
    } else if (currentSurahInfo) {
      fetchSurahAndPlay(currentSurahInfo.id, false);
    }
  };
  const prevAyah = () => { if (ayahMode && currentAyahIdx > 0) seekToAyah(currentAyahIdx - 1); };
  const nextAyah = () => { if (ayahMode && total && currentAyahIdx < total - 1) seekToAyah(currentAyahIdx + 1); };

  const surahNum = currentSurahInfo?.id || surahData?.number || '';

  return (
    <div className="spotify-player">
      <div className="sp-left">
        <div className="sp-cover">
          <span>{surahNum}</span>
          <i className="fas fa-music"></i>
        </div>
        <div className="sp-titles">
          <div className="sp-name">{currentSurahInfo?.name || surahData?.name || ''}</div>
          <div className="sp-reciter">{isMounted ? selectedReciter.name : ''}</div>
          <div id="fp-ayah-badge" className="sp-badge"></div>
        </div>
      </div>

      <div className="sp-center">
        <div className="sp-buttons">
          <button className="sp-skip" onClick={nextAyah} disabled={!ayahMode || !total || currentAyahIdx >= total - 1} title="الآية التالية">
            <i className="fas fa-step-backward"></i>
          </button>
          <button className="sp-play" onClick={togglePlay}>
            <i className={`fas ${audioPlaying ? 'fa-pause' : 'fa-play'}`}></i>
          </button>
          <button className="sp-skip" onClick={prevAyah} disabled={!ayahMode || currentAyahIdx <= 0} title="الآية السابقة">
            <i className="fas fa-step-forward"></i>
          </button>
        </div>
        <div className="sp-progress">
          <span id="audio-current-time-2" className="sp-time">{formatTime(audioCurrentTime)}</span>
          <div className="sp-bar-wrap" onClick={seekAudio}>
            <div className="sp-bar">
              <div id="audio-progress-2" className="sp-fill" style={{ width: '0%' }}></div>
              <div id="audio-progress-thumb-2" className="sp-thumb" style={{ left: '0%' }}></div>
            </div>
          </div>
          <span id="audio-total-time-2" className="sp-time">{formatTime(audioDuration)}</span>
        </div>
      </div>

      <div className="sp-right">
        <button className="sp-close" onClick={() => { setAudioPlaying(false); if (onClose) onClose(); }} title="إغلاق المشغل">
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
}
