import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Noy HaSade / FreshEye — field inventory PWA.
export default defineConfig({
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
        start_url: '/',
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
