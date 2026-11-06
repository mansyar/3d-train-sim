# Runtime Guarantees — Implementation Plan

> **Branch:** `feat/runtime-guarantees_20261107`
> **Base:** `main` @ `22870c6cc75c49640d03c04338d7cab7fce0a47a`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Policy in code, font in precache

- **Goal:** The preview server returns the full security policy on every
  response, `dist/sw.js` precaches all four `woff2` subsets and no `woff`, and
  two guards (external URLs, unsafe headers) are live and green.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-9, NFR-1, NFR-2, NFR-3, NFR-5, AC-1, AC-7
- **Touches:** `src/core/security-headers.ts`, `src/core/security-headers.test.ts`,
  `src/core/no-external-urls.test.ts`, `vite.config.ts`
- **Verification:** `pnpm build`
- **Status:** in_progress

- [x] **P1.T1: Export the single header source of truth** — covers: FR-2
  - [x] **P1.T1.1: Define the CSP directive list and the two extra headers in one
    module, with a `headerLines()` helper that renders the exact
    `Name: value` lines the nginx include must mirror**
  - [x] **P1.T1.2: Unit-test the exported shape: every directive present, no
    `'unsafe-*'` token anywhere, headers are exactly `nosniff` and
    `no-referrer`, and rendering is deterministic**
- [x] **P1.T2: Apply the headers from a Vite plugin** — covers: FR-3, NFR-3
  - [x] **P1.T2.1: Add `configureServer` and `configurePreviewServer` hooks that
    set every header on each response, with an exported `applySecurityHeaders`
    seam so the behaviour is unit-testable without a running server**
  - [x] **P1.T2.2: Confirm `pnpm dev` still boots and the HMR client still
    connects with the policy active; record the observation in the evidence**
- [x] **P1.T3: Precache the bundled font** — covers: FR-1, NFR-2
  - [x] **P1.T3.1: Add `woff2` to `workbox.globPatterns` and leave `woff` out**
  - [x] **P1.T3.2: Build and record in evidence: the four font files listed in
    `dist/sw.js`, that no `woff` file appears, and the manifest size delta
    against the 10,544 KiB baseline**
- [x] **P1.T4: Ban external URLs in shipped sources** — covers: FR-9
  - [x] **P1.T4.1: Add a unit test that walks `src/**`, skips `*.test.ts`, and
    fails on any `http://` or `https://` literal, with a clear failure message
    naming the file**
  - [x] **P1.T4.2: Prove the guard can fail by temporarily adding a literal,
    observing the failure, and removing it again**

**Result:** verified
**Checkpoint:** 2f855e0
**Evidence:** conductor/tracks/runtime-guarantees_20261107/verification/phase-1.md
**Deviations:** the seam is a module-local `applyHeaders` factory with a dev/preview split rather than one exported `applySecurityHeaders`; HMR was not observed directly (no browser probe was available to the phase), so NFR-3 is evidenced by the tablet smoke suite passing 20/20 against the dev server with the policy active. The shipped policy carries `connect-src 'self' blob:` and the dev server relaxes `style-src` only, both discovered by that suite after the first delivery — see the evidence rework section.

## Phase 2: Production parity

- **Goal:** nginx sends the identical policy from one include file on the server
  block and on all four cache/media locations, and a test fails if either side
  drifts.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, AC-3
- **Touches:** `nginx.conf`, `nginx-security-headers.conf`,
  `src/core/nginx-headers.test.ts`
- **Verification:** `pnpm check`
- **Status:** pending

- [ ] **P2.T1: Move the policy into an include and pull it into every context**
  — covers: FR-4
  - [ ] **P2.T1.1: Create `nginx-security-headers.conf` holding exactly the
    directives from `headerLines()`**
  - [ ] **P2.T1.2: `include` it in the server block and in each of the four
    `location` blocks (service worker, index, manifest, hashed assets, media),
    because a location that declares its own `add_header` drops inherited ones**
- [ ] **P2.T2: Guard the copy against drift** — covers: FR-5
  - [ ] **P2.T2.1: Parse `nginx.conf` and assert every `location` includes the
    header file and the server block does too**
  - [ ] **P2.T2.2: Assert every line from `headerLines()` appears in the include,
    and that the include declares nothing the module does not**

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/runtime-guarantees_20261107/verification/phase-2.md
-->

## Phase 3: Browser proof

- **Goal:** Against the preview build, headers are present on every asset class,
  the app boots, builds and rides with the network off, no request leaves the
  origin, and an injected inline script does not run.
- **Depends on:** Phase 1, Phase 2
- **Covers:** FR-6, FR-7, FR-8, AC-2, AC-4, AC-5, AC-6
- **Touches:** `e2e/runtime-guarantees.spec.ts`
- **Verification:** `pnpm exec playwright test e2e/runtime-guarantees.spec.ts`
- **Status:** pending

- [ ] **P3.T1: Assert real headers on every asset class** — covers: AC-2
  - [ ] **P3.T1.1: Against the preview server on 5198, check `index.html`, a
    hashed JS chunk taken from the page, a `glb` and a `woff2` for the full CSP
    and both extra headers**
- [ ] **P3.T2: Prove the meadow boots, builds and rides offline** — covers: FR-6
  - [ ] **P3.T2.1: Warm the worker until it controls the page, confirm an update
    probe resolves, then disable the network and reload**
  - [ ] **P3.T2.2: Assert the starter pieces, place one toy through the drawer,
    press ride, and assert the train moves with no console errors**
- [ ] **P3.T3: Prove nothing leaves the device** — covers: FR-7
  - [ ] **P3.T3.1: Record every request during boot, placement and ride and fail
    on any URL whose origin is not the app's own (blob/data/devtools allowed)**
- [ ] **P3.T4: Prove the policy is live** — covers: FR-8
  - [ ] **P3.T4.1: Inject an inline script that would set a global, assert the
    global never appears, and assert the app's own bundle did run**

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/runtime-guarantees_20261107/verification/phase-3.md
-->

## Phase 4: Documentation

- **Goal:** The tech stack and the roadmap record what actually ships, including
  the one deliberate deviation from the roadmap wording.
- **Depends on:** Phase 3
- **Covers:** FR-10, AC-8
- **Touches:** `conductor/tech-stack.md`, `conductor/product.md`
- **Verification:** `pnpm check`
- **Status:** pending

- [ ] **P4.T1: Record the policy in the tech stack** — covers: FR-10
  - [ ] **P4.T1.1: Document the single header module, the Vite plugin, the nginx
    include, the `woff2` precache and the two guards, with the date**
- [ ] **P4.T2: Record the deviation on the roadmap** — covers: FR-10
  - [ ] **P4.T2.1: Note in the roadmap row why `connect-src 'self'` replaced
    `'none'` (Howler XHR) and that a request assertion now enforces the promise**

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/runtime-guarantees_20261107/verification/phase-4.md
-->
