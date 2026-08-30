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
1. **Build:** drag track pieces (straights, 90° curves, crossings) from the toybox; they snap satisfyingly to the grid. Pieces can be lifted with a tap, dragged to a new spot, or dropped on the toybox trash bin to put them away.
2. **Decorate:** drop trees, houses, animals, stations anywhere.
3. **Play:** choose one of three friendly locomotives, then press ▶ — every connected track gets its own train (up to 4 concurrent, ranked most-pieces-first) that chugs with sound and steam, pausing ~2 s at any station with a happy ding-ding; the chase camera follows one train, and the 🎥 button cycles between riding trains and the overview while ≥2 ride. Whistle button. ⏹ stops them all.
4. **Reset:** always autosaved; full reset only behind a parent gate (long-press).

## V1 Scope (Lean Core)
- Grid-snap track building on a single grassy meadow
- Scenery placement (trees, houses, animals, stations)
- Three selectable autonomous locomotives running any layout — one train per connected track (up to 4 concurrent): closed loops loop forever; open layouts (dead ends) ride in, pause, and shuttle back
- 🎥 camera cycling between riding trains and the overview (visible at ≥2 rides; hidden under reduced motion)
- Go / stop / whistle control panel
- Follow-camera
- Sound: chug loop, whistle, happy dings
- Autosave via IndexedDB
- Parent-gated full reset (long-press)
- PWA offline install

## Future Scope (Roadmap Candidates)
- ~~Reactive characters~~ — ✅ shipped in V1: critters near the track hop with squash-and-stretch and chirp as the train passes (mute-respecting)
- ~~Expanded train collection: cargo wagons~~ — ✅ shipped: every locomotive pulls two bundled cargo wagons (colors/other variants still roadmap)
- Track switches and branches
- Bridges, tunnels, elevation
- Time of day and weather
- ~~Multi-train layouts~~ — ✅ shipped (every-layout-rides track, 2026-08-30): one autonomous train per connected track, 🎥 camera cycling between rides and the overview, whistle targeting, shared chug

## Platform & Technical Requirements
- **Devices:** iPads (Safari) + mid-spec Android tablets (Chrome) primary; phones (≥360px) supported as first-class. Touch-first; desktop browser support welcome but secondary.
- **Stack:** TypeScript · Three.js (GLTFLoader) · Vite · vanilla DOM overlay UI · Howler.js · IndexedDB persistence · PWA (service worker) · Vitest (logic TDD) + Playwright (smoke tests).
- **Assets:** Kenney Train Kit (CC0, glTF) — embedded in repo, no attribution required.
- **Performance:** simple scenes, zero physics engine, kinematic train on splines.

## Deployment & Operations
Git tag → Docker build (nginx serving static build) → push to public GHCR → Coolify deploys prod. Production only. Served on a public domain for family devices.
