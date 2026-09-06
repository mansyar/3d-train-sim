import { type DrawerTabId, drawerTabs } from '../core/drawer';
import type { SceneryKind } from '../core/scenery';
import { MAX_PIECES, type PieceType } from '../core/track-graph';
import type { WorldStore } from '../state/world';
import { toySlot } from './toy-icons';

/** The five chunky tabs (Rails / Adventure / Nature / Town / Critters) of the toybox. */
const TOY_TABS = drawerTabs();

/** Markup for the tab strip and its panels — interpolated into the app frame. */
export const toyTabStrip = TOY_TABS.map(
  (tab) => `<button class="drawer-tab" type="button" data-tab="${tab.id}"
              aria-label="${tab.aria}" aria-pressed="false">${tab.icon}</button>`,
).join('');
export const toyTabPanels = TOY_TABS.map(
  (tab) =>
    `<div class="drawer-panel" data-panel="${tab.id}" hidden>${tab.kinds
      .map(toySlot)
      .join('')}</div>`,
).join('');

export interface ToyDrawerDeps {
  world: WorldStore;
  /** Drag starter handed over by the wiring (the toy-drag module). */
  beginDrag(kind: PieceType | SceneryKind): void;
  /** A second tap on the active tab asks the wiring to close the drawer. */
  requestClose(): void;
}

export interface ToyDrawer {
  /** Show the toys drawer and re-show the remembered tab, or hide it. */
  setOpen(open: boolean): void;
}

export function createToyDrawer(
  root: HTMLElement,
  drawer: HTMLElement,
  deps: ToyDrawerDeps,
): ToyDrawer {
  // ---- Tabbed toybox drawer (Rails / Adventure / Nature / Town / Critters) -----------
  // One tab active at a time; the drawer itself is one of the three
  // toybox drawers (toys / trains) — never two at once.
  const tabButtons = new Map(
    [...root.querySelectorAll<HTMLButtonElement>('.drawer-tab')].map((button) => [
      button.dataset.tab as DrawerTabId,
      button,
    ]),
  );
  const panels = new Map(
    [...root.querySelectorAll<HTMLDivElement>('.drawer-panel')].map((panel) => [
      panel.dataset.panel as DrawerTabId,
      panel,
    ]),
  );
  let activeTab: DrawerTabId | null = null;

  const showTab = (tab: DrawerTabId | null) => {
    activeTab = tab;
    for (const [id, button] of tabButtons) {
      button.setAttribute('aria-pressed', String(id === tab));
      button.classList.toggle('is-active', id === tab);
    }
    for (const [id, panel] of panels) panel.toggleAttribute('hidden', id !== tab);
  };

  for (const button of tabButtons.values()) {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab as DrawerTabId;
      // A tap on the active tab closes the whole drawer — no empty strip state.
      if (activeTab === tab) deps.requestClose();
      else showTab(tab);
    });
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>('.piece-slot, .scenery-slot')) {
    button.addEventListener('pointerdown', (event) => {
      if (button.classList.contains('is-dimmed')) return;
      event.preventDefault();
      const kind = button.dataset.piece ?? button.dataset.scenery ?? ('straight' as PieceType);
      deps.beginDrag(kind as PieceType | SceneryKind);
    });
  }

  // ---- Cap dimming -------------------------------------------------------
  const refreshCap = () => {
    const full = deps.world.pieces().length + deps.world.scenery().length >= MAX_PIECES;
    for (const button of root.querySelectorAll<HTMLButtonElement>('.piece-slot, .scenery-slot')) {
      button.classList.toggle('is-dimmed', full);
      button.toggleAttribute('disabled', full);
    }
  };
  deps.world.subscribe(refreshCap);
  refreshCap();

  return {
    setOpen(open) {
      drawer.toggleAttribute('hidden', !open);
      if (open) showTab(activeTab ?? 'rails');
    },
  };
}
