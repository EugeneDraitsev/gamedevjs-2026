import type { RoomTemplate } from "$lib/config/room-templates";
import { collectPickups, createRoomPickups } from "$lib/game/pickups";
import type { ActivePickup, Vec3 } from "$lib/types/game";

export class PickupStore {
  items = $state<ActivePickup[]>([]);
  gears = $state(0);

  dropRoom(roomId: string, template: RoomTemplate, now: number) {
    const drops = createRoomPickups(
      roomId,
      template.enemyTemplateId,
      template.enemyCount,
      now
    );

    if (drops.length > 0) {
      this.items = [...this.items, ...drops];
    }
  }

  collectAt(position: Vec3, health: number, maxHealth: number) {
    if (this.items.length === 0) {
      return {
        gearDelta: 0,
        healthDelta: 0,
        nextHealth: health,
        pickups: this.items,
      };
    }

    const result = collectPickups(this.items, position, health, maxHealth);

    if (result.pickups.length !== this.items.length) {
      this.items = result.pickups;
    }

    if (result.gearDelta > 0) {
      this.gears += result.gearDelta;
    }

    return result;
  }

  clear() {
    this.items = [];
  }
}
