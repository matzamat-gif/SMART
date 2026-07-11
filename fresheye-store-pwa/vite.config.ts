import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// FreshEye store-layer PWA — offline-first shell.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // App shell is cached so the app loads with no network.
        globPatterns: ['**/*.{js,css,html,woff2}'],
      },
      manifest: {
        name: 'FreshEye — סריקת מלאי',
        short_name: 'FreshEye',
        dir: 'rtl',
        lang: 'he',
        start_url: '/',
        display: 'standalone',
        background_color: '#F5F0E8',
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
