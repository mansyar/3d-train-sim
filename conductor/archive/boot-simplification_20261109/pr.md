# Boot Simplification

## Summary

`src/main.ts` now mounts the shell, binds the scene, then wires the controls — in that order, with
the type system and a source guard keeping it that way. The eighteen `scene?.` closures, three
listener queues, three replay loops, splice-based pre-bind unsubscribes and `?? DEFAULT_DAY_PHASE`
fallbacks are gone, because a control can no longer be mounted before the scene it needs exists.

No markup, stylesheet, render path, `SceneHandle`, save format or dependency changed. The gzipped
bundle came out **227 B smaller**.

## Track

- Spec: [`./spec.md`](./spec.md)
- Plan: [`./plan.md`](./plan.md)
- Review: [`./review.md`](./review.md)

### What happened

| Phase | Checkpoint | Result |
|---|---|---|
| 1. The split | `64095cf` | `mountShell` returns the canvas; `initScene` binds; `mountControls` takes the bound scene; queues and fallbacks deleted |
| 2. The guard | `a8dc1bb` | `src/ui/boot-order.test.ts` — a `@ts-expect-error` fixture plus a source guard, both demonstrated failing |
| 3. Docs and measurement | `f23da57` | tech-stack order documented, roadmap row shipped, sizes and coverage measured |
| R1. Review fixes | `5e6d034` | three guard holes closed (each proved to bite), orphaned re-export deleted, four evidence corrections |
| R2. Second-round fixes | `75efb75` | guard rewritten again: the scene argument is brace-matched and the queue invariant is name-independent; a stray ESC byte in the spec and the superseded Phase 2 description repaired |

## Requirements

- [x] FR-1 `mountShell(root)` writes the frame and returns the canvas
- [x] FR-2 `mountControls` writes no markup
- [x] FR-3 the options type carries the bound scene; a scene-less mount is a type error
- [x] FR-4 order: `mountShell` → `initScene` → `mountControls`
- [x] FR-5 no listener queues or replay loops in `main.ts`
- [x] FR-6 the day clock reads the live scene, no `DEFAULT_DAY_PHASE` fallback
- [x] FR-7 first events still reach the UI
- [x] FR-8 `SceneHandle` unchanged (empty diff in `init-scene.ts`)
- [x] FR-9 storage gate, lazy recovery note, PWA self-update and dev handles unchanged
- [x] FR-10 a guard test pins the order and the absence of queues
- [x] FR-11 docs record the order and the reason
- [x] FR-12 no `src/core`, dependency or formatting change
- [x] NFR-1 no new dependency
- [x] NFR-2 no visible change; the mount stays in one task
- [x] NFR-3 coverage not below baseline
- [x] NFR-4 bundle not larger
- [x] NFR-5 the order is enforced by the compiler, not convention
- [x] NFR-6 no boot deferral (no rAF/timer introduced)

## Verification

| Check | Command | Result |
|---|---|---|
| Static | `pnpm exec biome check .` | pass — 182 files |
| Types | `pnpm exec tsc --noEmit` | pass |
| Unit | `pnpm test` | pass — 52 files / 898 tests (893 baseline + 5 guard) |
| Coverage | `pnpm test:coverage` | pass — 97.36 / 91.06 / 98.10 / 99.44, identical to base |
| Build | `pnpm build` | pass — 178 precache entries, 10,642.67 KiB; gzipped JS+sw 218,485 B vs 218,712 B base (**−227 B**) |
| Boot-order guard | `pnpm test src/ui/boot-order.test.ts` | pass — 5 tests; three bite demonstrations recorded in `phase-R1.md` |
| First events | `pnpm exec playwright test e2e/smoke.spec.ts e2e/sun-moon.spec.ts e2e/ride-toybox-flow.spec.ts` | pass — 17 passed, 1 skipped (2.4 m) |
| Full matrix | `pnpm exec playwright test` | pass — 57 passed, 1 skipped in 8.7 min at `edd3706` |
| CI | `gh pr checks` | see the checks on this pull request — full matrix (tablet · phone · prod) in two shards |

## Media

Nothing to show: no pixel changed. The nine journeys that prove the first events still land are
listed in the verification table.

## Review

Two rounds, **PASS WITH FINDINGS**: round 1 found 3 Medium + 4 Low, round 2 found 2 Medium + 3
Low; all twelve are fixed in Phases R1 and R2.

The Mediums were all guard holes — the kind that matter more than a normal bug, because they buy
false confidence. The `scene` argument was checked with a 400-character window that the dev-handle
comment satisfied; the queue scan only knew names ending in `Listeners`; and the order check read
raw text while its own doc comment promised a commented-out mount could not satisfy it. Each fix
is demonstrated failing on the regression it exists to catch, and each demonstration edit was
reverted with an empty `git diff`.

The Lows: an orphaned `CellFromPoint` re-export, a spec claim that the dev handles are assigned
before `mountControls` (they are assigned after), an AC-4 witness credited to `fleet` when it lives
in the two-loops smoke journey, and two matrix runs that differed without being labelled as
different runs.

Round 2 checked the rewritten guards rather than trusting them, and found two of them weak in the
opposite direction: the scene check accepted only one spelling of a correct call while a literal
`note: 'scene,'` still matched, and the queue scan was still keyed on variable names. Phase R2
replaced the first with a brace-matched argument parse (four accepted spellings, three rejected
decoys) and added a name-independent invariant for the second — no loop, no `forEach`, no
collection in `src/main.ts` — keeping the name scan as a backup. It also repaired a stray ESC byte
that had eaten the `e` out of three `e2e/` paths, and marked the Phase 2 guard description as
history.

## Deviations and risks

- The options type is a structural `SceneControls` view rather than `SceneHandle`, because
  `src/core/import-graph.test.ts` forbids every `src/ui → src/scene` edge, `import type` included.
  The compiler still checks all eighteen members at the `mountControls` call.
- The canvas is queried in both `mountShell` and `mountControls`; only `createToyDrag` needs the
  element, and it binds pointer listeners inside `mountControls`.
- Phase 3 was performed by the primary (it writes Conductor-owned docs), and the gzip baseline was
  measured in a disposable worktree.
- Which capability each control receives is now a compile-time property; the *order* is textual,
  so the guard reads `src/main.ts`. A future refactor that moves the mount sequence into a helper
  module would need a matching guard rather than a silent pass.
- Boot timing on a real iPad is still a manual check; nothing here defers the boot, but nothing
  measures it either.

## Follow-ups

- `process-hygiene_20261109` — the registry table, stale archived statuses, and the review
  workflow.
- If a second boot-order guard is ever needed for a helper module, extract the order into one that
  both `main.ts` and the test can import instead of widening the text scan.

## Rollback

`git revert` the squash commit. The change is source-only, so a revert restores the previous boot
order with no data migration; persisted worlds are untouched either way because the save format was
not part of this track.
