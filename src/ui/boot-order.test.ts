import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { AppOptions } from './app';

/**
 * Boot-order guard: `main.ts` must mount the shell, bind the scene, then wire
 * the controls — the order that deleted the pre-bind gap. The call-site and
 * queue assertions read the comment-stripped copy, because the comments in
 * `main.ts` legitimately name the queues this track removed and describe the
 * mount calls; a comment must neither satisfy the order nor hide a real queue.
 */
const MAIN_SOURCE = fileURLToPath(new URL('../main.ts', import.meta.url));

const mainSource = readFileSync(MAIN_SOURCE, 'utf8');
const mainWithoutComments = mainSource
  .replaceAll(/\/\*[\s\S]*?\*\//g, '')
  .replaceAll(/\/\/[^\n]*/g, '');

/**
 * The same copy without string literals, so a label such as `'scene,'` cannot
 * stand in for the argument this guard is looking for.
 */
const mainCodeOnly = mainWithoutComments.replaceAll(
  /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\$]|\\.)*`/g,
  "''",
);

/** The slice of `source` inside the braces that open at `open`. */
function blockFrom(source: string, open: number): string {
  let depth = 0;

  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }

  return source.slice(open);
}

/** The line metric `import-graph.test.ts` uses, so the counts agree. */
const lineCount = (content: string): number => content.replace(/\n$/, '').split('\n').length;

/**
 * The `scene` entry of the `mountControls` options object, or `null`. String
 * literals are blanked first so a label cannot stand in for the argument, and
 * the object is brace-matched so nesting and spelling do not matter.
 */
function sceneArgument(source: string): string | null {
  const code = source.replaceAll(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\$]|\\.)*`/g, "''");
  const call = code.indexOf('mountControls(');
  if (call === -1) return null;

  const brace = code.indexOf('{', code.indexOf(',', call));
  if (brace === -1) return null;

  const options = blockFrom(code, brace);
  return /\bscene\s*[,:}]/.test(options) ? options : null;
}

describe('the mountControls options', () => {
  it('require a bound scene, proven by the compiler rather than by review', () => {
    // Type-only import above, so nothing from app.ts loads at runtime.
    const partial = { world: {} as never, audio: {} as never };

    // @ts-expect-error a scene is required — wiring before the bind is the bug this track deleted
    const withoutScene: AppOptions = partial;

    // The positive control: the same object plus a scene compiles with no
    // directive, so the fixture cannot pass because "everything errors".
    const withScene: AppOptions = { ...partial, scene: {} as AppOptions['scene'] };

    expect('scene' in withoutScene).toBe(false);
    expect('scene' in withScene).toBe(true);
  });
});

describe('the src/main.ts boot order', () => {
  it('finds all three mounts, so the order guard cannot pass vacuously', () => {
    expect(mainWithoutComments.length).toBeGreaterThan(0);
    expect(lineCount(mainSource)).toBeGreaterThan(100);
    expect(mainWithoutComments).toContain('mountShell(');
    expect(mainWithoutComments).toContain('initScene(');
    expect(mainWithoutComments).toContain('mountControls(');
  });

  it('mounts the shell, then the scene, then the controls', () => {
    const shell = mainWithoutComments.indexOf('mountShell(');
    const scene = mainWithoutComments.indexOf('initScene(');
    const controls = mainWithoutComments.indexOf('mountControls(');
    // Every index is in the message, so a regression says which call moved.
    const indexes = `mountShell=${shell}, initScene=${scene}, mountControls=${controls}`;

    expect(shell, `mountShell( not found in src/main.ts (${indexes})`).toBeGreaterThan(-1);
    expect(scene, `initScene( not found in src/main.ts (${indexes})`).toBeGreaterThan(-1);
    expect(controls, `mountControls( not found in src/main.ts (${indexes})`).toBeGreaterThan(-1);
    expect(shell, `expected mountShell → initScene; got ${indexes}`).toBeLessThan(scene);
    expect(scene, `expected initScene → mountControls; got ${indexes}`).toBeLessThan(controls);
  });

  it('carries no listener queue, no replay, and no collection at all', () => {
    // Name-based scans are guesswork: a queue called `subs`, `callbacks` or
    // `rideMode` would slip one. So the invariant is stated without a name:
    // today the boot file holds no loop and no collection, and any of these
    // returning is a deliberate conversation rather than a false positive.
    // If the mount sequence ever moves into a helper module, this guard moves
    // with it instead of passing silently.
    expect(mainCodeOnly, 'a loop returned to src/main.ts').not.toMatch(/\bfor\s*\(/);
    expect(mainCodeOnly, 'a forEach replay returned to src/main.ts').not.toMatch(/\.forEach\s*\(/);
    expect(mainCodeOnly, 'a collection returned to src/main.ts').not.toMatch(
      /\bnew\s+(?:Set|Map|Array|WeakMap|WeakSet)\b/,
    );

    // The shape scan stays alongside it, so a failure names the queue it found
    // rather than only the invariant it broke.
    const declarations = [
      ...mainCodeOnly.matchAll(
        /(?:const|let)\s+\w*(?:listeners?|queue|pending|buffer|subscribers?|subs|callbacks?|hooks?)\b[^=;\n]*=\s*(?:\[|new\s+(?:Set|Map|Array))/gi,
      ),
    ].map((match) => match[0]);

    expect(declarations, 'a listener queue returned to src/main.ts').toEqual([]);
  });

  it('hands the bound scene to mountControls', () => {
    // Brace-matched, so nesting inside the object is fine, and string-blanked,
    // so a label such as 'scene,' cannot stand in for the argument.
    expect(
      sceneArgument(mainWithoutComments),
      'mountControls must be called with an options object carrying the bound scene',
    ).toBeTruthy();
  });

  it('accepts every spelling of the same correct call and no decoy', () => {
    const accepted = [
      'mountControls(root, { world, audio, scene, isReady });',
      'mountControls(root, { world, audio, scene: handle });',
      'mountControls(root, { world, audio, isReady: () => { return true; }, scene });',
      'mountControls(root, {\n  world,\n  scene: sceneHandle,\n});',
    ];
    const rejected = [
      "mountControls(root, { world, audio, note: 'scene,' });",
      'mountControls(root, { world, audio, sceneHandle });',
      'mountControls(root);',
    ];

    for (const source of accepted) expect(sceneArgument(source), source).toBeTruthy();
    for (const source of rejected) expect(sceneArgument(source), source).toBeNull();
  });
});
