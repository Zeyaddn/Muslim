import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import InstallPrompt from '../components/InstallPrompt';
import ConnectionBanner from '../components/ConnectionBanner';
import { initLocalReminders } from '../utils/local-reminders';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  const _router = useRouter();

  useEffect(() => {
    // Set RTL
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';

    // Load saved theme
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);

    // Service Worker - production only (prevents dev hot-reload conflicts)
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
        // Auto-reload once when a freshly-installed SW takes control, so users
        // always see the latest version without manual hard-refreshes.
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      } else {
        navigator.serviceWorker.getRegistrations()
          .then(regs => regs.forEach(r => r.unregister()))
          .catch(() => {});
        if (window.caches && caches.keys) {
          caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
        }
      }
    }

    // Local adhkar reminders (no server) — scheduled while the app is open
    initLocalReminders();

    // Unlock audio on first interaction
    const unlockAudio = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctx.resume().then(() => ctx.close()).catch(() => {});
      } catch(e) {}
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
  }, []);

  return (
    <>
      <Head>
        <title>هُدى - منصة إسلامية شاملة</title>
        <meta name="description" content="هُدى - منصة إسلامية شاملة تضم القرآن الكريم، الأذكار والأدعية، معالم الصلاة، الأسماء الحسنى، والمزيد" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="هُدَى" />
        <meta name="application-name" content="هُدَى" />
      </Head>
      <Layout>
        {(childProps) => <Component {...pageProps} {...childProps} />}
      </Layout>
      <InstallPrompt />
      <ConnectionBanner />
    </>
  );
}
