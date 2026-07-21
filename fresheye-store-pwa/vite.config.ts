import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// On GitHub Pages the app is served from https://<user>.github.io/<repo>/,
// so the build needs that base path. Derived from the repo name in CI; local
// dev/preview stays at the root. GITHUB_REPOSITORY is like "owner/repo".
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = repo ? `/${repo}/` : '/';

// Noy HaSade / FreshEye — field inventory PWA.
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
      },
      manifest: {
        name: 'נוי השדה — ניהול מלאי בשטח',
        short_name: 'נוי השדה',
        dir: 'rtl',
        lang: 'he',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#F5F5F4',
        theme_color: '#1E3E20',
        icons: [
          // TODO: add real 192/512 PNG icons before pilot install.
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
