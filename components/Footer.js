import { showToast } from './Toast';
import { WhatsAppIcon } from '../sections/ContactPage';

export default function Footer({ onNavigate }) {
  const shareText = 'هُدَى - منصة إسلامية شاملة: القرآن الكريم، الأذكار والدعاء، مواقيت الصلاة والمزيد';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      showToast('تم نسخ رابط الموقع', 'success');
    } catch {
      showToast('تعذر نسخ الرابط', 'error');
    }
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-col">
          <h4>هُدَى</h4>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>
            منصة إسلامية شاملة تهدف إلى تقديم كل ما يحتاجه المسلم من قرآن وأذكار وأدعية ومواقيت صلاة
          </p>
          <div style={{display: 'flex', gap: '12px', marginTop: '16px'}}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank" rel="noopener noreferrer"
              aria-label="مشاركة عبر واتساب" title="شارك الموقع عبر واتساب"
              style={{fontSize: '1.4rem', opacity: 0.7, transition: 'opacity 0.2s'}}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
            ><WhatsAppIcon size={22} /></a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
              target="_blank" rel="noopener noreferrer"
              aria-label="مشاركة عبر تويتر" title="شارك الموقع عبر تويتر"
              style={{fontSize: '1.4rem', opacity: 0.7, transition: 'opacity 0.2s'}}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
            ><i className="fab fa-twitter"></i></a>
            <button
              onClick={copyLink}
              aria-label="نسخ رابط الموقع" title="نسخ رابط الموقع"
              style={{fontSize: '1.4rem', opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', transition: 'opacity 0.2s'}}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
            ><i className="fas fa-link"></i></button>
          </div>
        </div>
        <div className="footer-col">
          <h4>الأقسام</h4>
          {[['quran','القرآن الكريم'],['adhkar','الأذكار والدعاء'],['tasbeeh','المسبحة'],['names','أسماء الله الحسنى']].map(([p,l]) => (
            <a key={p} href="#" onClick={e => { e.preventDefault(); onNavigate(p); }} data-page={p}>
              {l}
            </a>
          ))}
        </div>
        <div className="footer-col">
          <h4>روابط سريعة</h4>
          {[['articles','المقالات'],['library','المكتبة'],['contact','تواصل معنا'],['videos','المشايخ'],['home','الرئيسية']].map(([p,l]) => (
            <a key={p} href="#" onClick={e => { e.preventDefault(); onNavigate(p); }}>{l}</a>
          ))}
        </div>
        <div className="footer-col">
          <h4>إحصائيات</h4>
          <div style={{display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
            <span><i className="fas fa-book-open"></i> 114 سورة</span>
            <span><i className="fas fa-book"></i> 42,000+ حديث</span>
            <span><i className="fas fa-hands-praying"></i> 150+ دعاء</span>
            <span><i className="fas fa-star"></i> 99 اسماً</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>هُدَى © 1446-1447 هـ - جميع الحقوق محفوظة</p>
        <p style={{marginTop: '4px'}}>لا إله إلا الله محمد رسول الله ﷺ</p>
        <div className="footer-dev">
          <a className="footer-wa" href="https://wa.me/201022568997" target="_blank" rel="noreferrer" aria-label="واتساب">
            <WhatsAppIcon size={20} />
          </a>
          <span>تطوير وتصميم: <strong>زياد الأسد</strong></span>
        </div>
      </div>
    </footer>
  );
}
