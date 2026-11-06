import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { APP, DEFAULT_ICON, iconKey, manifestIcons } from './src/appIcons.js'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: { ...APP, icons: manifestIcons(iconKey(DEFAULT_ICON.design, DEFAULT_ICON.color)) },
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
