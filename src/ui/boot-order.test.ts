import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { AppOptions } from './app';

/**
 * Boot-order guard: `main.ts` must mount the shell, bind the scene, then wire
 * the controls — the order that deleted the pre-bind gap. The comments in
 * `main.ts` legitimately talk about the queues this track removed, so the
 * queue scan reads a comment-stripped copy; the call order is read from the
 * raw text, so a commented-out mount cannot satisfy it.
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
    expect(mainSource.length).toBeGreaterThan(0);
    expect(lineCount(mainSource)).toBeGreaterThan(100);
    expect(mainSource).toContain('mountShell(');
    expect(mainSource).toContain('initScene(');
    expect(mainSource).toContain('mountControls(');
  });

  it('mounts the shell, then the scene, then the controls', () => {
    const shell = mainSource.indexOf('mountShell(');
    const scene = mainSource.indexOf('initScene(');
    const controls = mainSource.indexOf('mountControls(');
    // Every index is in the message, so a regression says which call moved.
    const indexes = `mountShell=${shell}, initScene=${scene}, mountControls=${controls}`;

    expect(shell, `mountShell( not found in src/main.ts (${indexes})`).toBeGreaterThan(-1);
    expect(scene, `initScene( not found in src/main.ts (${indexes})`).toBeGreaterThan(-1);
    expect(controls, `mountControls( not found in src/main.ts (${indexes})`).toBeGreaterThan(-1);
    expect(shell, `expected mountShell → initScene; got ${indexes}`).toBeLessThan(scene);
    expect(scene, `expected initScene → mountControls; got ${indexes}`).toBeLessThan(controls);
  });

  it('carries no listener queue and no replay loop', () => {
    // Comments are stripped above: this file's prose names the queues on
    // purpose, and a comment can neither add nor hide a real one.
    const declarations = [
      ...mainWithoutComments.matchAll(/(?:const|let)\s+\w*Listeners\s*[:=]/g),
    ].map((match) => match[0]);
    const replayLoops = [
      ...mainWithoutComments.matchAll(/for\s*\(\s*const\s+listener\s+of\s+\w*Listeners/g),
    ].map((match) => match[0]);

    expect(declarations, 'a listener queue returned to src/main.ts').toEqual([]);
    expect(replayLoops, 'a queued-listener replay loop returned to src/main.ts').toEqual([]);
  });

  it('hands the bound scene to mountControls', () => {
    const call = mainSource.indexOf('mountControls(');
    expect(call, 'mountControls( not found in src/main.ts').toBeGreaterThan(-1);
    // A 400-character window from the call covers the options object; a
    // substring check is enough to prove the scene is handed over.
    const callWindow = mainSource.slice(call, call + 400);
    expect(callWindow, 'mountControls must receive the bound scene').toMatch(/\bscene\b/);
  });
});
