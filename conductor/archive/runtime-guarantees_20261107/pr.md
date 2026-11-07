# Make the offline and privacy promises properties of the build

Closes #— (Conductor track, no issue).

## Summary

Tiny Tracks promises two things that were true by hand but not by construction:
it works in airplane mode, and nothing leaves the device. This track moves both
into the artifact and puts a witness on each.

- **The font survives an offline cold start.** `workbox.globPatterns` now includes
  `woff2` — but not legacy `woff` — so the four bundled Baloo 2 subsets
  (95.88 KiB total) are precached. Before this, an offline reload fell back to a
  system face while every other asset came from the cache.
- **One policy, three layers, one guard.** `src/core/security-headers.ts` holds
  the CSP and the two companion headers. A Vite plugin serves them in dev and
  preview; `nginx-security-headers.conf` is included by the server block *and*
  each of the six locations (a location that sets `add_header` drops an inherited
  policy, which is why a server-level `add_header` alone would have silently
  vanished on `/sw.js`, `/index.html`, the manifest, hashed assets and media);
  and `src/core/nginx-headers.test.ts` fails `pnpm check` if the nginx copy drifts
  from the module or if any location stops including it.
- **The offline route is proven in a browser.** A Playwright spec runs against
  the built app, warms the service worker, kills the network and then reloads:
  the document must come from the worker (`workerStart > 0`), a bridge must be
  placed through the toy drawer, and the ride must start and stop with no console
  error. The same spec asserts that no request left the app origin during boot,
  placement and ride, and that an injected inline script is refused while the
  bundle itself keeps running.
- **A static privacy guard.** `src/core/no-external-urls.test.ts` fails on any
  `http(s)://` literal in shipped TypeScript, shipped CSS or `index.html`, and
  names the file and line when it does. `public/**` stays exempt on purpose: the
  vendored kits ship `CREDITS.md` and `License.txt` whose attribution text must
  name upstream URLs.

Two honest deviations, both recorded in the spec: `connect-src` is
`'self' blob:` rather than the roadmap's `'none'`, because Howler fetches audio
over XHR and three.js reads GLB-embedded textures back through same-device blob
URLs; and the offline spec runs on Chromium, because Playwright's WebKit cannot
put a service-worker page offline (its CSP refusal behaviour was still observed
under WebKit during exploration). Real iPad checks stay in the manual-device layer.

## Track

- Spec: [../archive/runtime-guarantees_20261107/spec.md](../archive/runtime-guarantees_20261107/spec.md)
- Plan: [../archive/runtime-guarantees_20261107/plan.md](../archive/runtime-guarantees_20261107/plan.md)
- Review: [../archive/runtime-guarantees_20261107/review.md](../archive/runtime-guarantees_20261107/review.md)

## What happened

| Phase | Goal | Checkpoint |
| --- | --- | --- |
| 1 | Policy in code, `woff2` in the precache | `2f855e0` |
| 2 | Production parity through one nginx include | `1bb7bf5` |
| 3 | Browser proof of headers, offline, refusals | `2971f18` |
| 4 | Docs and roadmap record what ships | `f610a3b` |
| R1 | Close five review findings | `ea626b2` |
| R2 | Narrow the ride witness to what it proves | `ec271d3` |

## Requirements

- [x] FR-1 — `dist/sw.js` precaches all four `woff2` subsets and no `woff`
- [x] FR-2 — CSP plus `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`
- [x] FR-3 — dev and preview both serve the policy; dev relaxes `style-src` only
- [x] FR-4 — nginx serves the identical policy on the server block and every location
- [x] FR-5 — a unit test fails when nginx drifts from the module
- [x] FR-6 — offline boot, placement and ride against the built app
- [x] FR-7 — no foreign-origin request during boot, placement or ride
- [x] FR-8 — an injected inline script is refused while the bundle runs
- [x] FR-9 — no `http(s)://` literal in shipped sources
- [x] FR-10 — tech stack, folder map and roadmap describe what ships
- [x] NFR-1 — no new dependency
- [x] NFR-2 — precache growth within the 120 KiB budget (+95.88 KiB)
- [x] NFR-3 — dev workflow unchanged; policy visible on the dev server
- [x] NFR-4 — existing suites stay green
- [x] NFR-5 — header overhead under 1 KiB per response

## Verification

| Check | Result |
| --- | --- |
| `pnpm check` | pass — Biome 172 files, `tsc --noEmit` clean, 46 files / 856 tests |
| `pnpm test:coverage` | pass — 97.35% stmts / 91.06% branches / 98.10% funcs / 99.44% lines |
| `pnpm build` | pass — 178 precache entries, 10,639.88 KiB, four `woff2`, zero `woff` |
| `pnpm exec playwright test e2e/runtime-guarantees.spec.ts` | pass — 10 (tablet + phone) |
| `pnpm exec playwright test` (full) | pass — 191 (tablet, phone, prod), no retries |
| Negative control: dev middleware switched to the strict map | the dev-header test fails, then reverted |
| Negative control: `blob:` removed from the nginx include | the drift guard fails, then reverted |

## Media

Nothing worth a clip: the visual change is a missing-to-present fallback font on
an offline cold start, and the headers are invisible. The evidence is the specs
above.

## Review

Two rounds, both PASS WITH FINDINGS; 0 Critical, 0 High, 1 Medium and 5 Low, all
fixed in-branch (`review.md`). Round 1 caught that the dev-server half of the
policy was never asserted, that the CSP control was tautological, that
`headerLines()` had no consumer despite the docs claiming it, that the privacy
guard walked only TypeScript, and that the ride assertion was a label flip.
Round 2 confirmed all five and noted the new canvas poll proves a live loop rather
than train displacement — closed by narrowing the claim and pointing at
`src/scene/ride-motion.test.ts`.

## Deviations and risks

- `connect-src 'self' blob:` (Howler XHR, GLB textures) and a dev-only
  `style-src` relaxation — both documented in the spec's FR-2 and edge cases.
- Offline e2e on Chromium; iPad offline remains a manual check.
- No container build runs in CI (no Docker daemon), so the nginx side is enforced
  by static parsing plus a Dockerfile `COPY` assertion, not by starting nginx.
- HMR connectivity is not asserted; the tablet smoke suite drives the real dev
  server, which covers the practical risk.

## Follow-ups

- `deps-guardrails_20261107` — the last Phase 0 item.
- Manual pass on a family iPad: install, airplane mode, cold start, ride.
- A paused-render `document.visibilityState` check could be added later; the
  lifecycle already suspends audio and rendering when hidden.

## Rollback

Revert the merge commit. The change is additive — a precache glob, one pure
module, one nginx include, two tests and one spec — so no data or format
migration is involved.
