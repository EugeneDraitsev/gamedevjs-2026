import type { SwingParams } from "$lib/combat/melee-swing";
import type { RoomTemplate } from "$lib/config/room-templates";
import { collectPickups, createRoomPickups } from "$lib/game/pickups";
import { getRoomHazards, getRoomPlatforms } from "$lib/game/scene-layout";
import type {
  ActivePickup,
  MeleeFrame,
  RoomPlatform,
  Vec3,
} from "$lib/types/game";

export class PickupStore {
  currentRoomId = $state("");
  itemsByRoomId = $state<Record<string, ActivePickup[]>>({});
  gears = $state(0);

  readonly items = $derived(this.itemsByRoomId[this.currentRoomId] ?? []);
  readonly countsByRoomId = $derived.by(() => {
    const counts: Record<string, { gear: number; heal: number }> = {};

    for (const [roomId, items] of Object.entries(this.itemsByRoomId)) {
      let gear = 0;
      let heal = 0;

      for (const item of items) {
        if (item.kind === "gear") {
          gear += 1;
        } else {
          heal += 1;
        }
      }

      if (gear > 0 || heal > 0) {
        counts[roomId] = { gear, heal };
      }
    }

    return counts;
  });

  enterRoom(roomId: string) {
    this.currentRoomId = roomId;

    if (!(roomId in this.itemsByRoomId)) {
      this.itemsByRoomId = { ...this.itemsByRoomId, [roomId]: [] };
    }
  }

  seedRoom(roomId: string, items: ActivePickup[]) {
    if (!(roomId in this.itemsByRoomId)) {
      this.itemsByRoomId = { ...this.itemsByRoomId, [roomId]: items };
    }
  }

  dropRoom(roomId: string, template: RoomTemplate, now: number) {
    const roomItems = this.itemsByRoomId[roomId] ?? [];
    const drops = createRoomPickups(
      roomId,
      template.enemyTemplateId,
      template.enemyCount,
      now,
      {
        hazards: getRoomHazards(template.layout),
        obstacles: getRoomPlatforms(template.layout),
        pickups: roomItems,
      }
    );

    if (drops.length > 0) {
      this.itemsByRoomId = {
        ...this.itemsByRoomId,
        [roomId]: [...roomItems, ...drops],
      };
    }

    return drops.length;
  }

  collectAt(
    position: Vec3,
    health: number,
    maxHealth: number,
    obstacles: RoomPlatform[] = [],
    pickupRadiusBonus = 0,
    meleeFrame?: MeleeFrame,
    meleeParams?: SwingParams
  ) {
    if (this.items.length === 0) {
      return {
        gearDelta: 0,
        healthDelta: 0,
        nextHealth: health,
        pickups: this.items,
      };
    }

    const result = collectPickups(
      this.items,
      position,
      health,
      maxHealth,
      performance.now(),
      { meleeFrame, meleeParams, obstacles, pickupRadiusBonus }
    );

    if (
      result.pickups.length !== this.items.length ||
      result.pickups.some((pickup, index) => pickup !== this.items[index])
    ) {
      this.itemsByRoomId = {
        ...this.itemsByRoomId,
        [this.currentRoomId]: result.pickups,
      };
    }

    if (result.gearDelta > 0) {
      this.gears += result.gearDelta;
    }

    return result;
  }

  clear() {
    this.currentRoomId = "";
    this.itemsByRoomId = {};
  }
}
