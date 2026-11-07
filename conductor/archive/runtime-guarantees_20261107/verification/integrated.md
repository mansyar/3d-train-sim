# Integrated Verification — Runtime Guarantees

Track: `runtime-guarantees_20261107`
Branch: `feat/runtime-guarantees_20261107`, base `main` @ `22870c6`
Phase checkpoints: 1 `2f855e0`, 2 `1bb7bf5`, 3 `2971f18`, 4 `f610a3b`

## Scope

The track makes two promises properties of the artifact instead of conventions:

- the bundled font survives an offline cold start (precache),
- the app's own response policy is served by every layer and cannot drift
  (`security-headers.ts` → Vite dev/preview plugin → nginx include → guard test),
  and the offline route is proven by a browser spec against the built app.

## Commands

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Static | `pnpm exec biome check .` / `pnpm exec tsc --noEmit` (via `pnpm check`) | 0 | 172 files, no findings |
| Unit | `pnpm test` (via `pnpm check`) | 0 | 46 files / 855 tests |
| Coverage | `pnpm test:coverage` | 0 | statements 97.35%, branches 91.06%, functions 98.10%, lines 99.44% on `src/core` + `src/state` |
| Build | `pnpm build` | 0 | PWA `generateSW`, 178 precache entries, 10,639.88 KiB (+95.88 KiB over the 10,544 KiB baseline: four Baloo 2 `woff2`) |
| E2E (track) | `pnpm exec playwright test e2e/runtime-guarantees.spec.ts` | 0 | 8 passed (tablet + phone, 1.5 min) |
| E2E (full) | `pnpm exec playwright test` | 0 | **191 passed** (tablet, phone, prod) in 18.0 min, no retries, no page crashes — 183 from before the track plus the 8 new runtime-guarantee cases |

## Acceptance criteria

| AC | Witness | Status |
| --- | --- | --- |
| AC-1 — `dist/sw.js` lists the four `woff2` and no `woff` | `phase-1.md`; re-checked with `rg -o '\.woff\b' dist/sw.js` → 0 matches and four `.woff2` entries | covered |
| AC-2 — the policy is on `index.html`, hashed JS, a `glb` and a `woff2` | `e2e/runtime-guarantees.spec.ts` reads `/sw.js`, extracts real asset names, and compares each response header set to `CONTENT_SECURITY_POLICY` + nosniff + no-referrer | covered |
| AC-3 — nginx mirrors the module, and drift fails the build | `src/core/nginx-headers.test.ts` (7 tests); drift demo in `phase-2.md`, re-demonstrated by the primary (removing `blob:` → 1 failed) | covered |
| AC-4 — offline boot, placement and ride | `e2e/runtime-guarantees.spec.ts` on tablet + phone: worker controls the page, `setOffline(true)`, reload, `workerStart > 0`, place a bridge, ride and stop, zero console errors | covered — Chromium (see deviations) |
| AC-5 — no foreign-origin request | request listener over boot/place/ride (empty), synthetic-entry failure path, and a real `fetch('https://example.com/…')` refused by `connect-src` with the refusal captured | covered |
| AC-6 — an inline script is refused | the spec appends an inline `<script>`; the global stays undefined and the CSP console message appears | covered |
| AC-7 — no new dependency, no external URL literal | `package.json` unchanged; `src/core/no-external-urls.test.ts` green over 60+ shipped sources | covered |
| AC-8 — docs record the guarantees and the deviation | `conductor/tech-stack.md` (security header row, deployment note, PWA row, folder structure) and the Phase 0 roadmap rows in `conductor/product.md` | covered |

## Deviations carried from the phases

1. `connect-src 'self' blob:` instead of the roadmap's `'none'`: Howler fetches
   audio over XHR and three.js reads GLB textures back through blob URLs.
2. Dev server relaxes `style-src` only (`'self' 'unsafe-inline'`), because Vite
   injects CSS through `<style>`; every built-output server stays strict.
3. The offline half of the spec runs on Chromium: Playwright's WebKit cannot take
   a service-worker page offline (`WebKit encountered an internal error`, worker
   fetches `Load failed`). iPad Safari remains a manual-device check.
4. AC-5 wording amended: a real foreign fetch is refused by CSP before
   `page.on('request')` fires, so the spec proves an empty observation, a firing
   negative control, and the captured refusal.

## Residual risk

- **No container build was run.** There is no Docker daemon locally or in CI, so
  the nginx include is proven by text parity and include coverage, not by nginx
  itself. A syntax error or a wrong include path fails the container at startup
  (loud, not silent), and `src/core/nginx-headers.test.ts` catches drift.
- **Real Safari is unproven.** The CSP was observed in WebKit's own wording during
  exploration, but the offline route has no WebKit automation. The manual-device
  layer still owns iPad behaviour.
- **HMR was not directly observed.** NFR-3 rests on the tablet smoke suite
  passing 20/20 against the dev server with the relaxed header set.
- Cache immutability for hashed assets, including `woff2`, is an nginx rule only;
  `vite preview` answers `no-cache` for everything, so the browser spec does not
  witness it and the unit test guards the copy instead.

## Verdict

All eight acceptance criteria have a witness. The Vite plugin and the nginx
include are two renderings of one module, and the guard test is the thing that
keeps them equal. Ready for review.
