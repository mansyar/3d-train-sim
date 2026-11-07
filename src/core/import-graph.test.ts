import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Layering guard: the scene decomposition is only worth its weight if the
 * new seams stay sealed. This walks the real sources, resolves every import
 * to a repo-relative module, and asserts the directions the architecture
 * promises. Exceptions are named one by one with the reason they exist —
 * never by softening a rule for every file.
 */
const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));
const ROOT_DIR = fileURLToPath(new URL('../..', import.meta.url));

const SCENE_DIR = 'src/scene/';
const UI_DIR = 'src/ui/';
const CORE_DIR = 'src/core/';

/** The seven modules the renderer split into (renderer plus six parts). */
const TRACK_MODULES = [
  'track-renderer',
  'track-catalog',
  'track-placement',
  'track-ghost',
  'track-picking',
  'track-crossings',
  'track-ambience',
] as const;

/** The one place that may import the scene facade, and why. */
const RENDERER_IMPORTERS: Record<string, string> = {
  'src/scene/init-scene': 'the assembler builds the one renderer and drives it',
  'src/scene/scene-context': 'names the handle type in the shared refs bundle',
};

/** Modules that may read the live placement handle, and why. */
const PLACEMENT_READERS: Record<string, string> = {
  'src/scene/track-renderer': 'the facade constructs placement once and wires its hooks',
  'src/scene/track-crossings': 'reads the live rendered/tracked maps for gate and switch poses',
  'src/scene/track-picking':
    'reads the live rendered/tracked maps for the tap hit test (type-only)',
};

/** What placement itself may depend on among its sibling track modules. */
const PLACEMENT_DEPENDENCIES: Record<string, string> = {
  'src/scene/track-catalog':
    'the catalogue is pure data (URLs, anchors, yaw) with no scene state to reach into',
};

interface ImportEdge {
  /** Importing file, repo-relative and extensionless (`src/ui/app`). */
  from: string;
  /** Relative targets resolve to a repo path; packages stay as written. */
  to: string;
  specifier: string;
  /** Absolute target of a relative import, extension included. */
  path: string | undefined;
}

const FROM_PATTERN = /\bfrom\s+['"]([^'"]+)['"]/;
const SIDE_EFFECT_PATTERN = /^\s*import\s+['"]([^'"]+)['"]/;

/** Comments cannot add or hide an edge, so strip them before parsing. */
function stripComments(source: string): string {
  return source.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/[^\n]*/g, '');
}

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if (entry.name.endsWith('.ts')) files.push(path);
  }
  return files;
}

/** Repo-relative, forward-slashed and extensionless, for stable assertions. */
function moduleName(absolutePath: string): string {
  return relative(ROOT_DIR, absolutePath)
    .replaceAll('\\', '/')
    .replace(/\.ts$/, '')
    .replace(/\.css$/, '');
}

function importEdges(): ImportEdge[] {
  const edges: ImportEdge[] = [];
  for (const file of sourceFiles(SRC_DIR)) {
    const from = moduleName(file);
    for (const line of stripComments(readFileSync(file, 'utf8')).split('\n')) {
      const match = FROM_PATTERN.exec(line) ?? SIDE_EFFECT_PATTERN.exec(line);
      const specifier = match?.[1];
      if (!specifier) continue;
      const to = specifier.startsWith('.')
        ? moduleName(resolve(dirname(file), specifier))
        : specifier;
      edges.push({
        from,
        to,
        specifier,
        path: specifier.startsWith('.') ? resolve(dirname(file), specifier) : undefined,
      });
    }
  }
  return edges;
}

const EDGES = importEdges();
const FILES = sourceFiles(SRC_DIR).map(moduleName);

const importers = (target: string): string[] => [
  ...new Set(EDGES.filter((edge) => edge.to === target).map((edge) => edge.from)),
];

const trackName = (module: string): string | null =>
  TRACK_MODULES.find((name) => module === `${SCENE_DIR}${name}`) ?? null;

const forbidden = (edges: ImportEdge[], allowed: Record<string, string>): ImportEdge[] =>
  edges.filter((edge) => !(edge.to in allowed));

describe('source import graph', () => {
  it('is walked, not assumed, so the rules cannot pass vacuously', () => {
    expect(FILES.length).toBeGreaterThan(50);
    expect(EDGES.length).toBeGreaterThan(100);
    // Every relative import must resolve to a real file on disk — a broken
    // resolver would silently hide edges rather than fail here.
    for (const edge of EDGES) {
      if (!edge.path) continue;
      expect(
        existsSync(edge.path) ||
          existsSync(`${edge.path}.ts`) ||
          existsSync(join(edge.path, 'index.ts')),
        `${edge.from} imports ${edge.specifier}, which resolves to no file`,
      ).toBe(true);
    }
    expect([...new Set(FILES.filter((file) => trackName(file)))].sort()).toEqual(
      TRACK_MODULES.map((name) => `${SCENE_DIR}${name}`).sort(),
    );
    // Edges the rules below depend on: if the parser misses these, the guard
    // has gone quiet rather than green.
    expect(EDGES).toContainEqual(
      expect.objectContaining({ from: `${SCENE_DIR}init-scene`, to: `${SCENE_DIR}track-renderer` }),
    );
    expect(EDGES).toContainEqual(
      expect.objectContaining({
        from: `${SCENE_DIR}track-crossings`,
        to: `${SCENE_DIR}track-placement`,
      }),
    );
    expect(EDGES).toContainEqual(
      expect.objectContaining({ from: 'src/ui/app', to: 'src/core/meadow-grid' }),
    );
  });

  it('keeps the UI out of the scene layer', () => {
    const offenders = EDGES.filter(
      (edge) => edge.from.startsWith(UI_DIR) && edge.to.startsWith(SCENE_DIR),
    );
    expect(offenders).toEqual([]);
  });

  it('keeps core pure: no scene, no UI, no three', () => {
    const offenders = EDGES.filter(
      (edge) =>
        edge.from.startsWith(CORE_DIR) &&
        (edge.to.startsWith(SCENE_DIR) ||
          edge.to.startsWith(UI_DIR) ||
          edge.to === 'three' ||
          edge.specifier.startsWith('three/')),
    );
    expect(offenders).toEqual([]);
  });

  it('lets placement depend only on the catalogue data tables', () => {
    const placement = `${SCENE_DIR}track-placement`;
    const siblings = EDGES.filter((edge) => edge.from === placement && trackName(edge.to) !== null);
    expect(forbidden(siblings, PLACEMENT_DEPENDENCIES)).toEqual([]);
    expect(siblings.map((edge) => edge.to).sort()).toEqual(
      Object.keys(PLACEMENT_DEPENDENCIES).sort(),
    );
  });

  it('frees ambience, ghost and the catalogue from placement internals', () => {
    const sealed = new Set([`${SCENE_DIR}track-placement`, `${SCENE_DIR}track-renderer`]);
    const offenders = EDGES.filter(
      (edge) =>
        (trackName(edge.from) === 'track-ambience' ||
          trackName(edge.from) === 'track-ghost' ||
          trackName(edge.from) === 'track-catalog') &&
        sealed.has(edge.to),
    );
    expect(offenders).toEqual([]);
  });

  it('reads the placement handle only from the sanctioned modules', () => {
    expect(importers(`${SCENE_DIR}track-placement`).sort()).toEqual(
      Object.keys(PLACEMENT_READERS).sort(),
    );
  });

  it('reaches the renderer facade only from its two known importers', () => {
    expect(importers(`${SCENE_DIR}track-renderer`).sort()).toEqual(
      Object.keys(RENDERER_IMPORTERS).sort(),
    );
  });
});
