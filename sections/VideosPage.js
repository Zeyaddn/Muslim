import { SCHOLAR_VIDEOS } from '../constants';

export default function VideosPage({ effectivePage }) {
  return (
    <section className={`page-section ${effectivePage === 'videos' ? 'active' : ''}`}>
      <div className="page-header">
        <h1><i className="fas fa-video"></i> المشايخ والدروس</h1>
        <p>دروس ومحاضرات لكبار العلماء والمشايخ</p>
      </div>
      <div className="page-content">
        <div className="videos-soon-banner">
          <span className="vsb-icon"><i className="fas fa-clapperboard"></i></span>
          <div className="vsb-text">
            <strong>قريباً — فيديوهات جديدة</strong>
            <span>نعمل على إضافة المزيد من الدروس والمحاضرات المرئية باستمرار، تابعنا</span>
          </div>
        </div>
        {SCHOLAR_VIDEOS.map((scholar, si) => (
          <div key={si} className="scholar-section" style={{ marginBottom: 36 }}>
            <div className="scholar-header" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              {scholar.image && (
                <img src={scholar.image} alt={scholar.name} loading="lazy" decoding="async"
                  style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                  onError={e => e.target.style.display = 'none'} />
              )}
              <div>
                <h3 style={{ fontFamily: 'var(--font-kufi)', margin: 0, fontSize: '1.1rem' }}>{scholar.name}</h3>
                <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{scholar.desc}</p>
              </div>
            </div>
            <div className="video-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {scholar.videos.map((v, vi) => (
                <div key={vi} className="video-card" style={{ background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${v.id}`, '_blank')}>
                  <div className="video-thumb" style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#1a1a2e' }}>
                    <img src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`} alt={v.title}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy" decoding="async" onError={e => { e.target.style.display = 'none'; }} />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 48, height: 48, background: 'rgba(255,0,0,0.85)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-play" style={{ color: '#fff', fontSize: '1.1rem', marginLeft: 3 }}></i>
                    </div>
                  </div>
                  <div className="video-info" style={{ padding: '12px 14px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontFamily: 'var(--font-kufi)', lineHeight: 1.4 }}>{v.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
