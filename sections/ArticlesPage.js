import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ISLAMIC_DATA from '../data/islamic-data';

export default function ArticlesPage({ effectivePage }) {
  const [openArticle, setOpenArticle] = useState(null);

  useEffect(() => {
    if (!openArticle) return;
    const h = e => { if (e.key === 'Escape') setOpenArticle(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [openArticle]);

  return (
    <section className={`page-section ${effectivePage === 'articles' ? 'active' : ''}`}>
      <div className="page-header">
        <h1><i className="fas fa-pen"></i> المقالات</h1>
        <p>مقالات إسلامية متنوعة</p>
      </div>
      <div className="page-content">
        <div className="cards-grid">
          {ISLAMIC_DATA.articles.map((a, i) => (
            <div key={i} className="article-card" onClick={() => setOpenArticle(a)} role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') setOpenArticle(a); }}>
              <div className="article-image"><i className={`fas ${a.icon}`}></i></div>
              <div className="article-content">
                <h3>{a.title}</h3>
                <p>{a.excerpt}</p>
                <div className="article-meta">
                  <span><i className="fas fa-user"></i> {a.author}</span>
                  <span><i className="fas fa-calendar"></i> {a.date}</span>
                  <span className="article-read-more"><i className="fas fa-arrow-left"></i> اقرأ المقال</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {openArticle && createPortal(
        <div className="quiz-modal-overlay open" onClick={() => setOpenArticle(null)}>
          <div className="quiz-modal-content" onClick={e => e.stopPropagation()}>
            <div className="quiz-modal-header">
              <h2><i className={`fas ${openArticle.icon || 'fa-pen'}`}></i> {openArticle.title}</h2>
              <button className="modal-close" onClick={() => setOpenArticle(null)} aria-label="إغلاق"><i className="fas fa-times"></i></button>
            </div>
            <div className="quiz-modal-body article-reader-body">
              <div className="article-meta" style={{ marginBottom: 16 }}>
                <span><i className="fas fa-user"></i> {openArticle.author}</span>
                <span><i className="fas fa-calendar"></i> {openArticle.date}</span>
              </div>
              {(openArticle.content || '').split('\n\n').map((p, i) => (
                <p key={i} className="article-paragraph">{p}</p>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
