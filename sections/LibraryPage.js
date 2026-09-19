import PDF_BOOKS from '../data/pdf-books';

export default function LibraryPage({
  effectivePage, librarySearch, setLibrarySearch,
  libraryCategory, setLibraryCategory, onOpenBook,
}) {
  const libraryGenres = [...new Set(PDF_BOOKS.map(b => b.genre))];
  const filteredLibrary = libraryCategory === 'all'
    ? PDF_BOOKS
    : PDF_BOOKS.filter(b => b.genre === libraryCategory);
  const searchedLibraryBooks = filteredLibrary.filter(b =>
    !librarySearch ||
    (b.title_ar || '').includes(librarySearch) ||
    (b.author_ar || '').includes(librarySearch) ||
    (b.description_ar || '').includes(librarySearch) ||
    (b.title_en || '').includes(librarySearch) ||
    (b.author_en || '').includes(librarySearch)
  );

  return (
    <section className={`page-section ${effectivePage === 'library' ? 'active' : ''}`}>
      <div className="page-header">
        <h1><i className="fas fa-book"></i> المكتبة الإسلامية</h1>
        <p>كتب إسلامية متنوعة للقراءة والتحميل</p>
      </div>
      <div className="page-content">
        <div className="search-bar">
          <i className="fas fa-search search-icon"></i>
          <input type="text" placeholder="ابحث عن كتاب..." value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} />
        </div>
        <div className="library-categories">
          <button className={`library-cat-btn ${libraryCategory === 'all' ? 'active' : ''}`} onClick={() => setLibraryCategory('all')}>
            <i className="fas fa-layer-group"></i> الكل
          </button>
          {libraryGenres.map(genre => (
            <button key={genre} className={`library-cat-btn ${libraryCategory === genre ? 'active' : ''}`} onClick={() => setLibraryCategory(genre)}>
              {genre}
            </button>
          ))}
        </div>
        {searchedLibraryBooks.length > 0 ? (
          <div className="library-books">
            {searchedLibraryBooks.map((book, i) => (
              <div key={book.id || i} className="library-book-card" onClick={() => onOpenBook && onOpenBook(book)}>
                <div className="library-book-cover">
                  <img src={`https://archive.org/services/img/${book.archiveId}`}
                    alt={book.title_ar}
                    className="book-cover-img"
                    loading="lazy"
                    decoding="async"
                    onError={e => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }} />
                  <div className="library-book-cover-fallback" style={{ background: `linear-gradient(135deg, ${book.coverColor}, ${book.coverColor}88)` }}>
                    <span className="library-book-cover-title">{book.title_ar.slice(0, 20)}</span>
                    <span className="library-book-cover-author">{book.author_ar}</span>
                  </div>
                  <span className="library-book-read-badge"><i className="fas fa-book-open"></i> قراءة</span>
                </div>
                <div className="library-book-info">
                  <div className="library-book-title">{book.title_ar}</div>
                  <div className="library-book-author"><i className="fas fa-user"></i> {book.author_ar}</div>
                  <div className="library-book-desc">{(book.description_ar || '').slice(0, 80)}</div>
                  <div className="library-book-footer">
                    <span className="library-book-genre"><i className="fas fa-tag"></i> {book.genre}</span>
                    <a
                      className="library-download-btn"
                      href={`https://archive.org/download/${book.archiveId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      title="تحميل من الأرشيف"
                    >
                      <i className="fas fa-download"></i> تحميل
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>لا توجد كتب مطابقة</p>
        )}
      </div>
    </section>
  );
}
