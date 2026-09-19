import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Navbar from './Navbar';
import Footer from './Footer';
import Toast from './Toast';
import SettingsModal from './SettingsModal';
import { startNativePermissionFlow } from '../utils/prayer-push';

const _themeIcons = { light: 'fa-moon', dark: 'fa-sun' };
const VALID_PAGES = ['home', 'quran', 'quran-reader', 'adhkar', 'tasbeeh', 'names', 'articles', 'library', 'videos', 'contact'];

export default function Layout({ children }) {
  const [theme, setTheme] = useState('light');
  const [activePage, setActivePage] = useState('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
    const savedPage = localStorage.getItem('lastPage');
    if (savedPage && VALID_PAGES.includes(savedPage)) setActivePage(savedPage);
    // First visit ever: fire the BROWSER'S OWN native permission prompts
    // (location + notifications) with zero custom UI. Once per device.
    startNativePermissionFlow();
  }, []);

  // Next.js route transitions (/qibla …): show the loader bar too
  useEffect(() => {
    const start = () => setNavLoading(true);
    const end = () => setNavLoading(false);
    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', end);
    router.events.on('routeChangeError', end);
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', end);
      router.events.off('routeChangeError', end);
    };
  }, [router]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }, [theme]);

  // In-app section switching: brief loader for a smooth, snappy transition.
  const navigate = useCallback((page) => {
    setNavLoading(true);
    // Standalone route (/qibla …): internal sections don't exist here —
    // go home first, then open the requested section after landing.
    if (router.pathname !== '/') {
      if (page === 'home') {
        setActivePage('home');
      } else {
        try { sessionStorage.setItem('huda_nav_target', page); } catch (e) {}
      }
      router.push('/');
      return;
    }
    setTimeout(() => {
      setActivePage(page);
      if (VALID_PAGES.includes(page)) localStorage.setItem('lastPage', page);
      window.scrollTo({ top: 0, behavior: 'auto' });
      setTimeout(() => setNavLoading(false), 160);
    }, 130);
  }, [router]);

  const childProps = { activePage, onNavigate: navigate, theme, onToggleTheme: toggleTheme, onOpenSettings: () => setSettingsOpen(true) };

  return (
    <>
      {navLoading && <div className="page-loader-bar" aria-hidden="true"></div>}
      <div className={`page-veil${navLoading ? ' on' : ''}`} aria-hidden="true"></div>
      <Navbar {...childProps} />
      <div className="main-content">
        {typeof children === 'function' ? children(childProps) : children}
      </div>
      <Footer onNavigate={navigate} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <button className="back-to-top" id="back-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="العودة للأعلى">
        <i className="fas fa-arrow-up"></i>
      </button>
      <Toast />
    </>
  );
}
