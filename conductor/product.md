# Product Definition: Tiny Tracks

## Product Vision
A world where every toddler can build their own railway and watch it come alive — no rules, no reading, no failure. Just the pure joy of cause and effect: lay the track, press the button, and watch your train go.

## Product Description
Tiny Tracks is a web-based 3D toy train world for toddlers (ages 2–4). Kids drag chunky, Brio-style track pieces that snap together on a grid, decorate their meadow world with toy scenery, choose one of six locomotives, then press ▶ to watch autonomous trains chug around their own creation — every connected track comes alive with its own train (up to four at once) — with whistles, steam puffs, and a friendly follow-camera. Touch-first, installable PWA that works fully offline on family iPads, Android tablets, and phones.

## Target Users
- **Primary:** Toddlers aged 2–4. Non-readers. Developing fine motor skills. Short attention spans reward instant, forgiving feedback.
- **Secondary:** Parents/caregivers. They install it, toggle sound, reset the sandbox, and trust what's on screen.

## Success Criteria
**The Toddler Test:** a 2–4 year-old plays unassisted for 10+ minutes, grins at their train, and asks for it again tomorrow.

Supporting guardrails:
- 60 FPS target on mid-spec tablets
- Cold load under ~5 seconds
- Autosave never loses a built world
- Zero crash sessions

## Competitive Edge
**Creator, not consumer.** The child builds something uniquely theirs and the game celebrates THEIR layout. Every arrangement of pieces works — infinite layouts, zero dead ends, guaranteed joy. No ads, no tracking, no purchases, no account, no internet required.

## Explicit Non-Goals (V1)
- **No driving mode** — the train is autonomous; kids are builders and watchers.
- **No fail states, no scoring, no timers, no levels.**
- **No text reading required** — icon-only UI.
- No multi-language, no accounts, no cloud sync, no app store distribution.

## Core Gameplay Loop
1. **Build:** drag track pieces (straights, 90° curves, crossings, a railway crossing gate, bridges, tunnels) from the toybox; they snap satisfyingly to the grid. Pieces can be lifted with a tap, dragged to a new spot, or dropped on the toybox trash bin to put them away. A ↩️ take-back in the bottom bar undoes the very last move.
2. **Decorate:** drop trees, houses, animals, stations anywhere.
3. **Play:** choose one of six friendly locomotives, then press ▶ — every connected track gets its own train (up to 4 concurrent, ranked most-pieces-first) that chugs with sound and steam, pausing ~2 s at any station with a happy ding-ding — empty wagons pop aboard a
crate there, loaded wagons deliver theirs in a confetti burst, and the station's
platform keeps the delivered crates (up to 8); the chase camera follows one train, and the 🎥 button cycles between riding trains and the overview while ≥2 ride. Whistle button. ⏹ stops them all.
4. **Reset:** always autosaved; full reset only behind a parent gate (long-press).

## V1 Scope (Lean Core)
- Grid-snap track building on a single grassy meadow
- Scenery placement (trees, houses, animals, stations)
- Six selectable autonomous locomotives running any layout — one train per connected track (up to 4 concurrent): closed loops loop forever; open layouts (dead ends) ride in, pause, and shuttle back
- 🎥 camera cycling between riding trains and the overview (visible at ≥2 rides; hidden under reduced motion)
- Go / stop / whistle control panel
- Follow-camera
- Sound: chug loop, whistle, happy dings, soft knock for drops that bounce home
- Autosave via IndexedDB
- Parent-gated full reset (long-press)
- PWA offline install

## Shipped Roadmap (History)

Every originally-listed candidate has shipped; this section is the record, not the plan. The next roadmap follows it.

- ~~Reactive characters~~ — ✅ shipped in V1: critters near the track hop with squash-and-stretch and chirp as the train passes (mute-respecting)
- ~~Expanded train collection: cargo wagons~~ — ✅ shipped: every locomotive pulls two bundled cargo wagons; ✅ wagon workshop (wagon-workshop_20260904, 2026-09-04): each locomotive dresses its pair from 4 curated presets (classic lumber-and-box, coal duo, tank duo, red-and-blue containers) — icon-only picker, per-train choices persist across reloads, purely cosmetic cargo. ✅ fleet expansion (loco-fleet_20260905, 2026-09-05): six selectable locomotives — Express, Freight, and Bullet join Steam, Diesel, and Tram, all from the already-vendored kit (zero new downloads), each with its own pace personality, family whistle voice, and per-train wagon outfits; scrollable six-engine picker row.
- ~~Track switches and branches~~ — ✅ shipped (switches-branches_20260903, 2026-09-03): a Blender-authored Y-junction (`switch.glb`) with a straight through-road and a curved diverging branch; each train alternates branches every pass through the stem, point blades visibly flip to the chosen road, saves stay additive with no version bump. ✅ left-mirror shipped (mirror-switch_20260904, 2026-09-04): a second Blender-authored Y (`switch-mirror.glb`) branching west, with the same stem alternation and visible blade flips. ✅ three-way junction + motorized levers shipped (switchyard_20260913, 2026-09-14): a Blender-authored three-way piece (`switch-3way.glb`) where the stem cycles straight → right → left on successive passes, and every switch (both Ys and the three-way) grew a motorized signal lever that swings to point at the road the train will take as the points flip — no new controls, no reading, saves additive. ✅ double-slip switch shipped (double-slip-switch_20260930, 2026-09-30): a Blender-authored four-way slip (`switch-slip.glb`) where every entry cycles straight → east diagonal → west diagonal on successive passes, each entry's point blades and the signal lever following the chosen road — the last named roadmap item; the roadmap is now open-ended.
- ~~Bridges~~ — ✅ shipped (river-bridge track, 2026-08-30): the meadow's river is now terrain — an S-curve water strip with 3-tile build-exclusion banks — and trestle bridges are a placable asset class that spans water (track/scenery ghosts red over it).
- ~~Tunnels~~ — ✅ shipped (tunnels_20260831, 2026-09-02): a grassy vault the train rides through, merging into one long hill end-to-end, with chug duck, whistle echo, winter snow cap, and night portal glow.
- ~~Elevation~~ — ✅ shipped (hills-ramps_20260903, 2026-09-03): the meadow gains real height — a three-piece hill run (`slope-up` climbs, `hill` cruises the crest, `slope-down` descends) with gentle auto-blending at any joint, chase camera following over the top, and winter snow crowns. ✅ phase 2 shipped (hills-phase2_20260904, 2026-09-04): the gentle half-height bump run and the banked elevated corners.
- ~~Station cargo gameplay~~ — ✅ shipped (cargo-pickups_20260902, 2026-09-02): wagons load crates at a station and deliver at the next — confetti burst, and the station's platform (Kenney-matched restyle, Blender-authored) accumulates up to 8 delivered crates that persist in the save.
- **Time of day and weather** — ✅ shipped (time-of-day-weather_20260830, 2026-08-30): dawn→noon→dusk→night sky, warm window glows, rain and snow with ground whitening, headlight, tunnel portal glow at night. ✅ extended (sun-moon_20260930, 2026-10-01): a sun/moon button on the toybox rail lets the child turn the page on the day themselves — each tap advances to the next phase (dawn→morning→noon→dusk→night), the button previews the phase a tap brings, the automatic drift resumes from wherever the tap landed, and the chosen time of day rides in the save so a reload returns to it (additive optional `preferences.dayPhase`; saves without it boot to mid-morning, no version bump).
- Railway crossing gate — ✅ shipped (railway-crossing-gate_20260905, 2026-09-05): a road-level crossing piece on the Rails tab; any train's approach swings the little red-and-white gates shut with a blinking lantern and a soft CC0 bell, the pass lifts them, and the piece wears a snow cap in winter (Blender-authored via a checked-in recipe).
- Scenery delight toys — ✅ shipped (scenery-delight_20260905, 2026-09-06): three animated town-tab toys, each Blender-authored via a checked-in recipe with a winter snow cap — a windmill whose sails turn in the breeze, a carousel with three little horses revolving under the canopy, and a hot-air balloon that rests, lifts off, wanders its own 2–3-cell neighborhood, and lands again; all motion freezes under reduced motion.
- Music box — ✅ shipped (music-box_20260913, 2026-09-13): a singing town-tab toy, Blender-authored via a checked-in recipe with a winter snow cap — its figurine twirls and it chimes one of four public-domain nursery melodies (ABC/Twinkle, Mary Had a Little Lamb, London Bridge, Row Row Row Your Boat) as a riding train passes, never repeating the previous tune; the phrase finishes gently on ⏹, and every note is synthesized in the browser (zero new downloads).
- River life — ✅ shipped (river-life-expansion_20260905, 2026-09-05): the river gains a drifting Blender-authored cargo barge (`barge.glb` via a checked-in recipe; low-profile water-level bridge pass, engine off at bedtime/frozen while the bob never stops) and the frog — a floating critter placable on water cells (lily pad resting at the surface) or on land, hopping with a soft synthesized ribbit as the train passes; the barge is ambience (not serialized), so saves stay additive with no version bump.
- ~~Multi-train layouts~~ — ✅ shipped (every-layout-rides track, 2026-08-30): one autonomous train per connected track, 🎥 camera cycling between rides and the overview, whistle targeting, shared chug

## Roadmap (Next)

The named roadmap closed with the double-slip switch. This roadmap is deliberately sequenced by **risk**, not by feature appeal: first the only failure a child experiences as permanent (lost work), then the cost of future change, then proof of the product thesis. Estimates assume one maintainer, full-time-equivalent; one track in flight at a time, a release every 2–3 tracks.

**North star (unchanged):** the Toddler Test.
**Guardrails (never traded):** no data loss · offline-complete · 60 FPS on mid tablets · cold start <5 s · zero network requests · no reading required.

### Phase 0 — Bedrock (v0.11, ~2 weeks)

*Theme: pull the plug, corrupt the file, go offline — the world survives.*

| Track | Priority | Effort | Done when |
|---|---|---|---|
| `save-resilience_20261107` | P0 | 4d | A malformed or duplicate piece is dropped while every valid piece is kept (no more all-or-nothing `emptyWorld()`); autosave writes two slots (`current` + `previous`); a corrupt snapshot recovers; regression tests cover six corruption classes. **Shipped 2026-11-07 (PR 65)** |
| `world-portability_20261107` | P0 | 3d | Parent-gated JSON export and import; round-trip identity test; exported world under 100 KB. **Shipped 2026-11-07 (PR 66)** — a 64-piece world exports at 4.5 KB |
| `runtime-guarantees_20261107` | P0 | 2d | `woff2` (not legacy `woff`) is precached, so an offline cold start keeps the bundled font; a Playwright spec against the built app proves boot, placement and ride with the network disabled; `nginx.conf` sends the CSP from one include on the server and every location, plus `X-Content-Type-Options` and `Referrer-Policy`; a unit test fails if the nginx copy drifts. **Shipped 2026-11-07** — `connect-src 'self' blob:` replaces the `'none'` written above, because Howler fetches audio over XHR and three.js reads GLB textures back through blob URLs; the offline spec runs on Chromium, since Playwright's WebKit cannot take a service-worker page offline |
| `deps-guardrails_20261107` | P1 | 0.5d | Grouped Renovate config; `pnpm audit` gate in CI. **Shipped 2026-11-07** — the gate landed only after clearing the backlog it exposed: 15 high advisories (all in build/test tooling) went to zero through a `vite` bump plus four `overrides`, each commented with its GHSA. No dated ignore was needed. Enabling the Renovate app on the repository is a manual step outside the track |

**Phase exit:** simulated storage eviction, a hand-corrupted snapshot, and a cold airplane-mode start all recover without losing a piece — and the privacy promise is enforced by headers, not by convention.

### Phase 1 — Under the Hood (v0.12, ~2 weeks)

*Theme: make the next year of tracks cheap. No new player-visible features.*

| Track | Priority | Effort | Done when |
|---|---|---|---|
| `renderer-decomposition_20261108` | P1 | 6d | `track-renderer.ts` splits into catalog, placement, picking, and ambient-actor modules; no scene file exceeds 500 lines; the public facade is unchanged and e2e parity holds. **Shipped 2026-11-07** - the facade is now 195 lines over six owned parts (catalogue, placement, ghost, picking, crossings, ambience), the `TrackRenderer` interface is byte-identical, the grid maths moved to `src/core/meadow-grid.ts` so `src/ui` imports nothing from the scene, and `src/core/import-graph.test.ts` keeps the directions (and the line budgets) the split was for. Gzipped bundle growth: +577 B. The 500-line folder goal is still missed by a pre-existing file outside this track's Touches (`train-fleet.ts` 552) |
| `frame-contract_20261109` | P2 | 2d | Subsystems register in an ordered array; the order is documented as a contract; a smoke test asserts each system ticks once per frame. **Shipped 2026-11-08** — twelve named systems in `src/scene/frame-contract.ts` with one reason per entry and a boot-time order check; `e2e/frame-contract.spec.ts` proves 30 frames advance every system exactly 30 ticks; behaviour unchanged (smoke green, gzip +546 B). |
| `boot-simplification_20261109` | P2 | 2d | The canvas exists before the UI mounts; the three listener-replay queues in `main.ts` are deleted. **Shipped 2026-11-08** — `mountShell` writes the frame, `initScene` binds, `mountControls` wires against a bound scene; the eighteen `scene?.` closures, three replay loops, splice unsubscribes and `?? DEFAULT_DAY_PHASE` fallbacks are gone, so a missing scene is a `tsc` error (`src/ui/boot-order.test.ts` also reads `main.ts` for the order and the absence of queues). Behaviour unchanged: 898 unit tests, matrix 57 passed / 1 skipped, 178 precache entries, gzipped JS **−227 B** vs the base build |
| `process-hygiene_20261109` | P3 | 0.5d | Stale archived statuses normalized; one registry table covering every archived track; the parent-only long-press exception and `user-scalable=no` recorded as intentional decisions. **Shipped 2026-11-09** — registry rebuilt as one 67-row all-`archived` table (trailing duplicate name list removed), both intentional decisions recorded in `product-guidelines.md` |

**Phase exit:** adding one new piece type touches at most four files, and onboarding a contributor no longer depends on tribal knowledge of frame order.

### Phase 2 — Toddler First (v1.0, ~3 weeks)

*Theme: every product claim is backed by a measurement or a test.*

| Track | Priority | Effort | Done when |
|---|---|---|---|
| `clarity-audit_20261110` | P0 | 5d | Observed sessions with three children aged 2–4; baseline time-to-first-ride and unassisted session length recorded; friction list ranked |
| `progressive-disclosure_20261110` | P0 | 4d | First run offers basics only; advanced pieces (three-way, double-slip, cargo loop) live in a second tier; measured improvement over baseline |
| `local-insights_20261111` | P1 | 3d | Parent-gate panel shows sessions, longest session, reset count, storage health, and a crash counter — on device only, never transmitted |
| `install-onboarding_20261111` | P1 | 1.5d | `display-mode` detection plus an iOS "Add to Home Screen" hint behind the parent gate, needing no reading |
| `a11y-pass_20261111` | P1 | 3d | axe clean in e2e; visible focus states; contrast audit; zoom policy settled |
| `perf-budget_20261111` | P1 | 2.5d | CI asserts interactive start under 5 s and an FPS floor on the tablet profile; failure blocks merge |

**v1.0 ship gate:**
- Three of three children reach a first ride unassisted within 60 seconds
- A 10+ minute unassisted session is observed
- Zero data-loss incidents across the audit
- All six CI gates green, CSP active in production
- 30 days of dogfooding on family devices with no manual storage rescue

### Phase 3 — Depth over Breadth (v1.x, decision gate at v1.0)

Pick exactly one direction; do not start a second until it ships.

| Option | What it is | Effort | Why it fits |
|---|---|---|---|
| **A. Rituals** *(recommended)* | Deepen the existing day/weather clock: train bedtime, morning wake-up, seasonal transitions, matching audio | 5–8d | Zero new UI surface; deepens systems already built; depth without cognitive load |
| **B. Expression** | Child-applied paint/sticker liveries for trains and stations | 8–10d | Maximum agency per new control; fits "creator, not consumer" |
| **C. Shared Play** | Two-child local co-build on one tablet with split touch zones, no accounts | 10–14d | Highest delight ceiling, highest interaction risk for a two-year-old |

Recommendation: **A**, then **B**; defer **C** until the clarity audit shows the solo loop is saturated.

### Anti-roadmap (explicitly out of scope)

No accounts · no cloud sync · no analytics SDK · no ads or purchases · no network multiplayer · no physics engine · no new track piece types before the clarity audit · no new locomotives before v1.0.

Each is a legitimate idea. None fixes a permanent-loss or measurement gap, and each adds surface a non-reader must parse.

## Platform & Technical Requirements
- **Devices:** iPads (Safari) + mid-spec Android tablets (Chrome) primary; phones (≥360px) supported as first-class. Touch-first; desktop browser support welcome but secondary.
- **Stack:** TypeScript · Three.js (GLTFLoader) · Vite · vanilla DOM overlay UI · Howler.js · IndexedDB persistence · PWA (service worker) · Vitest (logic TDD) + Playwright (smoke tests).
- **Assets:** Kenney Train Kit (CC0, glTF) — embedded in repo, no attribution required. Original pieces (the tunnel) are Blender-authored via deterministic, checked-in recipes (`scripts/blender-tunnel.py`) — re-runnable in any Blender session, no attribution required.
- **Performance:** simple scenes, zero physics engine, kinematic train on splines.

## Deployment & Operations
Git tag → Docker build (nginx serving static build) → push to public GHCR → Coolify deploys prod. Production only. Served on a public domain for family devices.
