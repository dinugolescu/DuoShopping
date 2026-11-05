import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Lista de cumpărături',
        short_name: 'Cumpărături',
        description: 'Listă de cumpărături comună, sincronizată între telefoane.',
        lang: 'ro',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f5f6f2',
        theme_color: '#2e7d4f',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // /__/auth/* e handler-ul de login Firebase; service worker-ul nu trebuie să-l intercepteze.
        navigateFallbackDenylist: [/^\/__\//],
        // Fonturile alese din setări se păstrează local, ca aplicația să arate la fel și fără semnal.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonturi', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
})
