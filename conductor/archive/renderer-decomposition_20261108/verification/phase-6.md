# Phase 6 verification — renderer decomposition (ambience + facade)

Track: `renderer-decomposition_20261108`
Branch: `refactor/renderer-decomposition_20261108`
Phase base: `701f4cb809dea76465573ac4b7a9ee13000d7a21`
Date: 2026-11-07

## Commits

- `a2575f5` `refactor(scene): extract track ambience from the renderer facade`
  (`src/scene/track-ambience.ts` new, `src/scene/track-renderer.ts` reduced)
- `55f57a1` `test(core): guard the scene import graph`
  (`src/core/import-graph.test.ts` new)

## Verification commands (run exactly as briefed)

### `pnpm check`

Exit code: 0 — biome clean (184 files), `tsc --noEmit` clean, vitest
`50 passed / 881 tests`.

Run after the ambience move and again on the committed tree.

### `pnpm exec playwright test e2e/delight-toys.spec.ts e2e/music-box.spec.ts`

Exit code: 0 — 6 passed (1.0 m), tablet + phone:
`delight-toys` load/balloon-wander, `delight-toys` winter snow caps,
`music-box` wind-and-settle. These are the AC-5 named specs for FR-8's
delight and music-box ownership.

## Test-first evidence (`src/core/import-graph.test.ts`)

The guard was written before the module existed. First full `pnpm check`
run after formatting fixes failed with:

```
× is walked, not assumed, so the rules cannot pass vacuously
  expected [ 'src/scene/track-catalog', …(5) ] to deeply equal
           [ 'src/scene/track-ambience', …(6) ]
```

i.e. the only missing module was `track-ambience`; after the extraction the
same command is green and the guard's other rules (UI/core layering, the
placement readers/importers allowlists) are pinned by anti-vacuity assertions
(walked file/edge counts, all seven `track-*` modules present, three known
edges asserted).

## Line counts (measured with the file reader, `git diff --stat` cross-check)

| Module | Lines | Budget |
| --- | ---: | --- |
| `src/scene/track-renderer.ts` | **167** | ≤ 200 |
| `src/scene/track-catalog.ts` | 192 | ≤ 400 |
| `src/scene/track-placement.ts` | 400 | ≤ 400 |
| `src/scene/track-ghost.ts` | 176 | ≤ 400 |
| `src/scene/track-picking.ts` | 119 | ≤ 400 |
| `src/scene/track-crossings.ts` | 400 | ≤ 400 |
| `src/scene/track-ambience.ts` | **221** | ≤ 400 |

`git diff --stat 701f4cb… -- src/scene/track-renderer.ts` reports
`31 insertions(+), 149 deletions(-)`; base 285 → 167 lines.

Pre-existing, untouched neighbours for context (not this phase's budget):
`init-scene.ts` 450, `train-fleet.ts` 552 (already over the spec's 500-line
folder goal before this track; out of Touches, recorded for the primary).

## `TrackRenderer` interface parity vs `f880530`

`git diff f880530 -- src/scene/track-renderer.ts` shows exactly two hunks:
`@@ -1,288 +1,21 @@` (imports/catalogue removal) and
`@@ -359,961 +92,76 @@` (function body). The 70 lines between them — the
whole `export interface TrackRenderer { … }` block — appear as unchanged
context, so every member name, arity and returned shape is byte-identical.
No doc comment inside the interface was edited.

`tsc --noEmit` inside `pnpm check` proves the renderer object satisfies that
interface, including the `MusicBoxScene['probe']` and `CritterMood` types the
facade still imports type-only for the frozen surface.

## Ambience contract

`track-ambience.ts` declares `AmbienceSource` (read-only `templates`,
`rendered`, `tracked`) itself and receives the live placement maps through
it; it imports no `track-placement`, `track-renderer`, `track-picking`,
`track-ghost` or `track-crossings`. It owns critters, delight (including the
scenery-template snow settling), the music box (voice, attach/detach, probe,
suspend/resume) and the tunnel snow toggle, plus the placement hook shims the
facade wires. `dispose()` order is unchanged from the old inline block.

## Import-graph rules encoded (`src/core/import-graph.test.ts`)

- `src/ui/**` → no `src/scene/**`.
- `src/core/**` → no `src/scene/**`, no `src/ui/**`, no `three`.
- `track-placement` → only `track-catalog` (documented), no other `track-*`.
- `track-ambience` / `track-ghost` / `track-catalog` → no `track-placement`,
  no `track-renderer`.
- `track-placement` importers pinned to renderer + crossings + picking with
  one-line reasons.
- `track-renderer` importers pinned to `init-scene` + `scene-context`.
- No rule was weakened; no allowlist entry was needed for an edge that did
  not exist.

## Blocked: `conductor/tech-stack.md` folder map

Editing `conductor/tech-stack.md` returned `permission.rejected` for the
`edit` tool (both hunks below were refused; not retried per tooling rules).
The intended, ready-to-apply patch is recorded here for the primary:

1. In `## Folder structure`, after the `scene-context.ts` entry and before
   `day-ambience.ts`, insert:

```
    # Track stack decomposed 2026-11-07 — one facade plus six owned parts:
    track-renderer.ts #  facade: the TrackRenderer interface, wiring of the parts
                     #   below, and dispose (at most 200 lines)
    track-catalog.ts #   data only: piece/scenery tables, base yaw, kit anchors,
                     #   asset URLs, the meadow-item discriminator
    track-placement.ts # store subscription, asset loading, per-id reconcile/
                     #   apply/pop, tunnel portals, hill snow, station crates
    track-ghost.ts   #   snap-grid overlay + the translucent drag ghost
    track-picking.ts #   raycast cell hit, placed-item tap target, cell projection
    track-crossings.ts # gate choreography (arms, lantern, bell), switch blade
                     #   and lever poses/tweens, crossing snow cap
    track-ambience.ts #   critters, delight toys, music-box voice, tunnel snow
```

2. In "Rules of the house", rule 1, replace
   `` `track-renderer.ts` — `PIECE_URLS`, `BASE_YAW`, `KIT_ANCHORS` ``
   with `` `track-catalog.ts` — `PIECE_URLS`, `BASE_YAW`, `KIT_ANCHORS` ``
   (the tables moved in Phase 1; the old sentence now points at the facade).

## Notes / findings

- No behaviour change intended or observed. Frame order untouched.
- Pre-existing folder-budget overruns (`init-scene.ts` 450,
  `train-fleet.ts` 552) predate the track and were not refactored (outside
  Touches).

## Primary verification

Performed by the primary agent. The subagent returned `blocked` on P6.T3.3 only
because `edit conductor/tech-stack.md` was denied to it; the ready-to-apply patch
it recorded above was applied here verbatim, which closes that task.

| Check | Command | Exit | Result |
|---|---|---|---|
| Static + unit | `pnpm check` | 0 | Biome clean, `tsc --noEmit` clean, 50 files / **881 tests** |
| Behaviour specs | `pnpm exec playwright test e2e/delight-toys.spec.ts e2e/music-box.spec.ts` | 0 | **6 passed**, 1.1 m |
| Line budget | budget test in `src/core/import-graph.test.ts` | 0 | `track-renderer.ts` **167**, `track-ambience.ts` **221**, `import-graph.test.ts` 184 lines |

`track-renderer.ts` went 1,263 → **167** lines across the six phases
(1,085 → 804 → 682 → 599 → 285 → 167, one counter, trailing newline excluded),
so AC-1 holds with room to spare. The review fixes that followed grew it to
**195** (R1 latch and dispose order, R2 comments); the numbers are now pinned by
the budget test rather than by hand, so every later count comes from
`pnpm check`.

**Interface parity.** Extracted the `export interface TrackRenderer { … }` block
from `git show f880530:src/scene/track-renderer.ts` and from the working tree and
compared them: identical, 66 lines each. (A first comparison reported a mismatch
because the console mangled em dashes on the `git show` side; comparing the two
blocks through `git diff --no-index` on files written to disk showed only the two
mojibake lines and no textual difference.) No member, arity or return type moved,
and no doc comment was reworded.

**Doc edit applied (P6.T3.3).** `conductor/tech-stack.md` now carries the
seven-module block under `scene/` — facade plus catalogue, placement, ghost,
picking, crossings, ambience, each with its ownership line and the
"decomposed 2026-11-07" header — and rule 1 of "Rules of the house" points at
`track-catalog.ts` for `PIECE_URLS` / `BASE_YAW` / `KIT_ANCHORS`, which is where
those tables live since Phase 1.

**Review of the split.** `track-ambience.ts` declares its own `AmbienceSource`
with read-only `templates` / `rendered` / `tracked` maps and imports none of the
other `track-*` modules, so the seam is data, not intimacy. The renderer's
placement hooks are now one-line delegations and its returned object mostly
forwards handles — which is what a facade should look like.

**Import-graph guard.** `src/core/import-graph.test.ts` pins the directions the
refactor was for: UI never reaches into the scene, core never reaches scene/UI/
`three`, placement imports only the catalogue, and only `init-scene` and
`scene-context` import the facade. Two edges are allowlisted with reasons
(placement readers, catalogue) rather than loosening a rule. It was written red
first — failing exactly on the missing `track-ambience` — then went green.
