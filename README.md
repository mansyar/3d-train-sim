# Tiny Tracks 🚂

A web-based 3D toy train table for toddlers — lay the track, press the
button, watch your train go.

Tiny Tracks is a digital Brio-style train set for little engineers aged
2–4. Kids drag chunky track pieces that snap together on a grid,
decorate their meadow with trees, houses, and critters, pick one of six
friendly locomotives, and press ▶ — every connected track comes alive
with its own train. No rules, no reading, no failure: just the pure joy
of cause and effect.

## What's on the table

- **Six locomotives** — Steam, Diesel, Tram, Express, Freight, and
  Bullet — each with its own pace, whistle voice, and wagon outfits
- **A growing toybox** — straights, curves, switches, hills, tunnels,
  bridges, and a railway crossing gate that really warns the trains
- **A living meadow** — a winding river with a barge and a frog,
  windmills, carousels, and a hot-air balloon that wanders the sky
- **Real work** — wagons load crates at one station and deliver them at
  the next, with a confetti burst and a growing platform pile
- **Day, night, and weather** — sunny mornings, golden sunsets, starry
  nights, rain, and snow (the river even freezes over)

## Play it

Tiny Tracks is an installable PWA: add it to the home screen on an iPad
or Android tablet and it works fully offline. There are no ads, no
tracking, no accounts, and no purchases — nothing ever leaves the
device.

Open a starter railway from the picture gallery behind the parent gate,
or start from an empty meadow and build your own. Worlds autosave, so
nothing is ever lost.

## For developers

Built with TypeScript, Three.js, Vite, Howler.js, and IndexedDB, as an
offline-first PWA — no backend, no framework, vanilla DOM overlay UI.

```bash
pnpm install   # Node ≥ 24, pnpm 11
pnpm dev       # Vite dev server
pnpm check     # biome + typecheck + vitest gates
```

Want to contribute? See [CONTRIBUTING.md](CONTRIBUTING.md) for setup,
quality gates, and the project's conductor track workflow. Project
management lives in [`conductor/`](conductor/index.md) — the product
definition, tech stack, and workflow docs are the source of truth.

## Assets

Scenery and rolling stock come from the [Kenney Train
Kit](https://kenney.nl) (CC0, glTF, embedded in the repo). Original
pieces — the tunnel, station, hill run, switches, crossing gate, barge,
and the delight toys — are authored in Blender via deterministic,
checked-in recipes in [`scripts/`](scripts/) that re-run in any Blender
session. No attribution required for either.
