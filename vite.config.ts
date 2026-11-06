import { readFileSync } from 'node:fs';
import type { Connect } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

import { securityHeadersFor } from './src/core/security-headers';

// Injected so the parent gate can show the family which build is running.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// Production and preview are strict. Dev relaxes only `style-src`, because
// Vite injects CSS through `<style>` elements while serving (and HMR rewrites
// them); built output loads linked stylesheets instead.
function applyHeaders(headers: Readonly<Record<string, string>>): Connect.NextHandleFunction {
  return (_req, res, next) => {
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, value);
    }
    next();
  };
}

const applyDevSecurityHeaders = applyHeaders(securityHeadersFor({ dev: true }));
const applyPreviewSecurityHeaders = applyHeaders(securityHeadersFor({ dev: false }));

export default defineConfig({
  test: {
    // Unit tests live in src/ only; e2e/ belongs to Playwright.
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Logic-bearing modules only — scene/UI/audio glue is covered by
      // Playwright and manual tablet checks (conductor/workflow.md).
      include: ['src/core/**/*.ts', 'src/state/**/*.ts'],
      exclude: ['**/*.test.ts'],
      // The project's quality bar: 80% on logic-bearing code.
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    {
      name: 'tiny-tracks-security-headers',
      configureServer(server) {
        server.middlewares.use(applyDevSecurityHeaders);
      },
      configurePreviewServer(server) {
        server.middlewares.use(applyPreviewSecurityHeaders);
      },
    },
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
        // Precache everything the toy needs to run offline, including
        // train-kit models, the bundled sound box (ogg/mp3 pairs) and the
        // Baloo 2 woff2 subsets the shell loads. Legacy woff is deliberately
        // left out: no browser in the supported range asks for it.
        globPatterns: ['**/*.{js,css,html,png,glb,gltf,webmanifest,ico,ogg,mp3,woff2}'],
        // Train-kit GLB models can exceed workbox's small default cap.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
});
