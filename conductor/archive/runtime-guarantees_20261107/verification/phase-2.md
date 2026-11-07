# Phase 2 Verification — Production parity

Track: `runtime-guarantees_20261107`
Phase base: `17c107c`
Branch: `feat/runtime-guarantees_20261107`
Covers: FR-4, FR-5, AC-3

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm test` (final tree, before evidence) | 0 | `Test Files 46 passed (46)`, `Tests 855 passed (855)` — seven new tests over Phase 1's 848. |
| `pnpm test` (drift probe 1: one CSP directive changed in the include) | 1 | `Tests 1 failed \| 854 passed (855)`; failure names `Content-Security-Policy` and shows the missing `blob:`. |
| `pnpm test` (drift probe 2: one `include` removed from a location) | 1 | `Tests 1 failed \| 854 passed (855)`; failure names `location = /sw.js`. |
| `pnpm check` (final tree) | 0 | Biome `Checked 171 files in 331ms. No fixes applied.`; `tsc --noEmit` clean; `Test Files 46 passed (46)`, `Tests 855 passed (855)`. |

`pnpm check` ran on committed code (`92bda27`, `98b9af5`) with a clean worktree; only the evidence
file was added afterwards.

## The include as shipped

`nginx-security-headers.conf` (repo root, copied into the image as
`/etc/nginx/conf.d/security-headers.conf`):

```nginx
# Mirror of src/core/security-headers.ts — src/core/nginx-headers.test.ts fails
# if the two disagree. Repeated in every location because a location that sets
# its own Cache-Control would otherwise drop an inherited policy.
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; media-src 'self'; connect-src 'self' blob:; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
```

The CSP string is the value of `CONTENT_SECURITY_POLICY` from
`src/core/security-headers.ts`, verbatim: thirteen directives in the same order, including
`connect-src 'self' blob:`. `headerLines()` renders the same three `Name: value` pairs sorted by
name; the guard compares parsed `name → value` maps, so declaration order in nginx does not matter
while the values must match exactly.

## Include per context

`include /etc/nginx/conf.d/security-headers.conf;` (absolute path, because `include` resolves
against the nginx prefix) is present in:

| Context | Include |
| --- | --- |
| `server` block | yes |
| `location = /sw.js` | yes |
| `location = /index.html` | yes |
| `location = /manifest.webmanifest` | yes |
| `location ~* \.(js\|css\|woff2)$` | yes |
| `location ~* \.(glb\|gltf\|ogg\|mp3\|png\|ico)$` | yes |
| `location /` | yes |

Seven `include` directives: the server block plus all six locations. Each location also declares
its own `add_header Cache-Control`, which is exactly why the policy cannot live only at server
level — nginx replaces inherited headers whenever the inner block declares any.

The hashed-asset location also gained `woff2`: `location ~* \.(js|css|woff2)$`, keeping the
existing `public, max-age=31536000, immutable` value. Vite emits content-hashed font filenames
(`baloo-2-latin-400-normal-D8VfTcZx.woff2`), so they belong with the other immutable assets;
previously they fell through to `location /` with no cache header.

## Dockerfile

Added before the `dist` copy so the include exists at container start:

```dockerfile
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-security-headers.conf /etc/nginx/conf.d/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
```

Without that line nginx fails to start (`open() "/etc/nginx/conf.d/security-headers.conf" failed`).
The guard test catches the missing-file case by name rather than relying on a container run: no
Docker daemon is available in CI, so **this phase did not build or run a container**. The unit test
is the enforcement, not a deployment smoke test.

## The drift guard

`src/core/nginx-headers.test.ts` (Vitest, node environment, no network, no new dependency):

- Reads `nginx.conf` and `nginx-security-headers.conf` from `process.cwd()` (the repo root where
  `pnpm test` runs) with `node:path` and `node:fs`.
- Extracts every `location` block by brace counting over a comment-masked copy of `nginx.conf`,
  preserving offsets, and asserts each block body contains the absolute include directive. It
  also requires at least six locations so an empty parse cannot pass vacuously.
- Removes the location ranges to isolate the server block and asserts the include survives there
  too — this distinguishes a server-level include from location-only ones.
- Asserts at least six `include` directives are present (seven ship).
- Parses each `add_header "..." always;` line into `name → value`, strips the trailing `always`
  flag, and asserts the map equals `SECURITY_HEADERS` exactly: no missing header, no extra header,
  no different CSP string.
- Counts `add_header` mentions and requires the parser to have handled all of them, so a malformed
  line cannot disappear silently.
- Asserts all three headers carry `always`, so error responses are covered too.
- Fails with a message naming the absolute path when the include file is absent.

## Drift demonstrations (AC-3)

Both probes were run on the final committed code, then reverted; the tree was left exactly as
verified (`git status --short` empty before the evidence file was written).

### Direction 1 — include drifts from TypeScript

Changed the include's `connect-src 'self' blob:` to `connect-src 'self'` and ran `pnpm test`:

```
 FAIL  src/core/nginx-headers.test.ts > nginx-security-headers.conf > declares exactly the headers from the TypeScript source
AssertionError: expected { …(3) } to deeply equal { …(3) }

- Expected
+ Received

  {
-   "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; media-src 'self'; connect-src 'self' blob:; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
+   "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; media-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  }

 Test Files  1 failed | 45 passed (46)
      Tests  1 failed | 854 passed (855)
```

One directive missing in the include, and the test fails. The directive was restored.

### Direction 2 — a location loses its include

Removed `include /etc/nginx/conf.d/security-headers.conf;` from `location = /sw.js` and ran
`pnpm test`:

```
 FAIL  src/core/nginx-headers.test.ts > nginx.conf > includes the policy from every location block
AssertionError: expected [ 'location = /sw.js' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "location = /sw.js",
+ ]

 Test Files  1 failed | 45 passed (46)
      Tests  1 failed | 854 passed (855)
```

The failure names the offending location, so the fix is obvious. The include was restored.

## Notes

Commits, in order:

| Commit | Subject |
| --- | --- |
| `92bda27` | `feat(deploy): serve the security policy from one nginx include` (P2.T1) |
| `98b9af5` | `test(core): fail when nginx drifts from the security header source` (P2.T2) |

This evidence file follows in a docs commit.

Observations:

- The brief's prose says "five locations" but its enumerated list names six, and `nginx.conf` has
  six (`= /sw.js`, `= /index.html`, `= /manifest.webmanifest`, the js/css regex, the media regex,
  `location /`). All six are wired, giving seven includes server+locations. The guard asserts
  "every location" plus "at least six include directives", so it satisfies the brief's literal
  minimum and the complete-coverage intent.
- `pnpm check` reports 171 Biome files checked, up from 170 in Phase 1: the new test file. The
  include and nginx files are outside Biome's `includes` filter.
- The Vite config-extension warning printed by every `pnpm test` run is unchanged from Phase 1 and
  accepted there; it is not introduced by this phase.
- No `dist/`, lockfile, or dependency change. No container build (see above).

## Primary verification

Independently run by the primary agent on this branch.

| Check | Result |
| --- | --- |
| `pnpm check` | exit 0 — Biome clean, `tsc --noEmit` clean, **46 files / 855 tests** |
| `nginx-security-headers.conf` vs `SECURITY_HEADERS` | the test compares parsed `add_header` values against `headerLines()`; identical, including directive order and `connect-src 'self' blob:` |
| includes | seven `include /etc/nginx/conf.d/security-headers.conf;` — server block plus all six locations |
| `Dockerfile` | `COPY nginx-security-headers.conf /etc/nginx/conf.d/security-headers.conf` immediately after the site config |
| independent drift demo | primary removed `blob:` from the include, ran `pnpm exec vitest run src/core/nginx-headers.test.ts` → `1 failed | 6 passed` with a deep-equal diff, then restored the file (`git checkout --`), tree clean |

The guard bites from the outside too, not only in the phase's own demonstration.
One judgement recorded rather than silently accepted: `woff2` was added to the
hashed-asset location, so the four precached fonts now get the same immutable
cache as the JS instead of falling through to `location /` with no cache header —
the font work of Phase 1 needed it to be coherent. No container build was run
(there is no Docker daemon here, and none in CI); the unit test is the enforcement,
as the phase states.
