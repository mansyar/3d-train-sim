# Product Definition: Tiny Tracks

## Product Vision
A world where every toddler can build their own railway and watch it come alive — no rules, no reading, no failure. Just the pure joy of cause and effect: lay the track, press the button, and watch your train go.

## Product Description
Tiny Tracks is a web-based 3D toy train world for toddlers (ages 2–4). Kids drag chunky, Brio-style track pieces that snap together on a grid, decorate their meadow world with toy scenery, choose one of three locomotives, then press ▶ to watch autonomous trains chug around their own creation — every connected track comes alive with its own train (up to four at once) — with whistles, steam puffs, and a friendly follow-camera. Touch-first, installable PWA that works fully offline on family iPads, Android tablets, and phones.

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
3. **Play:** choose one of three friendly locomotives, then press ▶ — every connected track gets its own train (up to 4 concurrent, ranked most-pieces-first) that chugs with sound and steam, pausing ~2 s at any station with a happy ding-ding — empty wagons pop aboard a
crate there, loaded wagons deliver theirs in a confetti burst, and the station's
platform keeps the delivered crates (up to 8); the chase camera follows one train, and the 🎥 button cycles between riding trains and the overview while ≥2 ride. Whistle button. ⏹ stops them all.
4. **Reset:** always autosaved; full reset only behind a parent gate (long-press).

## V1 Scope (Lean Core)
- Grid-snap track building on a single grassy meadow
- Scenery placement (trees, houses, animals, stations)
- Three selectable autonomous locomotives running any layout — one train per connected track (up to 4 concurrent): closed loops loop forever; open layouts (dead ends) ride in, pause, and shuttle back
- 🎥 camera cycling between riding trains and the overview (visible at ≥2 rides; hidden under reduced motion)
- Go / stop / whistle control panel
- Follow-camera
- Sound: chug loop, whistle, happy dings, soft knock for drops that bounce home
- Autosave via IndexedDB
- Parent-gated full reset (long-press)
- PWA offline install

## Future Scope (Roadmap Candidates)
- ~~Reactive characters~~ — ✅ shipped in V1: critters near the track hop with squash-and-stretch and chirp as the train passes (mute-respecting)
- ~~Expanded train collection: cargo wagons~~ — ✅ shipped: every locomotive pulls two bundled cargo wagons; ✅ wagon workshop (wagon-workshop_20260904, 2026-09-04): each locomotive dresses its pair from 4 curated presets (classic lumber-and-box, coal duo, tank duo, red-and-blue containers) — icon-only picker, per-train choices persist across reloads, purely cosmetic cargo.
- ~~Track switches and branches~~ — ✅ shipped (switches-branches_20260903, 2026-09-03): a Blender-authored Y-junction (`switch.glb`) with a straight through-road and a curved diverging branch; each train alternates branches every pass through the stem, point blades visibly flip to the chosen road, saves stay additive with no version bump. Still roadmap: motorized levers, double-slip/3-way pieces. ✅ left-mirror shipped (mirror-switch_20260904, 2026-09-04): a second Blender-authored Y (`switch-mirror.glb`) branching west, with the same stem alternation and visible blade flips.
- ~~Bridges~~ — ✅ shipped (river-bridge track, 2026-08-30): the meadow's river is now terrain — an S-curve water strip with 3-tile build-exclusion banks — and trestle bridges are a placable asset class that spans water (track/scenery ghosts red over it).
- ~~Tunnels~~ — ✅ shipped (tunnels_20260831, 2026-09-02): a grassy vault the train rides through, merging into one long hill end-to-end, with chug duck, whistle echo, winter snow cap, and night portal glow.
- ~~Elevation~~ — ✅ shipped (hills-ramps_20260903, 2026-09-03): the meadow gains real height — a three-piece hill run (`slope-up` climbs, `hill` cruises the crest, `slope-down` descends) with gentle auto-blending at any joint, chase camera following over the top, and winter snow crowns. Still roadmap: `bump-up`/`bump-down` pieces, elevated corners/corner-ramps, and half-height cruise variants.
- ~~Station cargo gameplay~~ — ✅ shipped (cargo-pickups_20260902, 2026-09-02): wagons load crates at a station and deliver at the next — confetti burst, and the station's platform (Kenney-matched restyle, Blender-authored) accumulates up to 8 delivered crates that persist in the save.
- **Time of day and weather** — ✅ shipped (time-of-day-weather_20260830, 2026-08-30): dawn→noon→dusk→night sky, warm window glows, rain and snow with ground whitening, headlight, tunnel portal glow at night.
- Railway crossing gate — ✅ shipped (railway-crossing-gate_20260905, 2026-09-05): a road-level crossing piece on the Rails tab; any train's approach swings the little red-and-white gates shut with a blinking lantern and a soft CC0 bell, the pass lifts them, and the piece wears a snow cap in winter (Blender-authored via a checked-in recipe).
- ~~Multi-train layouts~~ — ✅ shipped (every-layout-rides track, 2026-08-30): one autonomous train per connected track, 🎥 camera cycling between rides and the overview, whistle targeting, shared chug

## Platform & Technical Requirements
- **Devices:** iPads (Safari) + mid-spec Android tablets (Chrome) primary; phones (≥360px) supported as first-class. Touch-first; desktop browser support welcome but secondary.
- **Stack:** TypeScript · Three.js (GLTFLoader) · Vite · vanilla DOM overlay UI · Howler.js · IndexedDB persistence · PWA (service worker) · Vitest (logic TDD) + Playwright (smoke tests).
- **Assets:** Kenney Train Kit (CC0, glTF) — embedded in repo, no attribution required. Original pieces (the tunnel) are Blender-authored via deterministic, checked-in recipes (`scripts/blender-tunnel.py`) — re-runnable in any Blender session, no attribution required.
- **Performance:** simple scenes, zero physics engine, kinematic train on splines.

## Deployment & Operations
Git tag → Docker build (nginx serving static build) → push to public GHCR → Coolify deploys prod. Production only. Served on a public domain for family devices.
