# Runtime Guarantees — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Make the offline and privacy promises properties of the shipped artifact rather
than conventions: precache the bundled font, apply one Content-Security-Policy
and header set from both the dev/preview server and the nginx container, and
prove all of it — offline boot-and-ride, zero off-origin requests, a live (not
merely declared) policy, and identical headers in production — with automated
checks.

## Problem / Motivation

Three verified gaps (2026-11-07):

1. `vite.config.ts` precaches `js,css,html,png,glb,gltf,webmanifest,ico,ogg,mp3`
   — not `woff2`. The four emitted Baloo 2 subsets (95 KB) sit outside the
   precache, so an offline cold start after HTTP-cache eviction paints in a
   fallback font.
2. `nginx.conf` sends only `Cache-Control`. No CSP, `nosniff` or
   `Referrer-Policy`, so "nothing leaves the device" is unenforced: one future
   dependency could phone home and no layer would object.
3. No automated proof exists for either promise — no offline spec, no header
   assertion, and no request assertion.

A 2–4 year old tapping a train that silently does nothing because a font or a
GLB failed to load is exactly the "failure state" the product guidelines forbid.

## Goals & Success Metrics

- **Goal:** offline reload boots the meadow, accepts a placement, and rides.
  **Metric:** Playwright offline spec green on WebKit and Chromium, zero console
  errors, zero failed requests.
- **Goal:** the policy is real and consistent.
  **Metric:** negative control (injected inline script does not run) passes in
  preview, and the guard test proves nginx sends every directive on every
  location.
- **Goal:** nothing leaves the device.
  **Metric:** zero requests with a foreign origin across boot, placement and
  ride.

## Scope

### In Scope

- `woff2` in the service-worker precache; legacy `woff` deliberately excluded.
- One TypeScript module as the header source of truth.
- A Vite plugin applying those headers in dev and preview.
- An nginx include used by the server block and every `location`.
- A guard test proving nginx and TypeScript cannot drift.
- A static test banning `http(s)://` literals in shipped sources.
- An offline boot/place/ride Playwright spec on tablet and phone.
- A foreign-origin request assertion and a CSP negative control.
- Documentation sync.

### Out of Scope

- Changing Howler's audio pipeline (`connect-src 'self'` keeps its XHR working).
- `Permissions-Policy` / COOP / COEP headers (declined for this track).
- Docker-based header tests in CI.
- Viewport/accessibility work (`a11y-pass` in Phase 2 of the roadmap).
- Dependency automation (`deps-guardrails_20261107`).
- Any gameplay, layout or asset change.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The production precache contains every `woff2` the build emits, and no `woff` | must |
| FR-2 | One TypeScript module exports the full header set: CSP `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; media-src 'self'; connect-src 'self' blob:; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`, plus `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`. The dev server may relax `style-src` (only) to `'self' 'unsafe-inline'`, because Vite injects CSS through `<style>` elements; every server that serves built output stays strict | must |
| FR-3 | A Vite plugin applies exactly those headers on every dev and preview response | must |
| FR-4 | `nginx.conf` applies the identical set on every response, including all four `location` blocks, through one included file | must |
| FR-5 | A unit test fails if any directive or header is missing from any nginx location, or if the include drifts from the TypeScript source | must |
| FR-6 | Playwright (preview, tablet and phone): after the worker controls the page and the network is off, reload shows the starter meadow, a toy can be placed, ▶ starts a train that moves, with no console errors | must |
| FR-7 | Every request made during boot, placement and ride has the app's own origin | must |
| FR-8 | A CSP negative control proves an injected inline `<script>` never executes while the app's own same-origin bundle does | must |
| FR-9 | A unit test fails if any shipped `src/**` module (excluding tests) contains an `http://` or `https://` literal | must |
| FR-10 | `conductor/tech-stack.md` records the policy and the font precache, and `conductor/product.md` records the `connect-src 'self'` deviation on the roadmap row | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No new runtime or dev dependency |
| NFR-2 | Precache grows by no more than 120 KB (measured need: 95 KB) |
| NFR-3 | Dev workflow unchanged: HMR still connects and `pnpm dev` boots with the policy applied |
| NFR-4 | All existing checks stay green (820 unit tests, 183 Playwright tests) |
| NFR-5 | Header overhead stays under 1 KB per response; no layout or gameplay change |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | After `pnpm build`, `dist/sw.js` lists all four `woff2` files and no `woff` | FR-1 |
| AC-2 | Against the preview server, `index.html`, a hashed JS chunk, a `glb` and a `woff2` response each carry the full CSP and both headers | FR-2, FR-3 |
| AC-3 | Deleting a directive from the TypeScript constant makes the nginx guard test fail, and deleting it from the include does too | FR-5 |
| AC-4 | The offline spec passes on tablet and phone with the network disabled (browser engine: Chromium — Playwright's WebKit build cannot emulate offline behind a service worker; the iPad path is covered by the manual-device layer, and the policy itself is asserted in WebKit wording during exploration) | FR-6 |
| AC-5 | The request assertion observes no foreign-origin request during boot, placement and ride; its failure path is shown to fire on a synthetic foreign entry; and a real foreign fetch is refused by `connect-src` before it reaches the network (refusal captured verbatim) | FR-7 |
| AC-6 | An injected inline script is blocked while the app's own bundle still runs | FR-8 |
| AC-7 | The static guard fails when an `https://` literal is added to a shipped module | FR-9 |
| AC-8 | Tech stack and roadmap updated; `pnpm check` green | FR-10 |

## Edge Cases

- **First visit offline:** impossible by nature (no worker yet). The spec warms
  the cache, then disconnects; this is recorded, not worked around.
- **Service-worker update probe under CSP:** an update fetch must still succeed;
  asserted in the offline spec before going offline.
- **Audio:** Howler loads through XHR, which `connect-src 'self'` permits;
  `media-src 'self'` covers an `html5` fallback. A browser that still blocks
  sound is a blocker to report, never a silent relaxation.
- **`blob:` download** from the parent-gate Save path is an anchor `download`,
  not a CSP fetch.
- **CSP in dev:** Vite injects styles as `<style>` elements, so the dev server
  relaxes `style-src` to `'self' 'unsafe-inline'`; preview and production stay
  strict. The HMR websocket must survive `connect-src 'self' blob:`; a refusal is
  recorded as a deviation.
- **GLB textures:** three.js reads embedded textures back through `blob:` object
  URLs, which is why `connect-src` lists `blob:` — same-device memory, not a
  network source.
- **Offline emulation:** Playwright's WebKit build cannot take a
  service-worker-controlled page offline (`setOffline` fails the navigation with
  `WebKit encountered an internal error` and worker fetches reject with
  `Load failed`). The offline spec therefore runs on Chromium with the same
  tablet and phone profiles; real iPad behaviour is a manual-device check, and the
  precache manifest assertion is engine-independent.
- **nginx `add_header` inheritance:** a `location` that declares its own
  `add_header` drops inherited ones, which is why the policy lives in an include
  every location pulls in.

## Dependencies

- **Tracks:** `save-resilience_20261107` (merged `53d9a93`) and
  `world-portability_20261107` (merged `22870c6`).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** Safari 16+ honours `script-src 'self'` without needing `blob:`
  for three.js workers — the app creates no workers.
- **Assumption:** `connect-src 'self'` covers same-origin `ws://` for HMR in the
  browsers the team develops with; if one refuses, dev-only `ws:` is added and
  recorded as a deviation.
- **Assumption:** precaching all four subsets (95 KB) is acceptable because
  offline there is no other source for the font.

## References

- `conductor/product.md` (Phase 0 roadmap row for `runtime-guarantees_20261107`)
- `conductor/product-guidelines.md` (Privacy, Performance)
- `conductor/tech-stack.md` (PWA self-update, build and deploy rows)
- `vite.config.ts`, `nginx.conf`, `e2e/save-recovery.spec.ts`
