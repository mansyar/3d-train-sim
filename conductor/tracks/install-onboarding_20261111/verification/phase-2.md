# Phase 2 Verification — Gated tray hint and wiring

- **Track:** `install-onboarding_20261111` — Install Onboarding
- **Phase:** 2 — Gated tray hint and wiring
- **Date:** 2026-11-18
- **Branch:** `feat/install-onboarding_20261111`
- **Base commit:** `07e7859a99e54b109b18d24e54715a654b70fc4c`
- **Head commit (at verification):** `a68bcbc5ed4feb569a17c7aab189a8d63eb4bbe0`
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Lint + format + types + unit | `pnpm check` | 0 | Biome clean across 194 files; `tsc --noEmit` clean; 57 test files / 1009 unit tests passed, including the boot-order and import-graph guards. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-2 | No hint at all when installed/standalone. | `mountShell(root, !installMode.isInstalled())` omits the markup at shell write; `refreshInstallHint()` removes any existing element on install-mode or dismissal change (`.remove()`, not `hidden`). | verified |
| FR-3 | Browsing + undismissed → the 2 s-hold tray shows an icon-led line with the iOS Share → Add to Home Screen instruction and a labelled dismiss control. | `INSTALL_HINT_MARKUP` in `src/ui/parent-gate.ts` (`📲`, literal parent text, `aria-label="Dismiss the Add to Home Screen hint"`); inserted into `.preset-tray` by `refreshInstallHint()`. | verified |
| FR-4 | Hint lives only in the parent tray; kid shell unchanged. | Markup is emitted inside `.preset-tray` in `mountShell` and inserted there on demand; no rail/drawer/canvas control touched. | verified |
| FR-5 | Dismiss hides at once, persists via full snapshot, and returns after a world reset. | `installHint.dismiss()` notifies the tray and `watchInstallHintPersistence`; all four persistence watchers receive `installHint.isDismissed` so no save clobbers it; `world.onReset(() => installHint.restore(false))`. | verified |
| NFR-3 | Parent-tray styling, labelled control, existing `:focus-visible` ring, no new axe violations. | `.install-hint*` rules mirror `.recovery-note` in `src/style.css` with alphabetised declarations and 44px dismiss target; the shared `button:focus-visible` ring is unchanged; icon is `aria-hidden`, instruction is plain text. | verified |
| NFR-4 | No change to the `user-scalable=no` / parent-only zoom policy. | `setParentZoom` and the viewport constants in `parent-gate.ts` are untouched. | verified |
| AC-2 | Standalone emulation → no hint element. | Hook in place; browser-level assertion is Phase 3's `toHaveCount(0)` on `.install-hint`. | verified (hook) |
| AC-3 | No hint before the parent hold; visible after the hold. | Hint is inside the `[hidden]` `.preset-tray`, which only `armConfirm()` reveals after the 2 s hold. Browser-level assertion is Phase 3. | verified (hook) |
| AC-4 | Hint nested in `.preset-tray`; kid shell DOM unchanged. | Structural placement above; Phase 3 owns the DOM comparison. | verified (hook) |
| AC-5 | Dismiss → reload → hidden; reset → returns. | Restore from `deserializePreferences(snapshot)` before watcher attach, plus reset listener above; Phase 3 owns the e2e walk-through. | verified (hook) |

## Evidence paths

- `src/ui/app.ts`
- `src/ui/parent-gate.ts`
- `src/style.css`
- `src/main.ts`

## Deviations

None. All changes stayed within the phase Touches.

## Notes

- The hint element uses the `.install-hint` selector (dismiss control: `.install-hint-dismiss`) for Phase 3's e2e assertions.
- Standalone state removes the element from the DOM rather than hiding it, so the Phase 3 `toHaveCount(0)` assertion holds even though the tray markup is written once at boot.
- The evented dismissal controller lives in `src/ui/parent-gate.ts` because `src/ui/boot-order.test.ts` forbids listener collections and loops in `src/main.ts`; the boot file only calls it and passes the resulting view through `mountControls`.
- The browser probe is built inside `main.ts` at runtime (never at module load): missing `matchMedia` reads as `null`, `navigator.standalone` is read defensively, and media changes subscribe via `addEventListener('change')` with the deprecated `addListener` fallback for older Safari.
- No telemetry, new storage keys, user-agent sniffing, `beforeinstallprompt`, service-worker, manifest, or viewport changes were introduced.
- First `pnpm check` run found only Biome import/format ordering; applied its exact suggestions, and the second run passed with exit 0.

## Primary verification

- **Command:** `pnpm check`
- **Exit code:** 0
- **Result:** pass. Biome checked 194 files with no fixes; `tsc --noEmit` clean; 57 test files / 1009 unit tests passed. Working tree clean; changed files in `07e7859..HEAD` match the phase Touches plus this evidence file; commits `8ca6bf0`, `a68bcbc`, `009cb15` match the subagent report with no extras. Spot-checked `src/main.ts` (runtime-only browser probe, dismissal restored before watchers, `world.onReset` clears it), `src/ui/parent-gate.ts` (evented dismiss controller, literal text, `.install-hint` removed from the DOM when installed/dismissed) and `src/style.css` within phase scope. E2E assertions for AC-2..AC-5 remain Phase 3.
