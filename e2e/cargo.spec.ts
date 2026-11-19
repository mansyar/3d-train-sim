import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * Cargo and the wagon workshop, merged into one file: the station moment end
 * to end (wagons load at the first stop, deliver at the next, the count
 * survives a reload, and a station-less line can never count a delivery),
 * the workshop's per-train presets riding and delivering, and the chosen
 * pair riding a switch shuttle without a ripple (spec acceptance 1–6, 8).
 */

type WorldHandle = {
  reset: () => void;
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  placeScenery: (kind: string, cell: { x: number; y: number }, rotation: number) => string;
  scenery: () => readonly { id: string; kind: string }[];
  consistFor: (train: string) => string;
  deliveryCount: (id: string) => number;
};

/** A snapshot of the single in-flight crate arc (dev/e2e witness on the scene). */
type TransferSample = {
  kind: 'load' | 'deliver';
  stationId: string;
  progress: number;
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  spot: { x: number; y: number; z: number };
  /** Destination slot visibility — hidden while a delivery crate is in flight. */
  slotVisible: boolean;
};

const pointDistance = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Progress travelled and how far the crate's spot left its first sample. */
const arcSpan = (arc: TransferSample[]): { progress: number; travel: number } => {
  const first = arc.reduce<TransferSample | null>((acc, sample) => acc ?? sample, null);
  if (!first) return { progress: 0, travel: 0 };
  let lowest = first;
  let highest = first;
  let travel = 0;
  for (const sample of arc) {
    if (sample.progress < lowest.progress) lowest = sample;
    if (sample.progress > highest.progress) highest = sample;
    travel = Math.max(travel, pointDistance(first.spot, sample.spot));
  }
  return { progress: highest.progress - lowest.progress, travel };
};

const waitReady = (page: Page) =>
  page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

const boot = async (page: Page): Promise<void> => {
  await page.goto('/');
  await waitReady(page);
  await page.waitForTimeout(1200);
};

// Store methods live in the page — probe them there. (page.evaluate
// serializes its return, so calling handle.consistFor on the Node side would
// find the functions stripped off.)
const consistOf = (page: Page, train: string) =>
  page.evaluate(
    ([name]) => {
      const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      if (!handle) throw new Error('dev world handle missing');
      return handle.consistFor(name);
    },
    [train] as const,
  );

const consistAll = (page: Page) =>
  page.evaluate(() => {
    const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    return [
      handle.consistFor('steam'),
      handle.consistFor('diesel'),
      handle.consistFor('tram'),
    ] as const;
  });

const deliveryCount = (page: Page, stationId: string) =>
  page.evaluate(
    ([id]) =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.deliveryCount(
        id,
      ) ?? 0,
    [stationId] as const,
  );

/** The one live crate arc, sampled from the dev scene witness. */
const cargoTransfer = (page: Page) =>
  page.evaluate(() => {
    const scene = (
      window as unknown as { __tinyTracksScene?: { cargoTransfer?: () => TransferSample | null } }
    ).__tinyTracksScene;
    return scene?.cargoTransfer?.() ?? null;
  });

/** A station slot's live visibility, read from the dev scene witness. */
const cargoSlotVisible = (page: Page, stationId: string, slot: number) =>
  page.evaluate(
    ([id, slotNumber]) => {
      const scene = (
        window as unknown as {
          __tinyTracksScene?: {
            cargoSlotVisible?: (stationId: string, slot: number) => boolean | null;
          };
        }
      ).__tinyTracksScene;
      return scene?.cargoSlotVisible?.(id, slotNumber) ?? null;
    },
    [stationId, slot] as const,
  );

/**
 * The count in the persisted IndexedDB snapshot, not the live store. World
 * saves are fire-and-forget async writes, so reloading straight after a
 * delivery can race the commit; this waits for the exact count to land.
 */
const savedDeliveryCount = (page: Page, stationId: string) =>
  page.evaluate(
    ([id]) =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('tiny-tracks', 2);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const read = db.transaction('worlds', 'readonly').objectStore('worlds').get('current');
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
          read.onsuccess = () => {
            db.close();
            const snapshot: { deliveries?: Record<string, number> } | undefined = read.result;
            resolve(snapshot?.deliveries?.[id] ?? 0);
          };
        };
      }),
    [stationId] as const,
  );

// The cargo loop: a 2x2 corner square with a station beside it.
const buildCargoLoop = (page: Page) =>
  page.evaluate(() => {
    const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    handle.reset();
    handle.place('corner', { x: 1, y: 7 }, 90);
    handle.place('corner', { x: 2, y: 7 }, 180);
    handle.place('corner', { x: 2, y: 8 }, 270);
    handle.place('corner', { x: 1, y: 8 }, 0);
    if (handle.placeScenery('station', { x: 3, y: 7 }, 0) !== 'placed') {
      throw new Error('station placement failed');
    }
    const station = handle.scenery().find((item) => item.kind === 'station');
    if (!station) throw new Error('station missing');
    return station.id;
  });

const expectLocalAndClean = (page: Page, consoleErrors: string[], requestUrls: string[]): void => {
  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
};

const expectClean = (consoleErrors: string[]): void => {
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
};

test('wagons load, deliver, keep the count across a reload, and nothing with no station', async ({
  page,
}) => {
  // The delivery poll below allows 90s, so the test itself must outlive it:
  // on loaded CI runners the sim crawls (software rendering) and a first lap
  // has taken over 45s of riding before its delivery lands. The station-less
  // control from the old second test rides here too.
  test.setTimeout(180_000);
  const consoleErrors = watchConsoleErrors(page);
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await test.step('boot and build the station loop', async () => {
    await boot(page);
    await buildCargoLoop(page);

    // The crate asset rides along with the wagons from the start.
    await page.waitForFunction(() =>
      performance.getEntriesByType('resource').some((entry) => entry.name.includes('crate.glb')),
    );
  });

  await test.step('ride until the first delivery lands', async () => {
    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

    // Long enough for the first station stop (loads); the poll below waits
    // for the delivery, so no fixed wait needs to cover two stops.
    await page.waitForTimeout(8000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

    // The station id is stable across the reload; read it back from the page.
    const stationId = await page.evaluate(() => {
      const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      const station = handle?.scenery().find((item) => item.kind === 'station');
      if (!station) throw new Error('station missing');
      return station.id;
    });

    await expect
      .poll(async () => deliveryCount(page, stationId), { timeout: 90000, intervals: [1000] })
      .toBeGreaterThanOrEqual(1);
  });

  await test.step('reload and keep the station crate', async () => {
    const stationId = await page.evaluate(() => {
      const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      const station = handle?.scenery().find((item) => item.kind === 'station');
      if (!station) throw new Error('station missing');
      return station.id;
    });
    const count = await deliveryCount(page, stationId);
    expect(count, 'a delivery must have landed before the reload').toBeGreaterThanOrEqual(1);

    // The world save is an async IndexedDB write. Wait for this EXACT count to
    // be committed before reloading, or the boot can read a snapshot from
    // before the delivery — the race that made this assertion flaky.
    await expect
      .poll(async () => savedDeliveryCount(page, stationId), { timeout: 20000, intervals: [200] })
      .toBe(count);

    // The delivery survives a reload: the platform keeps its crate.
    await page.reload();
    await waitReady(page);
    // Readiness follows hydration, but poll so the assertion targets the exact
    // saved count rather than an arbitrary instant after boot.
    await expect
      .poll(async () => deliveryCount(page, stationId), { timeout: 20000, intervals: [100] })
      .toBe(count);

    expectLocalAndClean(page, consoleErrors, requestUrls);
  });

  await test.step('ride a line with no station and count nothing', async () => {
    await page.evaluate(() => {
      const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      world.reset();
      world.place('corner', { x: 1, y: 5 }, 90);
      world.place('corner', { x: 2, y: 5 }, 180);
      world.place('corner', { x: 2, y: 6 }, 270);
      world.place('corner', { x: 1, y: 6 }, 0);
    });

    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await page.waitForTimeout(7000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

    // No station exists, so no delivery can ever be counted.
    const totals = await page.evaluate(() => {
      const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      return world.scenery().length;
    });
    expect(totals).toBe(0);
    expectClean(consoleErrors);
  });
});

test('per-train presets ride, deliver cargo, and survive a reload', async ({ page }) => {
  // The delivery poll below allows 90s, so the test must outlive it.
  test.setTimeout(180_000);
  const consoleErrors = watchConsoleErrors(page);
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await test.step('boot and build the cargo loop', async () => {
    await boot(page);
    await buildCargoLoop(page);
  });

  await test.step('dress steam in coal and diesel in tank', async () => {
    // Steam dresses in coal, diesel in tank — one tap each, through the UI.
    await page.click('[data-drawer="trains"]');
    await page.locator('.wagon-slot[data-wagon="coal"]').click();
    await expect(page.locator('.wagon-slot[data-wagon="coal"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.locator('.train-slot[data-train="diesel"]').click();
    await page.locator('.wagon-slot[data-wagon="tank"]').click();
    await expect(page.locator('.wagon-slot[data-wagon="tank"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Switching locos re-aims the row: back on steam, coal shows pressed.
    await page.locator('.train-slot[data-train="steam"]').click();
    await expect(page.locator('.wagon-slot[data-wagon="coal"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await consistAll(page)).toEqual(['coal', 'tank', 'classic']);
  });

  await test.step('ride until the coal pair delivers', async () => {
    const stationId = await page.evaluate(() => {
      const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      const station = handle?.scenery().find((item) => item.kind === 'station');
      if (!station) throw new Error('station missing');
      return station.id;
    });

    // The coal pair hauls crates: ride until the first delivery lands.
    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await expect
      .poll(async () => deliveryCount(page, stationId), { timeout: 90_000, intervals: [2000] })
      .toBeGreaterThanOrEqual(1);
    // Still riding in coal after the station stop.
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await expect.poll(() => consistOf(page, 'steam')).toBe('coal');

    // Phase 1: variant picks, the ride, and the delivery ran with a clean
    // console — assert before the reload below.
    expectClean(consoleErrors);
  });

  await test.step('reload and restore every train choice', async () => {
    // A reload restores every train's choice. The reload itself tears down a
    // live WebGL page, and headless Chromium reports the doomed context's
    // fetch fallout as uncaught errors — noise, not app behavior. Drop that
    // teardown window; the fresh load plus the drawer interaction below
    // re-covers it, so genuine failures still surface.
    await page.reload();
    await boot(page);
    consoleErrors.length = 0;
    await expect.poll(() => consistAll(page)).toEqual(['coal', 'tank', 'classic']);
    await page.click('[data-drawer="trains"]');
    await expect(page.locator('.wagon-slot[data-wagon="coal"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const origin = new URL(page.url()).origin;
    const external = requestUrls.filter((url) => new URL(url).origin !== origin);
    expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
    // Phase 2: the fresh load and the drawer interaction stayed clean.
    expectClean(consoleErrors);
  });
});

test('the chosen pair rides a switch shuttle without a ripple', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleErrors = watchConsoleErrors(page);
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await test.step('boot and place the switch shuttle', async () => {
    await boot(page);
    await page.evaluate(() => {
      const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      if (!handle) throw new Error('dev world handle missing');
      handle.reset();
      for (const [type, cell] of [
        ['straight', { x: 2, y: 1 }],
        ['switch', { x: 2, y: 2 }],
        ['straight', { x: 2, y: 3 }],
      ] as const) {
        if (handle.place(type, cell, 0) !== 'placed') {
          throw new Error(`placement failed: ${type}`);
        }
      }
    });
  });

  await test.step('dress the chosen pair in containers', async () => {
    await page.click('[data-drawer="trains"]');
    await page.locator('.wagon-slot[data-wagon="container"]').click();
    await expect(page.locator('.wagon-slot[data-wagon="container"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  await test.step('ride a full alternating cycle without a ripple', async () => {
    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    // A full alternating cycle over both switch roads with dead-end turnarounds.
    await page.waitForTimeout(12000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    const a = await page.screenshot();
    await page.waitForTimeout(1200);
    const b = await page.screenshot();
    expect(Buffer.compare(a, b)).not.toBe(0);
    await expect.poll(() => consistOf(page, 'steam')).toBe('container');

    expectLocalAndClean(page, consoleErrors, requestUrls);
  });
});

test('load and delivery crates arc between the platform slot and the wagon bed', async ({
  page,
}) => {
  // One first lap loads, the next delivers; software rendering can make each
  // stop slow, so the delivery poll keeps the same generous budget as above.
  test.setTimeout(180_000);
  const consoleErrors = watchConsoleErrors(page);
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await boot(page);
  const stationId = await buildCargoLoop(page);
  // The arc's stand-in is cloned from the crate template; without it the
  // hand-off correctly falls back to the instant state change.
  await page.waitForFunction(() =>
    performance.getEntriesByType('resource').some((entry) => entry.name.includes('crate.glb')),
  );

  // Sample the scene witness every animation frame while the ride runs. Only
  // the two half-second arcs produce samples; idle frames return null.
  await page.evaluate(() => {
    const probe = window as unknown as {
      __tinyTracksScene?: { cargoTransfer?: () => TransferSample | null };
      __cargoSamples?: TransferSample[];
      __cargoSampling?: boolean;
    };
    probe.__cargoSamples = [];
    probe.__cargoSampling = true;
    const tick = () => {
      const sample = probe.__tinyTracksScene?.cargoTransfer?.();
      if (sample) {
        probe.__cargoSamples?.push({
          kind: sample.kind,
          stationId: sample.stationId,
          progress: sample.progress,
          from: { ...sample.from },
          to: { ...sample.to },
          spot: { ...sample.spot },
          slotVisible: sample.slotVisible,
        });
      }
      if (probe.__cargoSampling) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await test.step('ride through a load and a delivery', async () => {
    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await expect
      .poll(async () => deliveryCount(page, stationId), { timeout: 90000, intervals: [1000] })
      .toBeGreaterThanOrEqual(1);
  });

  const samples = await page.evaluate(() => {
    const probe = window as unknown as {
      __cargoSampling?: boolean;
      __cargoSamples?: TransferSample[];
    };
    probe.__cargoSampling = false;
    return probe.__cargoSamples ?? [];
  });

  await test.step('both arcs travel from one endpoint toward the other', async () => {
    for (const kind of ['load', 'deliver'] as const) {
      const arc = samples.filter(
        (sample) => sample.kind === kind && sample.stationId === stationId,
      );
      expect(arc.length, `${kind} arc samples`).toBeGreaterThan(1);

      const span = arcSpan(arc);
      expect(span.progress, `${kind} progress moved`).toBeGreaterThan(0.15);
      expect(span.travel, `${kind} crate spot moved`).toBeGreaterThan(0.05);

      const first = arc.reduce<TransferSample | null>((acc, sample) => acc ?? sample, null);
      if (!first) throw new Error(`${kind} arc had no samples`);
      const min = arc.reduce(
        (acc, sample) => (sample.progress < acc.progress ? sample : acc),
        first,
      );
      const max = arc.reduce(
        (acc, sample) => (sample.progress > acc.progress ? sample : acc),
        first,
      );
      expect(pointDistance(first.from, first.to), `${kind} endpoints`).toBeGreaterThan(0.05);
      // The spot starts by its origin and ends by its destination — the same
      // helper runs in both directions, so load and delivery are mirrored.
      expect(pointDistance(min.spot, min.from), `${kind} starts at origin`).toBeLessThan(
        pointDistance(min.spot, min.to),
      );
      expect(pointDistance(max.spot, max.to), `${kind} ends at destination`).toBeLessThan(
        pointDistance(max.spot, max.from),
      );
    }
  });

  await test.step('the destination slot follows the delivery crate', async () => {
    const deliver = samples.filter(
      (sample) => sample.kind === 'deliver' && sample.stationId === stationId,
    );
    expect(deliver.length, 'deliver arc samples').toBeGreaterThan(1);
    for (const sample of deliver) {
      expect(sample.slotVisible, 'slot stays dark while the crate flies').toBe(false);
    }
    const load = samples.filter(
      (sample) => sample.kind === 'load' && sample.stationId === stationId,
    );
    for (const sample of load) {
      expect(sample.slotVisible, 'a load arc does not hide a platform slot').toBe(true);
    }
    // The ledger reveals the slot at the stop; only the landing may show it.
    await expect
      .poll(() => cargoSlotVisible(page, stationId, 1), { timeout: 10_000, intervals: [100] })
      .toBe(true);
  });

  expectLocalAndClean(page, consoleErrors, requestUrls);
});

test('reduced motion skips the crate arc but still delivers exactly once', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleErrors = watchConsoleErrors(page);

  // Sampled at boot: the static frame never advances a real station stop, so
  // a dev witness drives the very same cargo handler the ride calls.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await boot(page);
  const stationId = await buildCargoLoop(page);
  await page.waitForFunction(() =>
    performance.getEntriesByType('resource').some((entry) => entry.name.includes('crate.glb')),
  );

  // A rig must exist for the primary rig's cargo handler to be callable.
  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const scene = (
            window as unknown as {
              __tinyTracksScene?: { ridingTrainCount?: () => number };
            }
          ).__tinyTracksScene;
          return scene?.ridingTrainCount?.() ?? 0;
        }),
      { timeout: 20000 },
    )
    .toBeGreaterThanOrEqual(1);

  const before = await deliveryCount(page, stationId);
  const witnessed = await page.evaluate((id) => {
    const scene = (
      window as unknown as {
        __tinyTracksScene?: {
          forceCargoStation?: (stationId: string) => void;
          cargoTransfer?: () => TransferSample | null;
        };
      }
    ).__tinyTracksScene;
    if (!scene?.forceCargoStation) throw new Error('dev cargo witness missing');
    // Two stops: empty wagons load, then loaded wagons deliver.
    scene.forceCargoStation(id);
    const afterLoad = scene.cargoTransfer?.() ?? null;
    scene.forceCargoStation(id);
    const afterDeliver = scene.cargoTransfer?.() ?? null;
    return { afterLoad, afterDeliver };
  }, stationId);

  expect(witnessed.afterLoad, 'no load arc under reduced motion').toBeNull();
  expect(witnessed.afterDeliver, 'no delivery arc under reduced motion').toBeNull();
  expect(await deliveryCount(page, stationId), 'delivery still counts once').toBe(before + 1);

  expectClean(consoleErrors);
});

test('the count settles at the station stop, before the arc finishes', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleErrors = watchConsoleErrors(page);

  await boot(page);
  const stationId = await buildCargoLoop(page);
  await page.waitForFunction(() =>
    performance.getEntriesByType('resource').some((entry) => entry.name.includes('crate.glb')),
  );

  // A live rig is required: the dev witness drives the very handler the ride
  // calls, and a normal (non-reduced) frame loop animates the visual arc.
  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const scene = (
            window as unknown as { __tinyTracksScene?: { ridingTrainCount?: () => number } }
          ).__tinyTracksScene;
          return scene?.ridingTrainCount?.() ?? 0;
        }),
      { timeout: 20000 },
    )
    .toBeGreaterThanOrEqual(1);

  const before = await deliveryCount(page, stationId);
  // Both stops run in one synchronous task, so no frame slips between the
  // load and the delivery: the arc we read is the freshly started delivery.
  const stop = await page.evaluate((id) => {
    const scene = (
      window as unknown as {
        __tinyTracksScene?: {
          forceCargoStation?: (stationId: string) => void;
          cargoTransfer?: () => TransferSample | null;
        };
      }
    ).__tinyTracksScene;
    const world = (
      window as unknown as { __tinyTracksWorld?: { deliveryCount: (id: string) => number } }
    ).__tinyTracksWorld;
    if (!scene?.forceCargoStation || !world) throw new Error('dev cargo witness missing');
    scene.forceCargoStation(id); // empty wagons load
    scene.forceCargoStation(id); // loaded wagons deliver
    return { count: world.deliveryCount(id), arc: scene.cargoTransfer?.() ?? null };
  }, stationId);

  // The ledger is settled while the crate is still in flight. Reloading or
  // cancelling mid-arc can neither lose nor repeat this delivery.
  expect(stop.count).toBe(before + 1);
  expect(stop.arc, 'the delivery arc is running while the count is settled').not.toBeNull();
  expect(stop.arc?.kind).toBe('deliver');
  expect(stop.arc?.slotVisible, 'the platform slot waits for its crate').toBe(false);

  // An arc must be live when Stop lands: poll for one, then click and sample
  // in ONE task, before the next frame can cancel and snap the crate home.
  await expect
    .poll(
      async () => {
        const arc = await cargoTransfer(page);
        return arc !== null && arc.kind === 'deliver' && arc.progress < 0.5;
      },
      { timeout: 10_000, intervals: [50] },
    )
    .toBe(true);
  const atStop = await page.evaluate(() => {
    const toggle = document.querySelector<HTMLButtonElement>('.ride-toggle');
    if (!toggle) throw new Error('ride toggle missing');
    toggle.click();
    const scene = (
      window as unknown as { __tinyTracksScene?: { cargoTransfer?: () => TransferSample | null } }
    ).__tinyTracksScene;
    // Sampled in the same task as the click: the arc is still in flight here.
    return scene?.cargoTransfer?.() ?? null;
  });
  expect(atStop, 'a delivery arc was in flight when Stop was pressed').not.toBeNull();
  expect(atStop?.kind).toBe('deliver');
  // Slot darkness is asserted at the arc's start above (`stop.arc`): a world
  // notify can re-settle visibility between frames, which the next tick reapplies.

  // The next frame cancels and snaps home: no second count, no stranded
  // travelling crate, and the platform keeps its already-delivered crate.
  await expect
    .poll(async () => (await cargoTransfer(page)) === null, { timeout: 10_000, intervals: [50] })
    .toBe(true);
  expect(await deliveryCount(page, stationId)).toBe(before + 1);
  expect(await cargoSlotVisible(page, stationId, 1)).toBe(true);

  expectClean(consoleErrors);
});
