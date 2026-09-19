export default function NamesPage({ effectivePage, namesSearch, setNamesSearch, filteredNames }) {
  return (
    <section className={`page-section ${effectivePage === 'names' ? 'active' : ''}`}>
      <div className="page-header">
        <h1><i className="fas fa-star"></i> أسماء الله الحسنى</h1>
        <p>99 اسماً من أسماء الله تعالى</p>
      </div>
      <div className="page-content">
        <div className="search-bar">
          <i className="fas fa-search search-icon"></i>
          <input type="text" placeholder="ابحث في الأسماء..." value={namesSearch} onChange={e => setNamesSearch(e.target.value)} />
        </div>
        {namesSearch && <div className="search-results-count">نتائج البحث: {filteredNames.length}</div>}
        <div className="names-grid">
          {filteredNames.map((n, i) => (
            <div key={i} className="name-card">
              <div className="name-arabic">{n.name || ''}</div>
              <div className="name-meaning">{n.en?.meaning || n.transliteration || ''}</div>
              <div className="name-explanation">{n.transliteration || ''}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
