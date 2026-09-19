import { useState } from 'react';

// Books are read through Archive.org's own BookReader embed. This works as a
// plain <iframe> on any static host (no server proxy / CORS needed) — perfect
// for InfinityFree where the old /api/pdf-proxy no longer exists.
export default function BookViewer({ bookModal, setBookModal }) {
  const [focusMode, setFocusMode] = useState(false);

  if (!bookModal) return null;

  const archiveId = bookModal.archiveId;
  const readerUrl = `https://archive.org/embed/${encodeURIComponent(archiveId)}`;
  const downloadUrl = `https://archive.org/download/${encodeURIComponent(archiveId)}`;

  const close = () => { setBookModal(null); setFocusMode(false); };

  return (
    <div className={`book-reader-overlay open ${focusMode ? 'focus-mode' : ''}`}
      onClick={() => { if (!focusMode) close(); }}>
      <div className="book-reader" onClick={e => e.stopPropagation()}>
        {!focusMode && (
          <div className="pdf-toolbar">
            <div className="pdf-toolbar-left">
              <button className="pdf-toolbar-btn pdf-back-btn" onClick={close}>
                <i className="fas fa-arrow-right"></i> رجوع
              </button>
              <span className="pdf-toolbar-title">{bookModal.title_ar}</span>
            </div>
            <div className="pdf-toolbar-right">
              <a className="pdf-toolbar-btn" href={readerUrl} target="_blank" rel="noopener noreferrer" title="فتح في تبويب جديد">
                <i className="fas fa-up-right-from-square"></i>
              </a>
              <a className="pdf-toolbar-btn" href={downloadUrl} target="_blank" rel="noopener noreferrer" title="تحميل من الأرشيف">
                <i className="fas fa-download"></i>
              </a>
              <button className="pdf-toolbar-btn" onClick={() => setFocusMode(true)} title="وضع التركيز">
                <i className="fas fa-expand"></i>
              </button>
            </div>
          </div>
        )}

        <button className={`pdf-focus-exit ${focusMode ? 'visible' : ''}`} onClick={() => setFocusMode(false)} title="خروج من وضع التركيز">
          <i className="fas fa-compress"></i>
        </button>

        <div className={`pdf-viewport${focusMode ? ' focus-mode' : ''}`}>
          <iframe
            src={readerUrl}
            title={bookModal.title_ar || 'Book'}
            className="book-embed-frame"
            allowFullScreen
            loading="lazy"
            style={{ width: '100%', height: '100%', border: '0', background: '#fff' }}
          />
        </div>
      </div>
    </div>
  );
}
