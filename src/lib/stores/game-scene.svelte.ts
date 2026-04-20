import type { PerspectiveCamera } from "three";
import type { SwingParams } from "$lib/combat/melee-swing";
import { getHazardBrakeFactor } from "$lib/components/game/scene/utils";
import type { DungeonLayout, DungeonRoom } from "$lib/config/dungeon-layout";
import { roomTemplateById } from "$lib/config/room-templates";
import type { SceneSettings } from "$lib/config/scene-settings";
import type { WeaponBuild, WeaponNodeTemplate } from "$lib/config/weapon-graph";
import { getWeaponNodeTemplate } from "$lib/config/weapon-graph";
import {
  createDoorMarkers,
  createDoorSeals,
  createRoomWalls,
  floorThemes,
  getRoomHazards,
  getRoomPlatforms,
  wallThemes,
} from "$lib/game/scene-layout";
import {
  getMinimapBounds,
  projectDamagePopups,
  renderDeflectBursts,
} from "$lib/game/scene-ui";
import { CombatStore } from "$lib/stores/combat.svelte";
import { CrosshairStore } from "$lib/stores/crosshair.svelte";
import { PlayerStore } from "$lib/stores/player.svelte";
import { RoomStore } from "$lib/stores/room.svelte";
import { TextureStore } from "$lib/stores/textures.svelte";
import { TimingStore } from "$lib/stores/timing.svelte";
import type { MeleeTrailSettings, SceneOverlayProps } from "$lib/types/game";

interface GameSceneStoreInput {
  collectedArtifactRoomIds: string[];
  controlsLocked: boolean;
  dungeon: DungeonLayout;
  meleeParams: SwingParams;
  meleeTrailSettings: MeleeTrailSettings;
  settings: SceneSettings;
  weaponBuild: WeaponBuild;
}

export class GameSceneStore {
  readonly combat = new CombatStore();
  readonly crosshair = new CrosshairStore();
  readonly player = new PlayerStore();
  readonly room = new RoomStore();
  readonly textures = new TextureStore();
  readonly timing = new TimingStore();

  collectedArtifactRoomIds = $state<string[]>([]);
  controlsLocked = $state(false);
  dungeon = $state.raw<DungeonLayout>(null as never);
  meleeParams = $state.raw<SwingParams>(null as never);
  meleeTrailSettings = $state.raw<MeleeTrailSettings>(null as never);
  settings = $state.raw<SceneSettings>(null as never);
  weaponBuild = $state.raw<WeaponBuild>(null as never);
  camera = $state<PerspectiveCamera>();

  readonly roomList = $derived(Object.values(this.dungeon.rooms));
  readonly currentFloorPalette = $derived(
    floorThemes[this.settings.floorTheme]
  );
  readonly currentWallPalette = $derived(wallThemes[this.settings.wallTheme]);
  readonly currentRoom = $derived(
    this.dungeon.rooms[this.room.currentId] ??
      this.dungeon.rooms[this.dungeon.startRoomId]
  );
  readonly currentRoomTemplate = $derived(
    roomTemplateById[this.currentRoom.templateId]
  );
  readonly isCurrentRoomCombat = $derived(
    this.currentRoomTemplate.spawnPattern !== "none"
  );
  readonly roomPlatforms = $derived(
    getRoomPlatforms(this.currentRoomTemplate.layout)
  );
  readonly roomHazards = $derived(
    getRoomHazards(this.currentRoomTemplate.layout)
  );
  readonly roomWalls = $derived(
    createRoomWalls(this.currentRoom, this.currentWallPalette)
  );
  readonly roomDoors = $derived(
    createDoorMarkers(this.currentRoom, this.dungeon)
  );
  readonly roomDoorSeals = $derived(createDoorSeals(this.currentRoom));
  readonly visibleMinimapRooms = $derived.by(() => {
    const explored = this.roomList.filter((room) =>
      this.room.exploredSet.has(room.id)
    );

    if (explored.length > 0) {
      return explored;
    }

    const fallback = this.dungeon.rooms[this.room.currentId];

    return fallback ? [fallback] : [];
  });
  readonly minimapBounds = $derived(
    getMinimapBounds(
      this.visibleMinimapRooms.length > 0
        ? this.visibleMinimapRooms
        : this.roomList
    )
  );
  readonly collectedArtifactRoomSet = $derived(
    new Set(this.collectedArtifactRoomIds)
  );
  readonly currentArtifactType = $derived.by(() => {
    const available =
      this.currentRoom.artifactType &&
      !this.collectedArtifactRoomSet.has(this.currentRoom.id) &&
      (this.currentRoom.kind === "treasure" ||
        (this.currentRoom.kind === "boss" &&
          this.room.clearedSet.has(this.currentRoom.id)));

    return available ? (this.currentRoom.artifactType ?? null) : null;
  });
  readonly currentArtifactTemplate = $derived<WeaponNodeTemplate | null>(
    this.currentArtifactType
      ? getWeaponNodeTemplate(this.currentArtifactType)
      : null
  );
  readonly pickedArtifactTemplate = $derived<WeaponNodeTemplate | null>(
    this.timing.pickedArtifactType
      ? getWeaponNodeTemplate(this.timing.pickedArtifactType)
      : null
  );
  readonly playerHitFlash = $derived(
    Math.max(0, 1 - (this.timing.now - this.player.lastHitAt) / 180)
  );
  readonly playerRecoverRatio = $derived(
    this.player.recoverDuration > 0
      ? Math.max(
          0,
          (this.player.recoverUntil - this.timing.now) /
            this.player.recoverDuration
        )
      : 0
  );
  readonly playerReloadRatio = $derived(
    this.player.reloading && this.player.reloadDuration > 0
      ? Math.max(
          0,
          Math.min(
            1,
            1 -
              (this.player.reloadUntil - this.timing.now) /
                this.player.reloadDuration
          )
        )
      : 0
  );
  readonly sceneControlsLocked = $derived(
    this.controlsLocked || this.timing.bossIntroActive
  );
  readonly projectedDamagePopups = $derived.by(() => {
    if (!(this.camera && typeof window !== "undefined")) {
      return [];
    }

    return projectDamagePopups(
      this.combat.damagePopups,
      this.camera,
      window.innerWidth,
      window.innerHeight
    );
  });
  readonly deflectBurstsRendered = $derived(
    renderDeflectBursts(this.combat.deflectBursts, this.timing.now)
  );
  readonly overlays = $derived.by<SceneOverlayProps>(() => ({
    animationNow: this.timing.now,
    artifactPickupAt: this.timing.pickedArtifactAt,
    artifactPickupProgress: this.timing.artifactPickupProgress,
    bossIntroStartedAt: this.timing.bossIntroStartedAt,
    bossIntroProgress: this.timing.bossIntroProgress,
    bossIntroTitle: this.timing.bossIntroTitle,
    cameraMode: this.settings.cameraMode,
    controlsLocked: this.sceneControlsLocked,
    crosshairX: this.crosshair.x,
    crosshairY: this.crosshair.y,
    dungeonFloor: this.dungeon.floor,
    floorIntroStartedAt: this.timing.floorIntroStartedAt,
    floorIntroProgress: this.timing.floorIntroProgress,
    pickedArtifactTemplate: this.pickedArtifactTemplate,
    playerHitFlash: this.playerHitFlash,
    playerReloadRatio: this.playerReloadRatio,
    playerReloading: this.player.reloading,
    projectedDamagePopups: this.projectedDamagePopups,
  }));
  readonly sceneUiVisible = $derived(
    this.timing.floorIntroStartedAt > 0 &&
      this.timing.now >= this.timing.floorIntroStartedAt &&
      this.room.currentId !== ""
  );
  readonly roomEnvironment = $derived(
    this.currentRoomTemplate.environment ?? null
  );
  readonly currentRoomUnlocked = $derived(
    !this.isCurrentRoomCombat || this.room.releasedSet.has(this.currentRoom.id)
  );
  readonly activeEnemyTargets = $derived(
    this.combat.enemies.map((enemy) => enemy.position)
  );
  readonly moveSpeedFactor = $derived(
    getHazardBrakeFactor(this.player.lastPosition, this.roomHazards)
  );

  syncInputs(input: GameSceneStoreInput) {
    this.collectedArtifactRoomIds = input.collectedArtifactRoomIds;
    this.controlsLocked = input.controlsLocked;
    this.dungeon = input.dungeon;
    this.meleeParams = input.meleeParams;
    this.meleeTrailSettings = input.meleeTrailSettings;
    this.settings = input.settings;
    this.weaponBuild = input.weaponBuild;
  }

  isRoomUnlocked(candidate: DungeonRoom) {
    return (
      roomTemplateById[candidate.templateId].spawnPattern === "none" ||
      this.room.releasedSet.has(candidate.id)
    );
  }
}
