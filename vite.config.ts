import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: '/',
        name: 'Tiny Tracks',
        short_name: 'Tiny Tracks',
        description:
          'A toy train table for toddlers — lay the track, press the button, watch your train go.',
        theme_color: '#ffb000',
        background_color: '#fff8e7',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache everything the toy needs to run offline, including train-kit models.
        globPatterns: ['**/*.{js,css,html,png,glb,gltf,webmanifest,ico}'],
        // Train-kit GLB models can exceed workbox's small default cap.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
});
