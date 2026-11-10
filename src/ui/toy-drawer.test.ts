import { describe, expect, it, vi } from 'vitest';
import type { AudioController } from '../audio/audio-controller';
import { DRAWER_TABS, drawerTabs } from '../core/drawer';
import { MAX_PIECES } from '../core/track-graph';
import type { WorldStore } from '../state/world';
import { createToyDrawer, type ToyDrawer, toyTabPanels } from './toy-drawer';
import { isPieceKind } from './toy-icons';

/**
 * Node has no browser DOM, so the harness fakes the small surface the toy
 * drawer touches: querySelectorAll over comma-separated class selectors,
 * classList, dataset, the hidden property, and addEventListener/fire.
 */
class FakeClassList {
  private readonly members = new Set<string>();

  constructor(initial: readonly string[]) {
    for (const name of initial) this.members.add(name);
  }

  add(...names: string[]): void {
    for (const name of names) this.members.add(name);
  }

  remove(...names: string[]): void {
    for (const name of names) this.members.delete(name);
  }

  toggle(name: string, force?: boolean): boolean {
    const next = force ?? !this.members.has(name);
    if (next) this.members.add(name);
    else this.members.delete(name);
    return next;
  }

  contains(name: string): boolean {
    return this.members.has(name);
  }
}

interface FakeEvent {
  preventDefault(): void;
}

type FakeListener = (event: FakeEvent) => void;

class FakeElement {
  readonly classList: FakeClassList;
  readonly dataset: Record<string, string>;
  readonly listeners = new Map<string, FakeListener[]>();
  private readonly attributes = new Map<string, string>();
  hidden = false;
  offsetWidth = 100;

  constructor(classes: readonly string[], dataset: Record<string, string>) {
    this.classList = new FakeClassList(classes);
    this.dataset = dataset;
  }

  matchesSelector(selector: string): boolean {
    return selector
      .split(',')
      .map((part) => part.trim())
      .some((part) => part.startsWith('.') && this.classList.contains(part.slice(1)));
  }

  addEventListener(type: string, listener: FakeListener): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === 'hidden') this.hidden = true;
  }

  toggleAttribute(name: string, force?: boolean): void {
    const next = force ?? !this.hasAttribute(name);
    if (name === 'hidden') {
      this.hidden = next;
      return;
    }
    if (next) this.attributes.set(name, '');
    else this.attributes.delete(name);
  }

  hasAttribute(name: string): boolean {
    if (name === 'hidden') return this.hidden;
    return this.attributes.has(name);
  }

  fire(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener({ preventDefault() {} });
  }
}

interface HarnessOptions {
  muted: boolean;
  prefersStill: boolean;
  worldCount: number;
}

interface Harness {
  drawer: ToyDrawer;
  slots: FakeElement[];
  tabs: Map<string, FakeElement>;
  dings: () => number;
  fireWorldChange: () => void;
  beginDrag: ReturnType<typeof vi.fn>;
}

function buildHarness(options: HarnessOptions): Harness {
  const slots = drawerTabs().flatMap((tab) =>
    tab.kinds.map(
      (kind) =>
        new FakeElement(
          [isPieceKind(kind) ? 'piece-slot' : 'scenery-slot'],
          isPieceKind(kind) ? { piece: kind } : { scenery: kind },
        ),
    ),
  );
  const tabs = new Map<string, FakeElement>();
  const panels: FakeElement[] = [];
  for (const id of DRAWER_TABS) {
    tabs.set(id, new FakeElement(['drawer-tab'], { tab: id }));
    panels.push(new FakeElement(['drawer-panel'], { panel: id }));
  }
  const root = {
    querySelectorAll(selector: string): FakeElement[] {
      return [...tabs.values(), ...panels, ...slots].filter((element) =>
        element.matchesSelector(selector),
      );
    },
  };
  const drawerElement = new FakeElement(['toy-drawer'], {});

  const worldListeners: FakeListener[] = [];
  const world = {
    pieces: () =>
      Array.from({ length: options.worldCount }, (_, index) => ({ id: `piece-${index}` })),
    scenery: () => [],
    subscribe: (listener: FakeListener) => {
      worldListeners.push(listener);
      return () => undefined;
    },
  } as unknown as WorldStore;

  let dings = 0;
  const audio = {
    ding: () => {
      dings += 1;
    },
    isMuted: () => options.muted,
  } as unknown as AudioController;

  const beginDrag = vi.fn();
  // The drawer and root are structural fakes: the cast documents that these
  // tests run in node with no browser DOM.
  const toyDrawer = createToyDrawer(
    root as unknown as HTMLElement,
    drawerElement as unknown as HTMLElement,
    {
      world,
      beginDrag: (kind) => {
        beginDrag(kind);
      },
      requestClose: () => undefined,
      audio,
      prefersStill: options.prefersStill,
    },
  );

  return {
    drawer: toyDrawer,
    slots,
    tabs,
    dings: () => dings,
    fireWorldChange: () => {
      for (const listener of worldListeners) listener({ preventDefault() {} });
    },
    beginDrag,
  };
}

const ADVANCED = ['switch-3way', 'switch-slip', 'station'];

function slotKind(slot: FakeElement): string {
  return slot.dataset.piece ?? slot.dataset.scenery ?? '';
}

describe('toybox gating (FR-2)', () => {
  it('keeps every advanced slot in the static panels, hidden while locked', () => {
    for (const kind of ADVANCED) expect(toyTabPanels).toContain(kind);
    const harness = buildHarness({ muted: false, prefersStill: false, worldCount: 0 });
    const advanced = harness.slots.filter((slot) => ADVANCED.includes(slotKind(slot)));
    expect(advanced).toHaveLength(3);
    for (const slot of advanced) expect(slot.hidden).toBe(true);
    const straight = harness.slots.find((slot) => slotKind(slot) === 'straight');
    expect(straight?.hidden).toBe(false);
  });

  it('reveals every slot exactly on the third completed ride', () => {
    const harness = buildHarness({ muted: false, prefersStill: false, worldCount: 0 });
    expect(harness.drawer.notifyRideCompleted()).toBe(false);
    expect(harness.drawer.notifyRideCompleted()).toBe(false);
    expect(harness.drawer.notifyRideCompleted()).toBe(true);
    for (const slot of harness.slots) expect(slot.hidden).toBe(false);
    expect(harness.drawer.notifyRideCompleted()).toBe(false);
    expect(harness.drawer.disclosureState().completedRides).toBe(4);
  });

  it('keeps the MAX_PIECES cap dimming for visible slots, apart from gating', () => {
    const full = buildHarness({ muted: false, prefersStill: false, worldCount: MAX_PIECES });
    full.fireWorldChange();
    const straight = full.slots.find((slot) => slotKind(slot) === 'straight');
    expect(straight?.classList.contains('is-dimmed')).toBe(true);
    for (const slot of full.slots.filter((candidate) => ADVANCED.includes(slotKind(candidate)))) {
      expect(slot.hidden).toBe(true);
    }

    const roomy = buildHarness({ muted: false, prefersStill: false, worldCount: 0 });
    roomy.fireWorldChange();
    const roomyStraight = roomy.slots.find((slot) => slotKind(slot) === 'straight');
    expect(roomyStraight?.classList.contains('is-dimmed')).toBe(false);
  });
});

describe('unlock celebration (FR-6)', () => {
  it('dings and bounces the Adventure and Town tabs exactly on the unlocking ride', () => {
    const harness = buildHarness({ muted: false, prefersStill: false, worldCount: 0 });
    harness.drawer.notifyRideCompleted();
    harness.drawer.notifyRideCompleted();
    expect(harness.dings()).toBe(0);
    expect(harness.tabs.get('adventure')?.classList.contains('pop')).toBe(false);
    expect(harness.drawer.notifyRideCompleted()).toBe(true);
    expect(harness.dings()).toBe(1);
    expect(harness.tabs.get('adventure')?.classList.contains('pop')).toBe(true);
    expect(harness.tabs.get('town')?.classList.contains('pop')).toBe(true);
    expect(harness.tabs.get('rails')?.classList.contains('pop')).toBe(false);
    harness.drawer.notifyRideCompleted();
    expect(harness.dings()).toBe(1);
  });

  it('reveals silently and still when muted', () => {
    const harness = buildHarness({ muted: true, prefersStill: false, worldCount: 0 });
    harness.drawer.notifyRideCompleted();
    harness.drawer.notifyRideCompleted();
    expect(harness.drawer.notifyRideCompleted()).toBe(true);
    expect(harness.dings()).toBe(0);
    expect(harness.tabs.get('adventure')?.classList.contains('pop')).toBe(false);
    for (const slot of harness.slots) expect(slot.hidden).toBe(false);
  });

  it('reveals silently and still under reduced motion', () => {
    const harness = buildHarness({ muted: false, prefersStill: true, worldCount: 0 });
    harness.drawer.notifyRideCompleted();
    harness.drawer.notifyRideCompleted();
    expect(harness.drawer.notifyRideCompleted()).toBe(true);
    expect(harness.dings()).toBe(0);
    expect(harness.tabs.get('adventure')?.classList.contains('pop')).toBe(false);
    for (const slot of harness.slots) expect(slot.hidden).toBe(false);
  });

  it('keeps tap-to-drag instant: pointerdown starts the drag, dimmed slots refuse', () => {
    const harness = buildHarness({ muted: false, prefersStill: false, worldCount: 0 });
    const straight = harness.slots.find((slot) => slotKind(slot) === 'straight');
    straight?.fire('pointerdown');
    expect(harness.beginDrag).toHaveBeenCalledTimes(1);
    expect(harness.beginDrag).toHaveBeenCalledWith('straight');

    const full = buildHarness({ muted: false, prefersStill: false, worldCount: MAX_PIECES });
    const blocked = full.slots.find((slot) => slotKind(slot) === 'straight');
    blocked?.fire('pointerdown');
    expect(full.beginDrag).not.toHaveBeenCalled();
  });
});
