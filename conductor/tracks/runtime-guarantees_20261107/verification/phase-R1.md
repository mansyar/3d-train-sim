# Phase R1 — Review Fixes — Verification

Track: `runtime-guarantees_20261107`
Review record: `review.md` round 1 (1 Medium, 4 Low)
Performed by: primary agent

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm check` | 0 | Biome 172 files, `tsc --noEmit` clean, 46 files / **856 tests** |
| `pnpm exec playwright test e2e/runtime-guarantees.spec.ts` | 0 | **10 passed** (5 tests × tablet + phone) in 1.9 min |

## Findings closed

### F1 (Medium) — the dev-server policy was never asserted

`e2e/runtime-guarantees.spec.ts` gained *the dev server sends the same policy,
with only style-src relaxed*: it requests `http://localhost:5199/` (the dev server
Playwright already starts), compares the CSP to
`securityHeadersFor({ dev: true })['Content-Security-Policy']`, asserts nosniff and
no-referrer, and then proves the relaxation is exactly one directive wide by
diffing the relaxed and strict directive lists token by token.

Negative control: switching the dev middleware to `securityHeadersFor({ dev: false })`
in `vite.config.ts` made the test fail (`1 failed`, tablet)
— the witness is not vacuous. The file was restored with `git checkout --`.

### F2 (Low) — tautological CSP assertion

The refusal test now records every console message, snapshots the count
immediately before injecting the inline script, and only considers messages
emitted after that point. It requires one that names `script-src`, keeps
`__cspProbe` undefined as the primary proof, and annotates the exact text.

### F3 (Low) — `headerLines()` had no consumer

`src/core/nginx-headers.test.ts` gained *carries every line `headerLines()`
renders*: each rendered `Name: value` line is split and compared to the parsed
include, while the existing set-equality test still catches extras. The documented
contract now has a witness.

### F4 (Low) — the privacy guard only walked `src/**/*.ts`

`src/core/no-external-urls.test.ts` now scans `src/**/*.ts` (tests excluded),
`src/**/*.css`, and the root `index.html`, and the anti-vacuity test asserts all
three classes are present. `public/**` stays out on purpose and the doc comment
says why: the vendored kits ship `License.txt` and `CREDITS.md` whose attribution
text must name upstream URLs. `conductor/tech-stack.md` records the same boundary.

### F5 (Low) — the ride assertion was a label flip

`rideAndStop` screenshots `.scene-canvas` before pressing ▶ and polls (15 s)
until a later screenshot differs, then stops and re-checks the label. A stalled
render loop can no longer pass, and the spec needs no fixed sleep. Precisely: this
proves frames advance during an offline ride (camera chase and steam both depend
on the loop), not the train's exact displacement.

## Notes

- The dev-server assertion reads `securityHeadersFor` from app source into the
  spec; the module is dependency-free by design, so the import costs nothing.
- No product code changed. The only `src/` edits are two test files.
- The 15 s motion poll is a ceiling, not a wait: the poll resolves on the first
  differing frame.
