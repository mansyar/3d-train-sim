# Phase 3 — Browser proof

Track: `runtime-guarantees_20261107`
Branch: `feat/runtime-guarantees_20261107`
Phase base: `6358247d982050dd32a778c0ce8ee8a733d7ec0f`
Spec under proof: `e2e/runtime-guarantees.spec.ts` (the only source file added)

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm exec playwright test e2e/runtime-guarantees.spec.ts` | 0 | 8 passed (1.2 m), 2 workers (four tests × `tablet` + `phone`) |
| `pnpm check` | 0 | biome 172 files clean, `tsc --noEmit` clean, vitest 46 files / 855 tests passed |

`pnpm check` was run because the new spec is inside the `tsconfig` and `biome`
include sets, so lint and type errors in it would break the repository gates.

Per-test timings from the green run:

| Project | Test | Time |
| --- | --- | --- |
| tablet | the preview server sends the full policy on every asset class | 0.8 s |
| phone | the preview server sends the full policy on every asset class | 0.8 s |
| tablet | the meadow boots, places a toy and rides with the network off | 34.1 s |
| phone | the meadow boots, places a toy and rides with the network off | 18.0 s |
| tablet | nothing leaves the app origin during boot, placement and ride | 28.9 s |
| phone | nothing leaves the app origin during boot, placement and ride | 19.9 s |
| tablet | an injected inline script is refused while the app bundle runs | 2.2 s |
| phone | an injected inline script is refused while the app bundle runs | 1.9 s |

The tests navigate to `http://localhost:5198/` explicitly and keep the `tablet`
(iPad Mini) and `phone` (iPhone 13) device profiles — portrait viewport, touch,
device pixel ratio — because the built bundle has no dev handles
(`__tinyTracksWorld`, `__tinyTracksScene`, `__tinyTracksReady` are
`import.meta.env.DEV` only). Every assertion is DOM-visible.

## Acceptance criteria

| AC | Proving test | Evidence |
| --- | --- | --- |
| AC-2 headers on every asset class | `the preview server sends the full policy on every asset class` | Document response, `/sw.js`, one hashed `assets/index-*.js`, one `.glb` and one `.woff2` pulled from the `/sw.js` precache manifest each return 200 with `Content-Security-Policy` exactly equal to the imported `CONTENT_SECURITY_POLICY`, plus `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`. |
| AC-4 offline tablet + phone | `the meadow boots, places a toy and rides with the network off` | Worker installed and controlling, `context.setOffline(true)`, reload yields a fresh document (`workerStart > 0`, so the worker served it), `.scene-canvas`, `.toybox-rail` and `v<version>` visible, bridge dragged from the drawer commits (`.undo-toggle` appears), `.ride-toggle` label flips `Ride the train` → `Stop the train` → `Ride the train`, zero console errors and page errors. |
| AC-5 no foreign-origin request | `nothing leaves the app origin during boot, placement and ride` | `page.on('request')` installed before the first navigation; after the offline boot, placement and ride the non-origin list is **empty** on both profiles (only `blob:` / `data:` schemes are tolerated, and none appeared). |
| AC-6 CSP negative control | `an injected inline script is refused while the app bundle runs` | The meadow mounts from the same-origin bundle, then an injected `<script>` with `textContent = 'window.__cspProbe = 1'` never sets the flag, and the browser reports the refusal below. |

## CSP refusal observed

Chromium, on both profiles:

> Executing inline script violates the following Content Security Policy directive 'script-src 'self''. Either the 'unsafe-inline' keyword, a hash ('sha256-m0Y2XRQCtebPSeronZgu9tSrFdLdSssU9Lwa0E0dp/U='), or a nonce ('nonce-...') is required to enable inline execution. The action has been blocked.

Playwright's WebKit reports the same refusal in its own wording:

> Refused to execute a script because its hash, its nonce, or 'unsafe-inline' does not appear in the script-src directive of the Content Security Policy.

## Off-origin requests

```
foreign requests: (none)   [tablet]
foreign requests: (none)   [phone]
```

## Cache semantics on the preview server

`/index.html`, `/sw.js` and the hashed `assets/index-*.js` are served with
`Cache-Control: no-cache` and keep their security headers. `vite preview` runs
sirv in etag mode, which rewrites `Cache-Control` for every static file;
the `public, max-age=31536000, immutable` rule is nginx-only and is guarded by
`src/core/nginx-headers.test.ts`, not by this browser spec. The spec asserts what
preview actually must guarantee (headers intact, cache rule not corrupted), not
the nginx value preview cannot emit.

## Engine note (deviation)

The offline round trip runs on **Chromium** for both device projects, via
`test.use({ browserName: 'chromium' })`, because Playwright's WebKit build cannot
emulate a dead network for a service-worker page:

- `context.setOffline(true)` followed by `page.reload()` fails with
  `WebKit encountered an internal error`; the document is never replaced.
- `context.setOffline(true)` + `page.goto('/')` / `location.replace('/index.html')`
  loads no fresh document, and a worker-served fetch rejects with
  `TypeError: Load failed` — the worker is unavailable while offline.
- The route-based fallback (`context.route` aborting non-navigation same-origin
  requests) does boot a fresh document and passes placement and ride, but the
  worker-cached GLB textures raise five
  `Fetch API cannot load blob: … due to access control checks.` page errors and
  the WebKit process closes on the second ride click. Those page errors are the
  documented WebKit GLTFLoader blob noise, which `e2e/helpers.ts` allowlists for
  console errors only; it is a Playwright/WebKit interception artefact, not an
  app defect.
- Chromium handles `setOffline` cleanly: the same tablet and phone profiles boot
  from the precache, place and ride with zero console errors and zero page
  errors.

No production or preview code was changed for this; the headers and CSP proofs
remain server-level facts and are engine-independent.

## Foreign-request negative control (AC-5)

AC-5 has two halves: the spec passes with no foreign-origin request, **and** the
assertion is shown to fail when one is introduced. The first half is the green
run above. This section records the second half as a temporary probe in the
style of Phase 1's `P1.T4.2` (add, observe, revert). No filter branch and no
assertion was changed at any point.

### Probe A — a real foreign `fetch` (the brief's probe)

Temporarily inserted inside `nothing leaves the app origin during boot,
placement and ride`, immediately after `warmWorker(page)` (a console listener
was attached only to capture what the browser reports):

```ts
  await warmWorker(page);
  page.on('console', (message) => console.log('PROBE-CONSOLE:', message.text()));
  await page.evaluate(() =>
    fetch('https://example.com/runtime-guarantees-probe').catch(() => {}),
  );
```

Command:

```
pnpm exec playwright test e2e/runtime-guarantees.spec.ts -g "nothing leaves the app origin"
```

Result: **2 passed (39.2 s)** — the assertion stayed green with a deliberate
foreign request in place. Captured output, verbatim (both profiles):

```
PROBE-CONSOLE: Connecting to 'https://example.com/runtime-guarantees-probe' violates the following Content Security Policy directive: "connect-src 'self' blob:". The action has been blocked.
PROBE-CONSOLE: Fetch API cannot load https://example.com/runtime-guarantees-probe. Refused to connect because it violates the document's Content Security Policy.
PROBE-CONSOLE: THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.
PROBE-CONSOLE: Connecting to 'https://example.com/runtime-guarantees-probe' violates the following Content Security Policy directive: "connect-src 'self' blob:". The action has been blocked.
PROBE-CONSOLE: Fetch API cannot load https://example.com/runtime-guarantees-probe. Refused to connect because it violates the document's Content Security Policy.
PROBE-CONSOLE: THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.
  ok 2 [phone] › e2e\runtime-guarantees.spec.ts:192:1 › nothing leaves the app origin during boot, placement and ride (19.5s)
  ok 1 [tablet] › e2e\runtime-guarantees.spec.ts:192:1 › nothing leaves the app origin during boot, placement and ride (32.5s)

  2 passed (39.2s)
```

**Interpretation, stated as what it is.** The request never appears in
`page.on('request')`. `connect-src 'self' blob:` is enforced by Chromium in the
renderer *before* a network request is issued, so Playwright's request event
never fires and `requestedUrls` stays empty. Probe A is therefore a valid
negative control for **FR-7's enforcement mechanism** — the policy refuses a
foreign origin, as the two console messages show — and for the policy's live
presence on the served document. It is **not** proof that this spec's filter
fires: with a real foreign fetch present the spec is still green, and this probe
cannot produce the red half of AC-5.

### Probe B — the assertion's failure path

Because Probe A cannot reach the filter, the assertion's own failure path was
exercised separately, still as a temporary probe: one synthetic entry pushed
into the collected list before the filter ran.

```ts
  requestedUrls.push('https://example.com/runtime-guarantees-probe');
  const foreign = requestedUrls.filter((url) => {
```

Same command; result **2 failed**, both profiles, with the list naming the URL:

```
    Error: requests that left the origin: https://example.com/runtime-guarantees-probe

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 3

    - Array []
    + Array [
    +   "https://example.com/runtime-guarantees-probe",
    + ]

      213 |     return parsed.origin !== PREVIEW_ORIGIN;
      214 |   });
    > 215 |   expect(foreign, `requests that left the origin: ${foreign.join(' | ')}`).toEqual([]);
          |                                                                            ^
```

**Interpretation.** The assertion is not vacuous: when a foreign URL is in the
observed list, it fails and names the URL. But the entry was synthetic. Under
the shipped policy a real `http(s)` request is refused by CSP before the request
event can record it, so no in-scope probe can put a genuine foreign request into
the list. Demonstrating that would require relaxing `connect-src` or removing
the header for one run — outside this track's scope and contrary to FR-2.

### What AC-5 can and cannot claim

- **Proven:** the spec passes with no foreign-origin request (green run above);
  the assertion fails and names the URL when a foreign URL reaches the list;
  the CSP refuses a real foreign `fetch` with `connect-src 'self' blob:` on both
  profiles.
- **Not proven:** that the filter has observed and rejected a *real* foreign
  network request. The policy stops such a request earlier than the filter, so
  the green assertion rests on the CSP layer plus the assertion's verified
  failure path, not on a live leak being caught.

### Restored run

Both probes reverted; `git diff -- e2e/runtime-guarantees.spec.ts` is empty and
`git status --porcelain` lists this evidence file only.

```
pnpm exec playwright test e2e/runtime-guarantees.spec.ts

  ok 1 [phone] › … the preview server sends the full policy on every asset class (780ms)
  ok 2 [tablet] › … the preview server sends the full policy on every asset class (781ms)
  ok 3 [phone] › … the meadow boots, places a toy and rides with the network off (18.5s)
  ok 4 [tablet] › … the meadow boots, places a toy and rides with the network off (36.1s)
  ok 5 [phone] › … nothing leaves the app origin during boot, placement and ride (20.6s)
  ok 7 [phone] › … an injected inline script is refused while the app bundle runs (2.0s)
  ok 6 [tablet] › … nothing leaves the app origin during boot, placement and ride (31.7s)
  ok 8 [tablet] › … an injected inline script is refused while the app bundle runs (2.2s)

  8 passed (1.3m)
```

## Notes

- Negative-control probes: `test(e2e)` spec edited twice and reverted; the only
  committed change from this rework is this evidence section.
- Task commits: `cbbaacd` — `test(e2e): prove preview headers, offline round trip and CSP refusal`.
- Evidence commit follows this file.
- `playwright.config.ts`, `vite.config.ts`, `.env` and all Conductor state were
  left untouched.
- The single allowlist site in `e2e/helpers.ts` was reused unchanged; the spec
  adds no new console-noise exception.

## Primary verification

Independently run by the primary agent on this branch.

| Check | Result |
| --- | --- |
| `pnpm exec playwright test e2e/runtime-guarantees.spec.ts` | **8 passed** (1.5 min), tablet + phone profiles, no retries |
| `pnpm check` | exit 0 — Biome 172 files, `tsc --noEmit` clean, 46 files / 855 tests |
| diff scope `6358247..HEAD` | `e2e/runtime-guarantees.spec.ts` + this evidence only |
| offline proof | `workerStart > 0` on the reloaded navigation plus an undefined pre-reload marker: the document really came from the service worker, not the network |
| cache semantics | the spec states plainly that `vite preview` answers `no-cache` for everything and that the immutable rule is nginx-only, guarded by `src/core/nginx-headers.test.ts` — no test pretends to prove nginx behaviour that preview cannot serve |

Two deviations the primary accepted and recorded in `spec.md` instead of leaving
as silent gaps:

1. **Chromium for the offline half.** Playwright's WebKit build cannot take a
   service-worker page offline (`WebKit encountered an internal error` on the
   navigation, worker fetches reject with `Load failed`); its CSP refusal was
   still observed during exploration. AC-4 now names the engine, and the real
   iPad path stays a manual-device check.
2. **AC-5 rewording.** A real foreign `fetch` never reaches `page.on('request')`
   because `connect-src 'self' blob:` refuses it in the renderer, so "the
   assertion fails when a foreign request is introduced" was unreachable without
   relaxing the policy. The spec now requires three things it can actually prove:
   zero foreign requests observed, the filter firing on a synthetic entry, and
   the browser's own refusal of a real foreign fetch.
