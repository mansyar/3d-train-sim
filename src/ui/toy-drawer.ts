import type { AudioController } from '../audio/audio-controller';
import { type DisclosureState, isAdvancedKind } from '../core/disclosure';
import { type DrawerTabId, drawerPages, drawerTabs } from '../core/drawer';
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

/**
 * Each panel is a scroll-snap carousel: one viewport-wide page of at most four
 * slots at a time. Every catalog slot stays in the DOM — paging never uses
 * `hidden` — so gating selectors and placement drags keep resolving on
 * off-screen pages; only the current page intersects the drawer viewport.
 */
export const toyTabPanels = TOY_TABS.map((tab) => {
  const pages = drawerPages(tab.kinds, tab.id);
  const pageMarkup = pages
    .map(
      (kinds, index) =>
        `<div class="drawer-page" data-page="${index}">${kinds.map(toySlot).join('')}</div>`,
    )
    .join('');
  const dots =
    pages.length > 1
      ? `<div class="drawer-dots" role="group" aria-label="${tab.aria} pages">${pages
          .map(
            (_, index) =>
              `<button class="page-dot" type="button" data-dot="${index}"
                       aria-label="Toybox page ${index + 1} of ${pages.length}"
                       aria-current="${index === 0 ? 'page' : 'false'}"></button>`,
          )
          .join('')}</div>`
      : '';
  return `<div class="drawer-panel" data-panel="${tab.id}" hidden>
      <div class="drawer-pages" data-pages>${pageMarkup}</div>
      ${dots}
    </div>`;
}).join('');

export interface ToyDrawerDeps {
  world: WorldStore;
  /** Drag starter handed over by the wiring (the toy-drag module). */
  beginDrag(kind: PieceType | SceneryKind): void;
  /** A second tap on the active tab asks the wiring to close the drawer. */
  requestClose(): void;
  /** Sound box for the unlock ding; omit only where celebration is out of scope. */
  audio?: AudioController | undefined;
  /** Reduced-motion sample taken once by the wiring (no bounce, silent reveal). */
  prefersStill?: boolean | undefined;
}

export interface ToyDrawer {
  /** Show the toys drawer and re-show the remembered tab, or hide it. */
  setOpen(open: boolean): void;
  /**
   * Records one completed ride (a ▶ run with the train moving, ended by ⏹).
   * Returns true exactly on the ride that unlocks the advanced tier.
   */
  notifyRideCompleted(): boolean;
  /** The current disclosure progress, defensively copied. */
  disclosureState(): DisclosureState;
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

  // ---- Paged pages ---------------------------------------------------------
  // The selected page lives in this closure only: per tab, for this session.
  // Reload rebuilds the drawer and starts every tab back at page 1.
  interface PageView {
    scroller: HTMLElement;
    pages: HTMLElement[];
    dots: HTMLButtonElement[];
  }
  const pageViews = new Map<DrawerTabId, PageView>();
  const rememberedPage = new Map<DrawerTabId, number>();
  for (const [id, panel] of panels) {
    // The node harness supplies structural fakes with only querySelectorAll;
    // paging is a browser-only concern, so such panels simply have no pages.
    const scroller =
      typeof panel.querySelector === 'function'
        ? panel.querySelector<HTMLElement>('.drawer-pages')
        : null;
    if (!scroller) continue;
    pageViews.set(id, {
      scroller,
      pages: [...scroller.querySelectorAll<HTMLElement>('.drawer-page')],
      dots: [...panel.querySelectorAll<HTMLButtonElement>('.page-dot')],
    });
  }

  /** Only pages holding a slot a toddler can actually see get a dot. */
  const pageCount = (view: PageView): number =>
    view.pages.filter(
      (page) =>
        page.querySelector('.piece-slot:not([hidden]), .scenery-slot:not([hidden])') !== null,
    ).length;

  const refreshDots = (view: PageView, page: number): void => {
    const count = Math.max(pageCount(view), 1);
    for (const [index, dot] of view.dots.entries()) {
      dot.hidden = index >= count;
      dot.setAttribute('aria-label', `Toybox page ${index + 1} of ${count}`);
      dot.setAttribute('aria-current', index === page ? 'page' : 'false');
      dot.classList.toggle('is-active', index === page);
    }
  };

  const gotoPage = (view: PageView, page: number): void => {
    view.scroller.scrollLeft = page * view.scroller.clientWidth;
  };

  const revealPage = (tab: DrawerTabId | null): void => {
    if (!tab) return;
    const view = pageViews.get(tab);
    if (!view) return;
    // The panel was hidden a line ago; wait for layout so clientWidth is real.
    requestAnimationFrame(() => {
      const count = Math.max(pageCount(view), 1);
      const page = Math.min(rememberedPage.get(tab) ?? 0, count - 1);
      rememberedPage.set(tab, page);
      refreshDots(view, page);
      gotoPage(view, page);
    });
  };

  for (const [tab, view] of pageViews) {
    if (view.dots.length === 0) continue;
    for (const [index, dot] of view.dots.entries()) {
      dot.addEventListener('click', () => {
        rememberedPage.set(tab, index);
        refreshDots(view, index);
        gotoPage(view, index);
      });
    }
    // Touch swipes scroll natively (scroll-snap + `touch-action: pan-x`); the
    // scroll listener keeps dots and page memory in step. Mouse/pen users get
    // an explicit flick on the empty gaps — a press on a slot stays a drag.
    let scrollFrame = 0;
    view.scroller.addEventListener(
      'scroll',
      () => {
        if (scrollFrame) return;
        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = 0;
          const width = view.scroller.clientWidth || 1;
          const page = Math.max(0, Math.round(view.scroller.scrollLeft / width));
          const clamped = Math.min(page, Math.max(pageCount(view), 1) - 1);
          rememberedPage.set(tab, clamped);
          refreshDots(view, clamped);
        });
      },
      { passive: true },
    );
    let swipeStart: number | null = null;
    view.scroller.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') return;
      if (
        event.target instanceof Element &&
        event.target.closest('.piece-slot, .scenery-slot, .page-dot')
      ) {
        return;
      }
      swipeStart = event.clientX;
    });
    window.addEventListener('pointerup', (event) => {
      if (swipeStart === null) return;
      const distance = event.clientX - swipeStart;
      swipeStart = null;
      if (Math.abs(distance) < 40) return;
      const count = Math.max(pageCount(view), 1);
      const current = rememberedPage.get(tab) ?? 0;
      const next = Math.min(Math.max(0, current + (distance < 0 ? 1 : -1)), count - 1);
      rememberedPage.set(tab, next);
      refreshDots(view, next);
      gotoPage(view, next);
    });
    view.scroller.addEventListener('pointercancel', () => {
      swipeStart = null;
    });
  }

  let activeTab: DrawerTabId | null = null;

  const showTab = (tab: DrawerTabId | null) => {
    activeTab = tab;
    for (const [id, button] of tabButtons) {
      button.setAttribute('aria-pressed', String(id === tab));
      button.classList.toggle('is-active', id === tab);
    }
    for (const [id, panel] of panels) panel.toggleAttribute('hidden', id !== tab);
    revealPage(tab);
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

  // ---- Progressive disclosure: basics-only toybox, unlock celebration ----
  // The static panels above hold every catalog slot; while locked the
  // advanced slots hide via `hidden` — never the MAX_PIECES dimming style,
  // which keeps meaning "board is full". The third completed ride reveals
  // them with an icon-only bounce + happy ding; muted or reduced-motion
  // hands get the same unlocked toybox revealed silently and still (AC-5).
  // The world store owns the progress (so it autosaves with the world); the
  // drawer gates slots, celebrates ride-end unlocks, and re-gates on every
  // world mutation so reloads and resets apply silently.

  const clampPages = (): void => {
    for (const [tab, view] of pageViews) {
      if (view.dots.length === 0) continue;
      const count = Math.max(pageCount(view), 1);
      const page = Math.min(rememberedPage.get(tab) ?? 0, count - 1);
      rememberedPage.set(tab, page);
      refreshDots(view, page);
      if (activeTab === tab) gotoPage(view, page);
    }
  };

  const applyGating = (): void => {
    const locked = !deps.world.disclosure().unlocked;
    for (const slot of root.querySelectorAll<HTMLButtonElement>('.piece-slot, .scenery-slot')) {
      const kind = slot.dataset.piece ?? slot.dataset.scenery ?? null;
      if (kind !== null && isAdvancedKind(kind)) slot.hidden = locked;
    }
    // Unlocking changes the visible item set; keep the remembered page inside
    // the new page count rather than stranding the child on an empty page.
    clampPages();
  };
  // Reloads, resets, and restored saves land through the store — re-gate
  // silently on each one. Only a ride-end unlock celebrates, and only once.
  deps.world.subscribe(applyGating);

  const celebrateUnlock = (): void => {
    const audio = deps.audio;
    if (!audio || audio.isMuted() || (deps.prefersStill ?? false)) return;
    audio.ding();
    for (const id of ['adventure', 'town'] as const) {
      const tab = tabButtons.get(id);
      if (!tab) continue;
      // Restart the pop when unlocks land back-to-back (same pattern as ▶).
      tab.classList.remove('pop');
      void tab.offsetWidth;
      tab.classList.add('pop');
    }
  };

  for (const button of tabButtons.values()) {
    button.addEventListener('animationend', () => button.classList.remove('pop'));
  }

  const notifyRideCompleted = (): boolean => {
    // The count lives in the world store now, so the ride autosaves with the
    // world; the store's own notification already re-gated the slots above.
    const justUnlocked = deps.world.recordRide();
    if (justUnlocked) celebrateUnlock();
    return justUnlocked;
  };

  applyGating();

  return {
    setOpen(open) {
      drawer.toggleAttribute('hidden', !open);
      if (open) showTab(activeTab ?? 'rails');
    },
    notifyRideCompleted,
    disclosureState: () => deps.world.disclosure(),
  };
}
