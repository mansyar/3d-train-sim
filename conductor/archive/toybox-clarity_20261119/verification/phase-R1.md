# Phase R1 Verification — Review Fixes

- **Track:** `toybox-clarity_20261119` — Toybox Clarity and Outside-Drag Removal
- **Phase:** R1 — Review Fixes
- **Date:** 2026-11-19
- **Branch:** `feat/toybox-clarity_20261119`
- **Base / head commit:** `9f1a19c3731e82a916e8edcf9c1431f1232c3f36` / `e98fc86` (source commit; this evidence file is committed immediately after)
- **Result:** verified — F1 and F2 are both resolved. All gates are green with no dependency, scope, or gating changes.

## Commands

| Layer | Command | Exit / outcome |
| --- | --- | --- |
| git inspection | `git status --short --branch && git rev-parse HEAD && git log --oneline --max-count=8` | 0 — clean tree at phase base `9f1a19c`. |
| generator (regenerate) | `node scripts/generate-piece-icons.mjs` (primary, via blocked-command handoff) | `wrote src/ui/generated-piece-icons.ts: 19 PieceType silhouettes` |
| generator check | `node scripts/generate-piece-icons.mjs --check` (primary, via blocked-command handoff) | `piece icons up to date: 19 PieceType silhouettes (no diff)` |
| full verification chain (run 1) | `node scripts/generate-piece-icons.mjs --check && pnpm check && pnpm build && pnpm exec playwright test e2e/toybox-clarity.spec.ts e2e/smoke.spec.ts e2e/a11y.spec.ts` | `R1_VERIFY_EXIT=0` — generator no diff; Biome reported one `lint/complexity/noAdjacentSpacesInRegex` warning in `src/core/drawer.test.ts:191` but exited 0; tsc clean; Vitest 57 files / 1016 tests; Vite build 116 modules with PWA 178 precache entries; Playwright 28 tests (27 passed, 1 pre-existing `@ci` skip, 0 failed) in 1.9 m on tablet and phone. |
| Biome warning fix | Primary changed the regex prefix in `src/core/drawer.test.ts:191` from `/^  (` to `/^ {2}(`. | Warning removed; no behavior change. |
| `pnpm check` (run 2, post-fix) | `pnpm check` (primary) | `CHECK_EXIT=0` — Biome 199 files with no warnings or fixes; tsc clean; Vitest 57 files / 1016 tests passed. |

The new tab-switch page-memory assertion passed on both tablet and phone profiles, and the same-tab icon uniqueness test passed (included in the 1016 Vitest tests). No verification command or icon regeneration was re-run by the subagent after the primary handoff.

## F1 — AC-2 tab-switch page memory — resolved

**Before** (`e2e/toybox-clarity.spec.ts`, first paging test): the test swiped Rails to page 2, clicked Nature to assert it was single-page, then clicked Critters — it never returned to Rails, so a regression in remembered-page handling would have passed.

```ts
  // Nature and Critters are short enough to stay single-page and dotless.
  await page.click('.drawer-tab[data-tab="nature"]');
  await expect(page.locator('.drawer-panel[data-panel="nature"] .page-dot')).toHaveCount(0);
  expect(await slotsInViewport(page, 'nature')).toHaveLength(3);
  await page.click('.drawer-tab[data-tab="critter"]');
  await expect(page.locator('.drawer-panel[data-panel="critter"] .page-dot')).toHaveCount(0);
```

**After:** reuses the existing Nature click, returns to Rails, and asserts the same remembered dot and the same four visible slots. The reload-reset test is untouched.

```ts
  // Nature and Critters are short enough to stay single-page and dotless.
  await page.click('.drawer-tab[data-tab="nature"]');
  await expect(page.locator('.drawer-panel[data-panel="nature"] .page-dot')).toHaveCount(0);
  expect(await slotsInViewport(page, 'nature')).toHaveLength(3);

  // Switching tabs and back keeps the remembered Rails page for the session.
  await page.click('.drawer-tab[data-tab="rails"]');
  await expect(rails.locator('.page-dot').nth(1)).toHaveAttribute('aria-current', 'page');
  expect(await slotsInViewport(page, 'rails')).toHaveLength(4);

  await page.click('.drawer-tab[data-tab="critter"]');
  await expect(page.locator('.drawer-panel[data-panel="critter"] .page-dot')).toHaveCount(0);
```

Verified: the new assertion passed in the targeted Playwright run on both tablet and phone; the reload-reset test remains unchanged and passed.

## F2 — distinct generated icons — resolved

**Before** (`scripts/generate-piece-icons.mjs`): every piece rendered the same hull with `stroke-width="3"` and a fixed `0.6` inset, so four GLB-sharing pairs were byte-identical: `straight`/`bridge`, `slope-up`/`hill`, `slope-down`/`bump-down`, `bump-up`/`hill-half`.

```js
function silhouette(hull) {
  const points = hull.map(([x, y]) => `${x},${y}`).join(' ');
  ...
  const inner = hull.map(([x, y]) => [
    Number((centerX + (x - centerX) * 0.6).toFixed(2)),
    Number((centerY + (y - centerY) * 0.6).toFixed(2)),
  ])...
  // stroke-width="3" for every piece
}
```

**After:** the generator keys each projected hull by its serialized points, assigns each repeat a deterministic variant (zoom `1 - v*0.1`, inset `0.6 + v*0.1`, stroke `3 + v*0.5`), and throws if any two icons are still identical. Variant 0 is byte-identical to the old output, so only the four duplicate pieces changed (`bridge`, `hill`, `bump-down`, `hill-half` now use a tighter frame and `stroke-width="3.5"`).

```js
function silhouette(hull, variant = 0) {
  const zoom = 1 - variant * 0.1;
  const inset = 0.6 + variant * 0.1;
  const stroke = 3 + variant * 0.5;
  ...
  const outer = hull.map((point) => frame(point, zoom));
  const inner = outer.map((point) => frame(point, inset))...;
  // stroke-width="${stroke}"
}

const seen = new Map();
const icons = new Map();
for (const { kind, hull, signature } of projected) {
  const variant = seen.get(signature) ?? 0;
  seen.set(signature, variant + 1);
  icons.set(kind, silhouette(hull, variant));
}
if (icons.size !== new Set(icons.values()).size) {
  throw new Error('two pieces still share an identical icon; adjust the variants');
}
```

A new unit assertion in `src/core/drawer.test.ts` reads `src/ui/generated-piece-icons.ts` as text (no `src/core` → `src/ui` import), and for each `drawerTabs()` entry filters `PIECE_TYPES` by `tabForKind()` and asserts no two icons on that tab are equal.

- **Regenerated icon count / `--check` output:** 19 silhouettes; `piece icons up to date: 19 PieceType silhouettes (no diff)`.
- **Icon-collision unit assertion result:** passed within the 1016-test Vitest run (re-confirmed by the clean post-warning-fix `pnpm check`).

## Primary handoff

The subagent reported two shell-permission denials (`node scripts/generate-piece-icons.mjs` and the exact verification chain). The primary executed both in the subagent's worktree, obtained the green results above, fixed the single Biome warning in `src/core/drawer.test.ts:191`, and re-ran `pnpm check` cleanly. No blocker remains.

## Scope check

Edits are limited to `e2e/toybox-clarity.spec.ts`, `scripts/generate-piece-icons.mjs`, `src/ui/generated-piece-icons.ts`, `src/core/drawer.test.ts` and this evidence file. No dependency, runtime WebGL renderer, PNG output, network call, telemetry, storage key, catalog reordering, disclosure gating, parent gate, viewport policy, save format, `e2e/a11y.spec.ts` or release workflow change. `src/ui/generated-piece-icons.ts` was regenerated by the generator, never hand-edited.

## Deviations

None.

## Notes

- F1 and F2 are both resolved; all configured gates are green.
- Source/generated files are committed as `e98fc86 fix(toybox): resolve review findings F1 and F2`; this evidence file is committed separately as the phase evidence commit.
- The Biome warning fix is a regex syntax-only change (`/^  (` → `/^ {2}(`) with no effect on matching behavior.

## Primary verification

On final subagent tree `d34161f`: clean worktree; `git diff --name-only 9f1a19c3731e82a916e8edcf9c1431f1232c3f36..HEAD` listed exactly the five R1 Touches; the range contained only `e98fc86` and `d34161f`, with no merge commits. I independently re-ran the exact verification command on final HEAD: generator `--check` no diff; Biome 199 files with no warnings or fixes; tsc clean; Vitest 57 files / 1016 tests; Vite build 116 modules with PWA 178 precache entries; Playwright 28 tests, 27 passed, 1 pre-existing `@ci` skip, 0 failed in 1.9 min across tablet and phone. `R1_FINAL_VERIFY_EXIT=0`. F1's tab-switch page-memory assertion and F2's same-tab icon uniqueness assertion both passed. No deviation from the R1 brief.
