import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { AppOptions } from './app';

/**
 * Boot-order guard: `main.ts` must mount the shell, bind the scene, then wire
 * the controls — the order that deleted the pre-bind gap. Every assertion reads
 * the comment-stripped copy, because the comments in `main.ts` legitimately
 * name the queues this track removed and describe the mount calls; a comment
 * must neither satisfy the order nor hide a real queue.
 */
const MAIN_SOURCE = fileURLToPath(new URL('../main.ts', import.meta.url));

const mainSource = readFileSync(MAIN_SOURCE, 'utf8');
const mainWithoutComments = mainSource
  .replaceAll(/\/\*[\s\S]*?\*\//g, '')
  .replaceAll(/\/\/[^\n]*/g, '');

/** The line metric `import-graph.test.ts` uses, so the counts agree. */
const lineCount = (content: string): number => content.replace(/\n$/, '').split('\n').length;

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

  it('carries no listener queue and no replay loop', () => {
    // No naming convention is safe to assume for a re-introduction, so the
    // scan looks for the shape: an array/Set/Map bound to a queue-ish name,
    // and any replay over one (for…of or forEach).
    const declarations = [
      ...mainWithoutComments.matchAll(
        /(?:const|let)\s+\w*(?:listeners?|queue|pending|buffer|subscribers?)\b[^=;\n]*=\s*(?:\[|new\s+(?:Set|Map|Array))/gi,
      ),
    ].map((match) => match[0]);
    const replayLoops = [
      ...mainWithoutComments.matchAll(
        /(?:for\s*\(\s*const\s+\w+\s+of\s+\w*(?:listeners?|queue|pending|buffer|subscribers?)\b|\w*(?:listeners?|queue|pending|buffer|subscribers?)\.forEach\s*\()/gi,
      ),
    ].map((match) => match[0]);

    expect(declarations, 'a listener queue returned to src/main.ts').toEqual([]);
    expect(replayLoops, 'a queued-listener replay loop returned to src/main.ts').toEqual([]);
  });

  it('hands the bound scene to mountControls', () => {
    // Match the argument list, not a 400-character window: the dev-handle
    // comment also contains the word "scene", which made a window check pass
    // even with the argument deleted.
    const call = mainWithoutComments.match(/mountControls\(\s*root\s*,\s*\{[^}]*\bscene\s*,/);

    expect(
      call?.[0],
      'mountControls must be called with root and an options object carrying the bound scene',
    ).toBeTruthy();
  });
});
