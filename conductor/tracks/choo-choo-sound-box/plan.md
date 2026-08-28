# Implementation Plan — Choo-Choo Sound Box

Discipline per `conductor/workflow.md`: TDD (red → green per task), small commits
(`feat:/test:/chore:` with scope), plan tasks ticked off via
`conductor(plan): Mark task '<task>' as complete` commits, e2e last, `pnpm check` gate before wrap-up.

---

## Phase 0 — Dependencies & Assets

- [ ] **Task: Install Howler** — `pnpm add howler` (+ type package only if needed); confirm import works in a scratch check.
- [ ] **Task: Source CC0 audio** — pick chug loop, whistle, ding from CC0 packs; add ogg/mp3 to `public/audio/` + `CREDITS.md`.

## Phase 1 — Audio Controller (core, test-first)

- [ ] **Task: Red — controller unit tests** — `src/audio/audio-controller.test.ts` with a Howler seam mock: mute toggling (global, instant, default on), chug start/stop/re-entry idempotence, no-op when muted, one-shot whistle/ding API.
- [ ] **Task: Green — implement `createAudioController()`** — framework-free service, subscribable, lazy sound loading, placeholder-safe on failed loads.

## Phase 2 — Ride-synced chug (test-first)

- [ ] **Task: Red — ride coupling tests** — chug follows ride controller state; mid-ride world edit stops chug with the ride; dead-end pause softens chug, resume restores it.
- [ ] **Task: Green — wire in `init-scene.ts`** — ride controller subscribe → chug start/ease-out; motion-loop signal → pause softening (Howler `rate`/level only, no rAF-coupled DSP).

## Phase 3 — Whistle, dings & mute UI (test-first)

- [ ] **Task: Red — UI intent tests** — whistle button triggers one-shot anytime; mute toggle flips state and stops all audio; ding fires only on successful place/relocate (silent on failed drops and trash).
- [ ] **Task: Green — rail chrome + hooks** — big round whistle + chunky mute buttons in `src/ui/app.ts` toybox rail (matching chunky-panel styling); ding hook in `ping()` success path.
- [ ] **Task: First-gesture gate** — chug starts from the go press only; nothing sounds on page load.

## Phase 4 — PWA & verification

- [ ] **Task: Precache audio** — extend workbox `globPatterns` in `vite.config.ts` for `public/audio/` assets; confirm precache under the 6 MB cap.
- [ ] **Task: Extend Playwright smoke** — audio chrome mounts, mute toggle flips visible state, ride still runs, zero console/page errors.
- [ ] **Task: Full gate** — `pnpm check` (biome + tsc + vitest) green; manual tablet-shape pass (sound on/off, ride, whistle while riding).

## Phase 5 — Wrap-up

- [ ] **Task: Sync conductor docs** — note shipped behavior in `product.md`/`tech-stack.md` only where it diverged; registry status update.
- [ ] **Task: Handoff** — track ready for `conductor-review`.
