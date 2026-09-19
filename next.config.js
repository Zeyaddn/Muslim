/** @type {import('next').NextConfig} */

// Static export target (InfinityFree / any static host: PHP, Apache, etc.).
// The site runs fully client-side; there is NO Node server in production.
// Localization is handled via <html lang="ar" dir="rtl"> in _document.js,
// because Next's i18n option is not compatible with `output: 'export'`.
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'export',
  trailingSlash: true,
  images: {
    // Required for static export — no server-side image optimizer available.
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400,
  },
};

module.exports = nextConfig;
