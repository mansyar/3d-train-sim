# Phase R2 verification — renderer decomposition (second review round)

Track: `renderer-decomposition_20261108`
Branch: `refactor/renderer-decomposition_20261108`
Phase base: `3d78e13` (Phase R1 checkpoint)
Performed by: primary agent (the phase was five small fixes; no subagent was launched)
Date: 2026-11-08

## Goal

Close the five Low findings from review round 2: state what the hook latch actually does, dispose in
strict reverse construction order, let the crossings allowlist name the template it reads, give every
document one canonical line count, and measure the gzip delta AC-7 asks for instead of a raw byte
count.

## Commands

| Check | Command | Exit | Result |
|---|---|---|---|
| Static + unit | `pnpm check` | 0 | Biome clean, `tsc --noEmit` clean, 50 files / **883 tests** in 4.2 s |
| Build (HEAD) | `pnpm exec vite build --outDir <temp>` | 0 | 178 precache entries, 10,641.84 KiB; emitted JS gzips to 218,899 B |
| Build (base `f880530`) | same, in a throwaway worktree | 0 | 178 precache entries, 10,639.92 KiB; emitted JS gzips to 218,322 B |
| E2E (full) | `pnpm exec playwright test` | see below | see "Full suite" |
## Findings

### F7 — the latch drops, it does not defer

`src/scene/track-renderer.ts` keeps the `hooksReady` guard, and its comment now says what the code
does rather than what would be nice: the latch is a crash guard for a hypothetical synchronous
reconcile, the edge-triggered hooks (piece/scenery templates, model added) would be dropped rather
than replayed in that case, and buffering is not worth the machinery while the loaders are
asynchronous. The phase-R1 evidence already said this; the code now agrees with it.

The comment was trimmed to keep the file inside the 200-line budget: 195 lines, five under.

### F8 — dispose runs in strict reverse order

Construction order is placement (`track-renderer.ts:114`), ambience (`:147`), ghost (`:151`), picking
(`:155`), crossings (`:157`). `picking` holds no scene state and exposes no `dispose`, so the strict
reverse for the modules that do is crossings → ghost → ambience → placement. That is now the order,
and the comment names it.

### F9 — the crossings allowlist names the template

`src/core/import-graph.test.ts` said the crossings module reads "the live rendered/tracked maps".
It also reads `placement.templates.get('crossing-gate')` at `track-crossings.ts:333` for the snow
cap. The reason string now says so.

### F10 — one canonical count

The plan, the phase-6 evidence and the integrated record carried three different renderer counts
(158, 167, 193) because different counters and different moments were mixed. The budget test in
`src/core/import-graph.test.ts` is now the only authority; every document quotes it and says which
checkpoint it belongs to. The R1 evidence now records that its five working commits were squashed
into `3d78e13` and are not reachable SHAs.

Canonical counts at this checkpoint (`pnpm check`, budget test metric):

| Module | Lines | Budget |
|---|---:|---|
| `src/scene/track-renderer.ts` | 195 | ≤ 200 |
| `src/scene/track-catalog.ts` | 199 | ≤ 400 |
| `src/scene/track-placement.ts` | 394 | ≤ 400 |
| `src/scene/track-ghost.ts` | 176 | ≤ 400 |
| `src/scene/track-picking.ts` | 119 | ≤ 400 |
| `src/scene/track-crossings.ts` | 400 | ≤ 400 |
| `src/scene/track-ambience.ts` | 221 | ≤ 400 |

### F11 — the gzip delta, measured

AC-7 asks for the same precache entry count and a gzip delta of at most 2 KB. The record had the raw
precache figure only. Both commits were built (the base in a throwaway worktree at `f880530`, removed
afterwards) and every emitted `.js` was gzipped at level 9:

| Build | `assets/index-*.js` | `workbox-window` | `sw.js` | `workbox-*.js` | Total |
|---|---:|---:|---:|---:|---:|
| base `f880530` | 208,716 B | 2,199 B | 2,216 B | 5,191 B | **218,322 B** |
| HEAD | 209,297 B | 2,199 B | 2,212 B | 5,191 B | **218,899 B** |

Delta: **+577 B = 0.56 KiB**, comfortably inside the 2 KB budget. Precache entries are 178 in both
builds; the raw precache grew by 1.92 KiB because the split adds module boundaries that gzip
compresses away.

## Acceptance criteria touched

| Criterion | Evidence |
|---|---|
| NFR-1 | gzip delta +0.56 KiB against the 2 KB ceiling (table above) |
| AC-1 | budget test green; every module inside its ceiling, renderer five lines under |
| AC-7 | 178 precache entries in both builds; gzip delta measured, not inferred |
| F7–F10 | the four text/order fixes above, each with the number or wording it corrects |

## Deviations

- The phase was executed by the primary agent. The five findings are comments, a call order and
  document figures; there is no behaviour to delegate. No subagent transcript exists for R2.
- The gzip baseline needed a build of `f880530`; it was done in a temporary worktree that was removed
  afterwards (`git worktree prune` leaves no entry behind).

## Full suite

`pnpm exec playwright test` after these fixes: **193 passed** in 16.9 minutes (tablet, phone and the
`prod` project), no retries, no page crashes — the same spec count as before the track, which is what
AC-6 asks for. The only console noise was the pre-existing `PCFSoftShadowMap` deprecation warning.

## Notes

- No product code changed behaviour: one comment block, one dispose order (teardown only), one
  allowlist string, and documents.
- One earlier suite was started before these edits and finished 189 passed / 4 tablet failures; it is
  not evidence for anything, because the tree changed underneath it (HMR reloads mid-run). The run
  above is the clean one, started after the fixes landed.
