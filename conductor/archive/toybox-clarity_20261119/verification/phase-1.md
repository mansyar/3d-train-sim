# Phase 1 Verification — Paged drawer model and geometry-derived piece icons

- Track: `toybox-clarity_20261119` — Toybox Clarity and Outside-Drag Removal
- Phase: 1 — Paged drawer model and geometry-derived piece icons
- Date: 2026-11-19
- Branch: `feat/toybox-clarity_20261119`
- Base commit: `25dc3b08ae888bd99c7c7cfc69bf278541e044c5`
- Head commit: `78ce81a41b3f4c0aea7f6502b8ef22ecf7730961`
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
| ----- | ------- | ---- | ------- |
| Generator (write) | `node scripts/generate-piece-icons.mjs` | 0 | `wrote src/ui/generated-piece-icons.ts: 19 PieceType silhouettes` — one static 48×48 silhouette per `PieceType`, derived from the shipped GLBs. |
| Generator (check) | `node scripts/generate-piece-icons.mjs --check` | 0 | `piece icons up to date: 19 PieceType silhouettes (no diff)` — deterministic regeneration reproduces the committed file exactly. |
| Lint / types / unit | `pnpm check` | 0 | Biome `organizeImports` reported one import-order diagnostic in `src/core/drawer.test.ts`; fixed by sorting the named imports from `./disclosure` and `./drawer` exactly as specified. TypeScript and Vitest then pass. |
| Coverage | `pnpm test:coverage` | 0 | Full suite passes with the 80% gate on `src/core` and `src/state`. |
| Verification | `node scripts/generate-piece-icons.mjs --check && pnpm check && pnpm test:coverage` | 0 | Exact phase verification command; clean after the import-order fix. |

Execution note: the primary ran the generator and the verification chain and supplied the results.
The remaining Biome import-order diagnostic was fixed exactly as handed off before finalization.

## Acceptance criteria

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| AC-1 — dense tabs expose at most four slots per page | Pass | `drawerPages` with `PAGE_SIZE = 4`; unit tests assert every dense tab page is `<= 4` and check full/partial shapes (Rails `[4,4,2]`, Adventure `[4,4,1]`, Town `[4,3]`). Nature and Critters remain single-page. |
| AC-10 — regenerating from shipped GLBs produces no diff; every `PieceType` has an SVG; no runtime WebGL or new dependency | Pass | `--check` prints `piece icons up to date: 19 PieceType silhouettes (no diff)`; `src/core/drawer.test.ts` asserts every `PieceType` key has a generated SVG; generator uses only `node:fs`, emits inline SVG, and adds no runtime WebGL renderer, PNG, or dependency. |

## Evidence paths

- `scripts/generate-piece-icons.mjs` — offline, zero-dependency GLB-to-SVG generator with `--check`
- `src/ui/generated-piece-icons.ts` — committed, deterministic output (19 silhouettes)
- `src/core/drawer.ts`, `src/core/drawer.test.ts` — paging model and unit tests
- `src/ui/toy-icons.ts` — re-exports generated `PIECE_ICONS`
- `conductor/tracks/toybox-clarity_20261119/verification/phase-1.md`

## Deviations

- The generated-icon assertion in `src/core/drawer.test.ts` reads `src/ui/generated-piece-icons.ts`
  as text via `node:fs` instead of importing it, because `src/core` must never import `src/ui`
  (enforced by `import-graph.test.ts`).
- No files outside the phase Touches were changed. No product or design decision was required.

## Notes

- Hand-written `PIECE_ICONS` art was replaced by GLB-derived silhouettes; `SCENERY_ICONS`,
  `PIECE_LABELS`, and all player-visible text are unchanged.
- Disclosure filtering and the `MAX_PIECES` cap are untouched; paging only groups kinds that are
  already visible.
- No runtime WebGL renderer, new dependency, or PNG output was introduced.

## Primary verification

Verified on 2026-11-18T21:58:09Z at the subagent's final HEAD `b4aa37e`:

- Working tree was clean before inspection.
- `git diff --name-only 25dc3b08ae888bd99c7c7cfc69bf278541e044c5..HEAD` listed exactly:
  `src/core/drawer.ts`, `src/core/drawer.test.ts`, `scripts/generate-piece-icons.mjs`,
  `src/ui/generated-piece-icons.ts`, `src/ui/toy-icons.ts`, and this evidence file.
- The commit range contained exactly `78ce81a` and `b4aa37e`, both reported by the
  executor, with no merge commits and no extra commits.
- Re-ran the exact verification command:
  `node scripts/generate-piece-icons.mjs --check && pnpm check && pnpm test:coverage`
  → exit 0. Generator reported `piece icons up to date: 19 PieceType silhouettes (no diff)`;
  Biome checked 198 files with no fixes; tsc clean; Vitest passed 57 files / 1015 tests;
  coverage was 97.07% statements / 91.21% branches / 97.41% functions / 98.87% lines,
  above the 80% gate on `src/core` and `src/state`.
- AC-1 is satisfied by `PAGE_SIZE = 4`, `PAGED_TABS = ['rails','adventure','town']`,
  `drawerPages`, and the paging unit tests. AC-10 is satisfied by the deterministic
  `--check`, the every-`PieceType` assertion, and source inspection showing no
  `WebGLRenderer`, `canvas`, `three`, or new dependency in the generator or generated module.
- Accepted deviation: `src/core/drawer.test.ts` reads the generated icon module as text
  via `node:fs` rather than importing across the `src/core → src/ui` boundary. This is the
  smallest valid way to assert generated-icon coverage under the import-graph guard.
