import { describe, expect, it, vi } from "vitest";
import type { DungeonLayout, DungeonRoom } from "../config/dungeon-layout";
import type { CombatStore } from "../stores/combat.svelte";
import type { PlayerStore } from "../stores/player.svelte";
import type { RoomStore } from "../stores/room.svelte";
import type { TimingStore } from "../stores/timing.svelte";
import { handlePlayerPositionChange } from "./room-transitions";
import { roomTransitionInsetZ } from "./scene-layout";

const startRoom: DungeonRoom = {
  exits: {
    north: "boss",
  },
  grid: [0, 0],
  id: "start",
  kind: "normal",
  label: "Start",
  templateId: "normal-line",
};

const bossRoom: DungeonRoom = {
  exits: {
    south: "start",
  },
  grid: [0, -1],
  id: "boss",
  kind: "boss",
  label: "Boss",
  templateId: "boss-warden",
};

const dungeon: DungeonLayout = {
  floor: -1,
  initialModules: [],
  rooms: {
    boss: bossRoom,
    start: startRoom,
  },
  seed: "boss-transition-test",
  startRoomId: startRoom.id,
};

const enterBossRoom = ({
  clearedRoomIds = [],
  completedBossRoomIds,
}: {
  clearedRoomIds?: string[];
  completedBossRoomIds?: Set<string>;
} = {}) => {
  vi.stubGlobal("requestAnimationFrame", undefined);

  const combat = {
    clearForRoomChange: vi.fn(),
  } as unknown as CombatStore;
  const player = {
    impactVelocity: [1, 0, 1],
    updatePosition: vi.fn(),
  } as unknown as PlayerStore;
  const room = {
    clearedSet: new Set(clearedRoomIds),
    currentId: startRoom.id,
    entryDirection: "south",
    lastTransitionAt: Number.NEGATIVE_INFINITY,
    markExplored: vi.fn(),
    teleportTo: vi.fn(),
    transitionPending: false,
  } as unknown as RoomStore;
  const timing = {
    beginBossIntro: vi.fn(),
    beginRoomTransition: vi.fn(),
    enemyWakeUntil: 0,
    lastHazardAt: 0,
  } as unknown as TimingStore;

  handlePlayerPositionChange({
    combat,
    completedBossRoomIds,
    currentArtifactType: null,
    currentRoom: startRoom,
    currentRoomUnlocked: true,
    dungeon,
    player,
    position: [0, 1, -roomTransitionInsetZ],
    room,
    timing,
  });

  vi.unstubAllGlobals();

  return { room, timing };
};

describe("handlePlayerPositionChange", () => {
  it("starts a boss intro when entering an unresolved boss room", () => {
    const { room, timing } = enterBossRoom();

    expect(room.currentId).toBe(bossRoom.id);
    expect(timing.beginBossIntro).toHaveBeenCalledWith(
      "Iron Warden",
      "iron-warden",
      expect.any(Number)
    );
  });

  it("does not restart the boss intro for an already cleared boss room", () => {
    const { room, timing } = enterBossRoom({
      clearedRoomIds: [bossRoom.id],
    });

    expect(room.currentId).toBe(bossRoom.id);
    expect(timing.beginBossIntro).not.toHaveBeenCalled();
  });

  it("does not restart the boss intro for a persisted completed boss room", () => {
    const { room, timing } = enterBossRoom({
      completedBossRoomIds: new Set([bossRoom.id]),
    });

    expect(room.currentId).toBe(bossRoom.id);
    expect(timing.beginBossIntro).not.toHaveBeenCalled();
  });
});
