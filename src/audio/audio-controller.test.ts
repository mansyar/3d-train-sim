import { afterEach, describe, expect, it, vi } from "vitest";

import { createAudioController } from "./audio-controller.ts";

import type { SoundHandle } from "./audio-controller.ts";

/**
 * Fakes a Howler sound handle. Records the calls the controller makes so tests
 * can assert on play/stop/fade/rate behaviour without a real audio backend.
 */
function fakeHandle(): SoundHandle & { calls: string[] } {
	const calls: string[] = [];
	return {
		calls,
		play: vi.fn(() => {
			calls.push("play");
			return 1;
		}),
		stop: vi.fn(() => {
			calls.push("stop");
		}),
		fade: vi.fn(() => {
			calls.push("fade");
		}),
		rate: vi.fn(() => {
			calls.push("rate");
		}),
	};
}

/** Builds a controller wired to fake handles, one per requested sound name. */
function makeWired(names: string[]) {
	const handles = new Map<string, ReturnType<typeof fakeHandle>>();
	const created: string[] = [];
	const controller = createAudioController({
		createSound: (name: string) => {
			created.push(name);
			const handle = fakeHandle();
			handles.set(name, handle);
			return handle;
		},
		setGlobalMute: vi.fn(),
	});
	return { controller, handles, created };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("createAudioController", () => {
	it("defaults to unmuted", () => {
		const { controller } = makeWired([]);
		expect(controller.isMuted()).toBe(false);
	});

	it("toggles mute and notifies the new state", () => {
		const { controller } = makeWired([]);
		const seen: boolean[] = [];
		controller.subscribe(() => seen.push(controller.isMuted()));

		expect(controller.toggleMuted()).toBe(true);
		expect(controller.isMuted()).toBe(true);
		expect(controller.toggleMuted()).toBe(false);
		expect(seen).toEqual([true, false]);
	});

	it("mute is instant and global", () => {
		const globalMute = vi.fn();
		const controller = createAudioController({
			createSound: () => fakeHandle(),
			setGlobalMute: globalMute,
		});
		controller.setMuted(true);
		controller.setMuted(false);
		expect(globalMute.mock.calls).toEqual([[true], [false]]);
	});

	it("startChug plays the loop once and is idempotent", () => {
		const { controller, handles, created } = makeWired(["chug"]);
		controller.startChug();
		controller.startChug();

		expect(created).toEqual(["chug"]);
		expect(handles.get("chug")?.calls).toEqual(["play"]);
		expect(controller.isChugging()).toBe(true);
	});

	it("stopChug eases the loop out and is idempotent", () => {
		const { controller, handles } = makeWired(["chug"]);
		controller.startChug();
		controller.stopChug();
		controller.stopChug();

		const handle = handles.get("chug");
		expect(handle?.calls[handle.calls.length - 1]).toBe("fade");
		expect(controller.isChugging()).toBe(false);
	});

	it("startChug after stopChug replays the same handle", () => {
		const { controller, handles, created } = makeWired(["chug"]);
		controller.startChug();
		controller.stopChug();
		controller.startChug();

		expect(created).toEqual(["chug"]);
		expect(handles.get("chug")?.calls.filter((c) => c === "play")).toHaveLength(2);
	});

	it("softening dips the chug and restoring brings it back", () => {
		const { controller, handles } = makeWired(["chug"]);
		controller.startChug();
		controller.setChugSoftened(true);
		controller.setChugSoftened(false);

		const handle = handles.get("chug");
		expect(handle?.calls.filter((c) => c === "rate")).toHaveLength(2);
	});

	it("one-shots play whistle and ding sounds", () => {
		const { controller, handles } = makeWired(["whistle", "ding"]);
		controller.whistle();
		controller.ding();

		expect(handles.get("whistle")?.calls).toEqual(["play"]);
		expect(handles.get("ding")?.calls).toEqual(["play"]);
	});

	it("mutes keep every sound silent", () => {
		const { controller, handles } = makeWired(["chug", "whistle", "ding"]);
		controller.setMuted(true);
		controller.startChug();
		controller.whistle();
		controller.ding();

		for (const name of ["chug", "whistle", "ding"]) {
			expect(handles.get(name)?.calls ?? []).not.toContain("play");
		}
		expect(controller.isChugging()).toBe(true);
	});

	it("unmuting resumes a chug that was started while muted", () => {
		const { controller, handles } = makeWired(["chug"]);
		controller.setMuted(true);
		controller.startChug();
		expect(handles.get("chug")?.calls).not.toContain("play");

		controller.setMuted(false);
		expect(handles.get("chug")?.calls).toContain("play");
	});

	it("stopping the chug while muted stays silent on unmute", () => {
		const { controller, handles } = makeWired(["chug"]);
		controller.setMuted(true);
		controller.startChug();
		controller.stopChug();
		controller.setMuted(false);

		expect(handles.get("chug")?.calls).not.toContain("play");
	});

	it("notifications announce chug state changes", () => {
		const { controller } = makeWired(["chug"]);
		const seen: boolean[] = [];
		controller.subscribe(() => seen.push(controller.isChugging()));

		controller.startChug();
		controller.stopChug();
		expect(seen).toEqual([true, false]);
	});

	it("unsubscribing stops notifications", () => {
		const { controller } = makeWired([]);
		const seen: boolean[] = [];
		const unsubscribe = controller.subscribe(() => seen.push(controller.isMuted()));
		unsubscribe();
		controller.toggleMuted();
		expect(seen).toEqual([]);
	});
});
