# Review — Runtime Guarantees

| | |
| --- | --- |
| **Track** | `runtime-guarantees_20261107` |
| **Branch** | `feat/runtime-guarantees_20261107` |
| **Range** | `22870c6..d4d814e` (round 1), `d4d814e..ec271d3` (round 2) |
| **Rounds** | 2 |
| **Verdict** | **PASS WITH FINDINGS** |

## Summary

The track does what it set out to do. The policy lives in one dependency-free
module and reaches the browser through three layers (Vite dev/preview plugin,
nginx include, and a unit test that fails if the copies diverge), the four
`woff2` subsets are in the precache and the legacy `woff` is not, and the offline
route is proven against the built app with the network actually disabled: the
reloaded document is served by the service worker (`workerStart > 0`), a bridge
is placed, and the ride starts and stops without a console error.

The one Medium finding is a witness gap, not a defect: every header assertion
targets the preview server, so the dev-server half of FR-3 is unenforced and the
dev-only `style-src` relaxation — the single place the policy widens — has no
automated guard. Four Low findings are test and documentation precision:
a tautological assertion inside the CSP control, `headerLines()` having no
consumer while a doc claims it does, a privacy guard scoped to `src/**` only, and
"the train moves" being asserted through a label flip rather than motion.

Nothing in the diff weakens the app's privacy story: no dependency was added, no
external URL literal exists, and `connect-src` admits `blob:` (same-device memory
for GLB textures and Howler's XHR) without admitting an origin.

## Verification

| Check | Result |
| --- | --- |
| `pnpm check` | pass — Biome 172 files, `tsc --noEmit` clean, 46 files / 855 tests |
| `pnpm test:coverage` | pass — 97.35% statements / 91.06% branches / 98.10% functions / 99.44% lines (`src/core` + `src/state`) |
| `pnpm build` | pass — 178 precache entries, 10,639.88 KiB, four `woff2`, zero `woff` |
| `pnpm exec playwright test e2e/runtime-guarantees.spec.ts` | pass — 8 (tablet + phone) |
| `pnpm exec playwright test` | pass — 191 in 18.0 min, no retries |

## Requirements coverage

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T3 | `phase-1.md`; `dist/sw.js` has four `.woff2`, zero `.woff`; spec throws if no `.woff2` in the manifest | covered |
| FR-2 | P1.T1 | `security-headers.test.ts` (13 directives, exact order, no unsafe tokens) | covered |
| FR-3 | P1.T2 | preview headers in `runtime-guarantees.spec.ts`; **dev server never asserted** | partial |
| FR-4 | P2.T1 | `nginx-headers.test.ts`; seven includes in `nginx.conf` | covered |
| FR-5 | P2.T2 | `nginx-headers.test.ts`; drift demonstrated both directions in `phase-2.md` | covered |
| FR-6 | P3.T2 | offline boot/place/ride spec (`workerStart > 0`, fresh-document marker) | covered |
| FR-7 | P3.T3 | zero foreign requests observed; synthetic negative control; CSP refusal captured | covered |
| FR-8 | P3.T4 | inline script refused, `__cspProbe` stays undefined | covered |
| FR-9 | P1.T4 | `no-external-urls.test.ts`; anti-vacuity check; failure demonstrated | covered |
| FR-10 | P4.T1–T2 | `tech-stack.md` security row + deployment note; roadmap rows | covered |
| NFR-1 | P1.T1 | no `package.json` or lockfile change | covered |
| NFR-2 | P1.T3 | +95.88 KiB against the 10,544 KiB baseline (limit 120 KB) | covered |
| NFR-3 | P1.T2 | dev boot observed; tablet smoke 20/20 on 5199 — but the header application itself is unasserted | partial |
| NFR-4 | all | 855 unit tests, 191 e2e, none removed | covered |
| NFR-5 | P1.T1 | header value ~330 B, no layout or gameplay change | covered |
| AC-1…AC-8 | per phase | see `verification/integrated.md`; AC-3 drift demo re-run by the primary | covered |

## Findings

### F1 — Medium — the dev-server policy is never asserted

- **File:** `e2e/runtime-guarantees.spec.ts:130-162`
- **What:** every header assertion navigates to the preview server. Nothing checks
  that `configureServer` in `vite.config.ts` runs, so deleting the dev hook keeps
  every gate green.
- **Why:** FR-3 is a must for dev *and* preview, and the dev-only `style-src`
  relaxation is the single place the policy widens. An accidental extra relaxation
  would ship unnoticed.
- **Fix:** request `http://localhost:5199/` in the same spec and compare its CSP to
  `securityHeadersFor({ dev: true })`, asserting it differs from the strict policy
  in exactly one directive.
- **Requirement:** FR-3 / NFR-3
- **Test gap:** dev-server header assertions.

### F2 — Low — the CSP control contains a tautology

- **File:** `e2e/runtime-guarantees.spec.ts:242-245`
- **What:** `refusals` only collects messages that already contain "Content
  Security Policy", so `toContain('Content Security Policy')` can never fail; the
  poll also accepts any CSP message on the page.
- **Why:** AC-6 should prove *the injected script* was refused, not that some
  refusal exists.
- **Fix:** record every console message, snapshot the count before injection, and
  require a new message that names `script-src`.
- **Requirement:** FR-8

### F3 — Low — `headerLines()` has no consumer, and a doc says it does

- **File:** `src/core/nginx-headers.test.ts:114`, `conductor/tech-stack.md:269-271`
- **What:** the nginx guard compares parsed `name → value` entries to
  `SECURITY_HEADERS`; `headerLines()` is only used by its own unit test, while the
  tech stack and plan P2.T2.2 claim the include is checked against the rendered
  lines.
- **Why:** the documented contract is unenforced, so the doc and the guard can drift.
- **Fix:** make the guard assert every `headerLines()` entry lands in the include
  (keeping the set-equality check for extras).
- **Requirement:** —

### F4 — Low — the privacy guard only walks `src/**/*.ts`

- **File:** `src/core/no-external-urls.test.ts:15-34`
- **What:** `index.html`, `src/style.css` and `public/**` are unscanned. All are
  clean today, and FR-9 says `src/**`, so the requirement is met — but the entry
  HTML and the stylesheet are exactly where a `preconnect` or `@import url(...)`
  would appear.
- **Why:** the guard is presented as the enforcement of "nothing leaves the
  device".
- **Fix:** extend the walk to `index.html` and `src/**/*.css`; keep `public/**`
  out on purpose, because the vendored `CREDITS.md` and `License.txt` files must
  carry attribution URLs, and say so in the guard's comment.
- **Requirement:** FR-9

### F5 — Low — the ride assertion is a label flip, not motion

- **File:** `e2e/runtime-guarantees.spec.ts:106-113`
- **What:** `rideAndStop` proves the toggle's `aria-label` changes and changes
  back; a stalled render loop with the ride flag set would still pass.
- **Why:** a moving train is the user-visible half of the offline promise.
- **Fix:** screenshot the canvas when the ride starts and poll until it differs,
  proving frames advance while offline. Keep the label flip as the state check.
- **Requirement:** FR-6

## Overrides

None. No Critical or High findings.

## Plan compliance

All phases are `verified` with checkpoints `2f855e0`, `1bb7bf5`, `2971f18`,
`f610a3b`, and the review-fix checkpoints `ea626b2` (R1) and `ec271d3` (R2).
Recorded deviations: `connect-src 'self' blob:`, the dev-only style relaxation,
the Chromium offline engine, the AC-5 rewording, Phase 4 being written by the
primary (the phase subagent is denied writes under `conductor/`), and R1/R2
being test-only fixes applied by the primary.

## Out of scope

Real iPad/Android device verification, Docker container startup, and npm dependency
auditing (`deps-guardrails_20261107`).

## Debt

- `public/**` remains outside the privacy guard by design, because the vendored
  `CREDITS.md` and `License.txt` files must name upstream URLs. Recorded in the
  test's doc comment (F4, round 1).
- HMR connectivity is not asserted automatically: the dev server is proven to
  serve the policy and the tablet smoke suite (20/20) drives the real dev server,
  but no spec opens a websocket. Manual-device layer (NFR-3).

## Doc sync

`synced` — `conductor/tech-stack.md` records the module, the three layers, the
`blob:` reason, the `woff2` precache, the guard test and the Chromium note;
`conductor/product.md` records the shipped Phase 0 rows and the deviation.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 4 | 5 |
| 2 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 1 |

## Round 2 findings and resolution

| Finding | Severity | Resolution |
| --- | --- | --- |
| The canvas poll is satisfied by ambient animation (the barge bobs, the critters breathe), so it proves a live loop, not the train's motion | Low | R2 accepted the reviewer's first option and narrowed the claim: the helper's doc comment and poll message now say "frames should advance while the ride is on" and name `src/scene/ride-motion.test.ts` as the displacement proof. Chasing a pixel-difference baseline was rejected as noise-prone without an image library, and the assertion's offline value — catching a boot that paints once and freezes — is unchanged |

Round-2 confirmation of the round-1 fixes: the dev policy is asserted verbatim
plus a one-directive relaxation diff (F1), the refusal test only counts messages
after the injection and requires `script-src` (F2), `headerLines()` values are
compared against the parsed include (F3), the privacy walk really scans
`index.html` and `src/**/*.css` with `public/**` documented as exempt (F4), and
the ride witness was narrowed rather than overclaimed (F5).

