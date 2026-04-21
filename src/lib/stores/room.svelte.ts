import type { DungeonRoomDirection } from "$lib/config/dungeon-layout";
import type { Vec3 } from "$lib/types/game";

export class RoomStore {
  currentId = $state("");
  exploredIds = $state<string[]>([]);
  clearedEnemyIds = $state<string[]>([]);
  releasedIds = $state<string[]>([]);
  doorOpenAmount = $state(1);
  teleportNonce = $state(0);
  teleportTarget = $state<Vec3 | null>(null);
  entryDirection = $state<DungeonRoomDirection>("south");

  unlockingRoomId = "";
  unlockStartedAt = 0;
  lastTransitionAt = 0;
  transitionPending = false;

  readonly exploredSet = $derived(new Set(this.exploredIds));
  readonly clearedSet = $derived(new Set(this.clearedEnemyIds));
  readonly releasedSet = $derived(new Set(this.releasedIds));

  markExplored(id: string) {
    if (!this.exploredIds.includes(id)) {
      this.exploredIds = [...this.exploredIds, id];
    }
  }

  markReleased(id: string) {
    this.releasedIds = [...this.releasedIds, id];
  }

  markCleared(id: string) {
    this.clearedEnemyIds = [...this.clearedEnemyIds, id];
  }

  teleportTo(target: Vec3) {
    this.teleportTarget = target;
    this.teleportNonce += 1;
  }

  beginUnlock(id: string, now: number) {
    this.unlockingRoomId = id;
    this.unlockStartedAt = now;
    this.doorOpenAmount = 0;
  }

  resetForFloor(startRoomId: string) {
    this.currentId = startRoomId;
    this.exploredIds = [startRoomId];
    this.releasedIds = [startRoomId];
    this.clearedEnemyIds = [];
    this.entryDirection = "south";
    this.doorOpenAmount = 1;
    this.teleportTarget = null;
    this.teleportNonce = 0;
    this.unlockingRoomId = "";
    this.unlockStartedAt = 0;
    this.lastTransitionAt = 0;
    this.transitionPending = false;
  }
}
