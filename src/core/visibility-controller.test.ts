import { describe, expect, it } from 'vitest';

import { createVisibilityController, type VisibilityState } from './visibility-controller';

interface Harness {
  state: () => VisibilityState;
  events: Array<'pause' | 'resume'>;
  setHidden(hidden: boolean): void;
}

function makeController(): Harness {
  let hidden = false;
  const events: Array<'pause' | 'resume'> = [];
  const controller = createVisibilityController({
    isHidden: () => hidden,
    onPause: () => events.push('pause'),
    onResume: () => events.push('resume'),
  });
  return {
    state: () => controller.state,
    events,
    setHidden(next: boolean) {
      hidden = next;
      controller.sync();
    },
  };
}

describe('createVisibilityController', () => {
  it('starts visible (paused = false)', () => {
    const { state } = makeController();
    expect(state()).toBe('visible');
  });

  it('enters paused when the tab is hidden, exactly once', () => {
    const { state, events, setHidden } = makeController();
    setHidden(true);
    expect(state()).toBe('hidden');
    expect(events).toEqual(['pause']);
    // Repeated syncs on the same state are no-ops — no duplicate events.
    setHidden(true);
    setHidden(true);
    expect(events).toEqual(['pause']);
  });

  it('resumes when the tab becomes visible again, exactly once', () => {
    const { state, events, setHidden } = makeController();
    setHidden(true);
    setHidden(false);
    expect(state()).toBe('visible');
    expect(events).toEqual(['pause', 'resume']);
    setHidden(false);
    expect(events).toEqual(['pause', 'resume']);
  });

  it('handles rapid toggles without racing or duplicating', () => {
    const { events, setHidden } = makeController();
    setHidden(true);
    setHidden(false);
    setHidden(true);
    setHidden(false);
    expect(events).toEqual(['pause', 'resume', 'pause', 'resume']);
  });

  it('does not emit on the initial sync when nothing changed', () => {
    const { events, setHidden } = makeController();
    // The controller starts visible; syncing with no change is a no-op.
    setHidden(false);
    expect(events).toEqual([]);
  });
});
