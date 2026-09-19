import Link from 'next/link';
import { useState, useEffect } from 'react';

const NAV_ITEMS = [
  { key: 'home', label: 'الرئيسية', icon: 'fa-home' },
  { key: 'quran', label: 'القرآن', icon: 'fa-book-open' },
  { key: 'qibla', label: 'القبلة', icon: 'fa-kaaba', href: '/qibla' },
  { key: 'adhkar', label: 'الأذكار والدعاء', icon: 'fa-praying-hands' },

  { key: 'tasbeeh', label: 'المسبحة', icon: 'fa-pray' },
  { key: 'names', label: 'الأسماء الحسنى', icon: 'fa-star' },
  { key: 'articles', label: 'المقالات', icon: 'fa-pen' },
  { key: 'library', label: 'المكتبة', icon: 'fa-book' },
  { key: 'videos', label: 'المشايخ', icon: 'fa-video' },
  { key: 'contact', label: 'تواصل معنا', icon: 'fa-envelope' },
];

export default function Navbar({ activePage, onNavigate, theme, onToggleTheme, onOpenSettings }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">
          <a href="#" className="nav-logo" onClick={e => { e.preventDefault(); onNavigate('home'); closeMobile(); }}>
            <div className="logo-icon"><img src="/favicon.png" alt="هُدَى" width={40} height={40} /></div>
            <span>هُدَى</span>
          </a>
          <div className="nav-links">
            {NAV_ITEMS.map(item => (
              item.href ? (
                <Link key={item.key} href={item.href}>
                  <i className={`fas ${item.icon}`}></i> {item.label}
                </Link>
              ) : (
                <a key={item.key} href="#"
                  className={activePage === item.key ? 'active' : ''}
                  onClick={e => { e.preventDefault(); onNavigate(item.key); }}>
                  <i className={`fas ${item.icon}`}></i> {item.label}
                </a>
              )
            ))}
          </div>
          <div className="nav-actions">
            <button className="theme-toggle" onClick={onOpenSettings} aria-label="الإعدادات" title="الإعدادات">
              <i className="fas fa-cog theme-icon"></i>
            </button>
            <button className="theme-toggle" onClick={onToggleTheme} aria-label="تبديل الوضع">
              <i className={`fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'} theme-icon`}></i>
            </button>
            <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="القائمة">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </nav>

      <div className={`mobile-menu${mobileOpen ? ' open' : ''}`} id="mobile-menu">
        {NAV_ITEMS.map(item => (
          item.href ? (
            <Link key={item.key} href={item.href} onClick={closeMobile}>
              <i className={`fas ${item.icon}`}></i> {item.label}
            </Link>
          ) : (
            <a key={item.key} href="#"
              className={activePage === item.key ? 'active' : ''}
              onClick={e => { e.preventDefault(); onNavigate(item.key); closeMobile(); }}>
              <i className={`fas ${item.icon}`}></i> {item.label}
            </a>
          )
        ))}
        <a href="#" onClick={e => { e.preventDefault(); setMobileOpen(false); if (onOpenSettings) onOpenSettings(); }}>
          <i className="fas fa-cog"></i> الإعدادات
        </a>
      </div>
    </>
  );
}

