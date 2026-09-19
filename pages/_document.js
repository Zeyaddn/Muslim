import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="ar" dir="rtl">
        <Head>
          <meta charSet="UTF-8" />
          <meta name="theme-color" content="#1a6b4a" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="هُدى" />
          <meta name="application-name" content="هُدى" />

          {/* Manifest */}
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" type="image/png" sizes="256x256" href="/favicon.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

          {/* DNS prefetch for external APIs */}
          <link rel="dns-prefetch" href="https://api.islamic.app" />
          <link rel="dns-prefetch" href="https://api.quran.com" />
          <link rel="dns-prefetch" href="https://everyayah.com" />
          <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
          <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
          <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
          <link rel="dns-prefetch" href="https://nominatim.openstreetmap.org" />

          {/* Preconnect to font origins */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

          {/* Font Awesome CDN */}
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />

{/* Arabic Fonts - single load point (globals.css @import removed) */}
          {/* display=swap for non-Quran fonts, display=block for Quran font to prevent FOUT */}
          {/* Cairo was removed: it only ever served as a fallback behind Noto Kufi Arabic / IBM Plex Sans Arabic. */}
          <link
            href="https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&family=Amiri+Quran&family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Noto+Kufi+Arabic:wght@400;600;700&display=swap"
            rel="stylesheet"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
