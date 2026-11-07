# Review — Renderer Decomposition

| | |
|---|---|
| **Track** | `renderer-decomposition_20261108` |
| **Branch** | `refactor/renderer-decomposition_20261108` |
| **Range** | `f880530..HEAD` (`f880530..2c8c1fc` at round 1) |
| **Rounds** | 1 |
| **Verdict** | **PASS WITH FINDINGS** |

## Summary

The relocation is honest: the `TrackRenderer` interface block is byte-identical to `f880530`, every
moved closure still reads the live maps through the placement handle rather than a copy, no
change-gated setter lost its gate, and dispose ordering kept the blades-and-ghost teardown ahead of
the model removal. The import-graph guard is non-vacuous — it fails a third renderer importer and any
`src/core → src/scene` edge — and `src/ui` no longer imports the scene at all.

Three Mediums are about what the track cannot prove rather than what it broke. The facade's hooks
dereference `ambience` and `crossings` before those bindings exist, so construction is safe only
because GLTFLoader callbacks and `world.subscribe` are asynchronous today. AC-1's line budget lives
in a manual table while two modules sit exactly on the 400-line cap. And AC-3's "every cell" claim is
sampled: the grid test covers corners, centre and one axis, which is what the plan's task said, not
what the spec asked.

Three Lows are precision: dispose order versus its documented invariant, two allowlist reasons that
overstate the edges they sanction, and line counts that disagree between plan and evidence.

Nothing here is a behavioural regression, and none of it affects the shipped child-facing product.

## Verification

| Check | Command | Result |
|---|---|---|
| Static + unit | `pnpm check` | pass — Biome clean, `tsc --noEmit` clean, 50 files / 881 tests |
| Coverage | `pnpm test:coverage` | pass — 97.36 / 91.06 / 98.10 / 99.44 on core + state |
| Build | `pnpm build` | pass — 178 precache entries, 10,641.79 KiB |
| E2E (track specs) | per phase | pass — smoke 40, tunnel + cargo 8, undo 44, crossings 14, delight + music box 6 |
| E2E (full) | `pnpm exec playwright test` | see round 2 |
| Line budget | manual | renderer 167, catalogue 192, placement 400, ghost 176, picking 119, crossings 400, ambience 221 |

## Requirements coverage

| ID | Implemented by | Verified by | Status |
|---|---|---|---|
| FR-1 | P6.T3.1 | interface diff vs `f880530` (66 lines), `tsc` | covered |
| FR-2 | P1.T3.1 | `track-catalog.ts` data-only, smoke | covered |
| FR-3 | P1.T1.2 | `meadow-grid.test.ts`, coverage gate | covered |
| FR-4 | P2.T1.1–P2.T2.1 | `tunnel.spec`, `cargo.spec` | covered |
| FR-5 | P3.T1.1, P3.T2.1 | `smoke.spec`, `undo.spec` | covered |
| FR-6 | P4.T1.1, P4.T2.1 | `smoke`, `undo`, `ride-toybox-flow` | covered |
| FR-7 | P5.T1.1, P5.T2.1 | crossing-gate, switches, switch-slip | covered |
| FR-8 | P6.T1.1, P6.T2.1 | delight-toys, music box | covered |
| FR-9 | P6.T3.2 | `import-graph.test.ts` | covered |
| FR-10 | P1.T2.1 | `import-graph.test.ts`, `rg` over `src/ui` | covered |
| FR-11 | P5.T2.1, P6.T3.1 | interface unchanged, probes unmodified | covered |
| FR-12 | P6.T3.3 | `tech-stack.md` folder map | covered |
| AC-1 | P6.T3.1 | manual measurement only | **partial** — F2 |
| AC-2 | P6.T3.1 | interface diff, `tsc` | covered |
| AC-3 | P1.T1.1 | corners + centre + one axis | **partial** — F3 |
| AC-4 | P1.T2.2 | `import-graph.test.ts`, `rg` | covered |
| AC-5 | phases 1–6 | behaviour specs per phase | covered |
| AC-6 | phase verifications | full suite still running at review time | **partial** — pending |
| AC-7 | P6.T3.3 | build manifests; gzip delta unreported | **partial** — F6 |
| AC-8 | P6.T3.2 | exact importer lists in the guard | covered |
| AC-9 | P5.T2.1 | probe shapes forwarded, specs unmodified | covered |

## Findings

### High

None.

### Medium

**F1 — construction order rests on asset timing.**
*File:* `src/scene/track-renderer.ts:102-121`
*What:* `startTrackPlacement` receives hooks that dereference `ambience` (a `let` not yet assigned)
and `crossings` (a `const` declared later), and placement starts its GLB loads before either module
exists.
*Why:* safe today only because `FileLoader` resolves asynchronously and `world.subscribe` merely
registers a listener. A synchronous reconcile path would throw a `TypeError`/TDZ error that looks
like an asset bug.
*Fix:* make the sink explicit — a `hooksReady` flag with early returns, or construct ambience and
crossings first and pass a handle, or have placement expose a `start()` the facade calls after
wiring.
*Requirement:* FR-9. *Test gap:* a placement stub that invokes a hook synchronously.

**F2 — the line budget has no gate.**
*File:* `src/scene/track-crossings.ts:400`
*What:* AC-1 is evidenced only by a manual table; no test asserts line counts, and both
`track-placement.ts` and `track-crossings.ts` are exactly at the 400-line cap.
*Why:* the track's headline constraint can regress on the next edit with nothing failing, and the
manual numbers already disagree between documents.
*Fix:* add a `LINE_BUDGETS` map to `src/core/import-graph.test.ts` (it already walks every source
file) and assert each file's line count against its budget.
*Requirement:* AC-1. *Test gap:* the assertion itself.

**F3 — AC-3 is sampled, not exhaustive.**
*File:* `src/core/meadow-grid.test.ts:35-43`
*What:* the spec asks for all 16×16 cells; the test covers corners, centre, one axis, negatives and
out-of-range — matching the plan's narrower wording.
*Why:* the transform is affine so the behavioural risk is low, but the acceptance criterion is not
literally met.
*Fix:* loop `x` and `y` over `MEADOW_CELLS` and assert the formula (256 cheap assertions), or amend
AC-3 to name the sampled set.
*Requirement:* AC-3. *Test gap:* the sweep.

### Low

**F4 — dispose order contradicts its documented invariant.**
*File:* `src/scene/track-renderer.ts:159-165` — `placement.dispose()` runs before `crossings.dispose()`,
while the spec's edge case asks for reverse construction order and the phase note claims the old
order was preserved. *Fix:* dispose crossings → ambience → ghost → placement and correct the note.
No observable defect today.

**F5 — allowlist reasons overstate two edges.**
*File:* `src/core/import-graph.test.ts:40-42` — `track-crossings` is allowlisted as reading the live
maps but also imports the value helper `advancedEdge` from placement, and `track-picking` is described
as reading `rendered` when it only reads `tracked` (its import is type-only). *Fix:* move
`advancedEdge` to the catalogue and reword both reasons plus the `track-picking.ts` header.

**F6 — line counts disagree.**
*File:* `conductor/.../plan.md:201` — plan says 158/210, HEAD measures 167/221, and the phase file says
both. *Fix:* replace the manual table with the automated assertion from F2 and record one canonical
count.

## Overrides

None. No finding was deferred, and no user override was needed.

## Plan compliance

Phases 1–6 verified at `69e4d48`, `cd7f804`, `bff61e5`, `6ec338d`, `84b62d7`, `2f9a903`; the phase
commits are all ancestors of HEAD. Recorded deviations: the `GROUND_SIZE` re-export from
`src/scene/ground.ts`, the `init-scene.ts` repoint added to Phase 1's Touches, the placement factory
signature, and the primary applying the Phase 6 `tech-stack.md` patch after the subagent was denied
the write.

## Out of scope

- Real-device verification of the refactor (no visual change is expected, and the full suite plus the
  behaviour specs cover the rendered result).
- The two pre-existing over-budget scene files (`init-scene.ts` 450, `train-fleet.ts` 552) and the
  `frame-contract_20261109` track that will address the frame order.
- Performance measurement: a relocation cannot change the frame cost, and no benchmark was in scope.

## Debt

Nothing deferred. F1–F6 are fixed in Phase R1 of the track, because each is a small, local change to
this track's own files and an imported guard.

## Doc sync

`synced` — `conductor/tech-stack.md` documents the seven-module split and names `track-catalog.ts` as
the owner of the asset tables; `conductor/product.md` marks the roadmap row shipped and records that
the 500-line goal is missed by `train-fleet.ts` (pre-existing).

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
|---|---|---|---|---|---|---|
| 1 | PASS WITH FINDINGS | 0 | 0 | 3 | 3 | 0 |
