import { gameSfx } from "$lib/audio/sfx";
import type { DungeonLayout, DungeonRoom } from "$lib/config/dungeon-layout";
import type { MachineModuleId } from "$lib/config/machine-modules";
import {
  enemyTemplateById,
  roomTemplateById,
} from "$lib/config/room-templates";
import {
  getEntryDirectionFromTarget,
  getRoomBounds,
  getRoomEntryTarget,
  getTransition,
  roomTeleportZ,
} from "$lib/game/scene-layout";
import type { CombatStore } from "$lib/stores/combat.svelte";
import type { PlayerStore } from "$lib/stores/player.svelte";
import type { RoomStore } from "$lib/stores/room.svelte";
import type { TimingStore } from "$lib/stores/timing.svelte";
import type { Vec3 } from "$lib/types/game";

interface TransitionArgs {
  combat: CombatStore;
  currentArtifactType: MachineModuleId | null;
  currentRoom: DungeonRoom;
  currentRoomUnlocked: boolean;
  dungeon: DungeonLayout;
  onCollectArtifact?: (roomId: string, type: MachineModuleId) => void;
  player: PlayerStore;
  position: Vec3;
  room: RoomStore;
  timing: TimingStore;
}

export const handlePlayerPositionChange = (args: TransitionArgs) => {
  const {
    combat,
    currentArtifactType,
    currentRoom,
    currentRoomUnlocked,
    dungeon,
    onCollectArtifact,
    player,
    position,
    room,
    timing,
  } = args;

  player.lastPosition = position;
  const now = performance.now();
  const transition = currentRoomUnlocked
    ? getTransition(currentRoom, position)
    : null;

  if (
    !transition ||
    room.transitionPending ||
    now - room.lastTransitionAt < 240
  ) {
    if (currentArtifactType && Math.hypot(position[0], position[2]) < 1.5) {
      timing.pickArtifact(currentArtifactType, now);
      gameSfx.playArtifactPickup();
      onCollectArtifact?.(currentRoom.id, currentArtifactType);
    }

    return;
  }

  const nextRoom = dungeon.rooms[transition.roomId];
  const entryDirection =
    nextRoom.kind === "boss"
      ? "south"
      : getEntryDirectionFromTarget(transition.target);
  const target = getRoomEntryTarget(
    entryDirection,
    transition.target[1],
    getRoomBounds(roomTemplateById[nextRoom.templateId].layout)
  );
  room.lastTransitionAt = now;
  room.transitionPending = true;
  timing.beginRoomTransition(now);

  const applyTransition = () => {
    if (!room.transitionPending) {
      return;
    }

    const appliedAt = performance.now();

    room.transitionPending = false;
    room.entryDirection = entryDirection;
    room.currentId = transition.roomId;
    room.teleportTo(
      nextRoom.kind === "boss" ? [0, target[1], roomTeleportZ] : target
    );
    combat.clearForRoomChange();
    timing.enemyWakeUntil = appliedAt + 650;
    timing.lastHazardAt = appliedAt;
    player.impactVelocity = null;

    if (nextRoom.kind === "boss") {
      const title =
        enemyTemplateById[
          roomTemplateById[nextRoom.templateId].enemyTemplateId ?? ""
        ]?.label ?? "Boss";

      timing.beginBossIntro(title, appliedAt);
    }

    room.markExplored(transition.roomId);
  };

  if (typeof requestAnimationFrame === "undefined") {
    applyTransition();
  } else {
    requestAnimationFrame(() => requestAnimationFrame(applyTransition));
  }
};

interface ResetArgs {
  combat: CombatStore;
  dungeon: DungeonLayout;
  now: number;
  player: PlayerStore;
  room: RoomStore;
  timing: TimingStore;
}

export const resetPlayerAfterDeath = ({
  combat,
  dungeon,
  now,
  player,
  room,
  timing,
}: ResetArgs) => {
  combat.enemies = [];
  combat.beams = [];
  combat.enemyShots = [];
  combat.gateLasers = [];
  combat.damagePopups = [];
  combat.projectiles = [];
  combat.projectilePositions.clear();
  timing.enemyWakeUntil = 0;
  timing.lastHazardAt = now;
  timing.bossIntroStartedAt = 0;
  timing.bossIntroTitle = "";
  room.currentId = dungeon.startRoomId;
  room.unlockingRoomId = "";
  room.transitionPending = false;
  room.doorOpenAmount = 1;
  player.resetForRespawn();
  const startRoom = dungeon.rooms[dungeon.startRoomId];
  const startBounds = getRoomBounds(
    roomTemplateById[startRoom.templateId].layout
  );

  room.teleportTo([
    0,
    1.1,
    startRoom.templateId === "outside-start" ? startBounds.teleportZ * 0.92 : 0,
  ]);
};
