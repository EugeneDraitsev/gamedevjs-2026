import { getContext, setContext } from "svelte";
import type { Readable } from "svelte/store";
import type { Texture } from "three";
import type { DungeonLayout, DungeonRoom } from "$lib/config/dungeon-layout";
import type {
  RoomEnvironmentId,
  RoomTemplate,
} from "$lib/config/room-templates";
import type { WeaponNodeTemplate } from "$lib/config/weapon-graph";
import type {
  ActiveBeam,
  ActiveEnemy,
  ActiveEnemyShot,
  CameraMode,
  DoorMarker,
  DoorSeal,
  MinimapBounds,
  ProjectedDamagePopup,
  RenderedDeflectBurst,
  RoomHazard,
  RoomPlatform,
  SceneFloorPalette,
  StaticWall,
} from "$lib/types/game";

const gameSceneContextKey = Symbol("game-scene-context");

export interface GameSceneContext {
  activeBeams: Readable<ActiveBeam[]>;
  activeEnemies: Readable<ActiveEnemy[]>;
  animationNow: Readable<number>;
  artifactPickupProgress: Readable<number>;
  bossDoorTexture: Readable<Texture | null>;
  bossFloorTexture: Readable<Texture | null>;
  bossIntroProgress: Readable<number>;
  bossIntroTitle: Readable<string>;
  cameraMode: Readable<CameraMode>;
  crosshairX: Readable<number>;
  crosshairY: Readable<number>;
  currentArtifactTemplate: Readable<WeaponNodeTemplate | null>;
  currentFloorPalette: Readable<SceneFloorPalette>;
  currentRoom: Readable<DungeonRoom>;
  currentRoomTemplate: Readable<RoomTemplate>;
  deflectBurstsRendered: Readable<RenderedDeflectBurst[]>;
  doorOpenAmount: Readable<number>;
  dungeon: Readable<DungeonLayout>;
  dungeonFloor: Readable<number>;
  enemyShots: Readable<ActiveEnemyShot[]>;
  exploredRoomSet: Readable<Set<string>>;
  floorIntroProgress: Readable<number>;
  isRoomUnlocked: (room: DungeonRoom) => boolean;
  lavaSurfaceTexture: Readable<Texture | null>;
  minimapBounds: Readable<MinimapBounds>;
  pickedArtifactTemplate: Readable<WeaponNodeTemplate | null>;
  playerHealth: Readable<number>;
  playerHealthRatio: Readable<number>;
  playerHitFlash: Readable<number>;
  playerRecoverRatio: Readable<number>;
  projectedDamagePopups: Readable<ProjectedDamagePopup[]>;
  roomDoorSeals: Readable<DoorSeal[]>;
  roomDoors: Readable<DoorMarker[]>;
  roomEnvironment: Readable<RoomEnvironmentId | null>;
  roomHazards: Readable<RoomHazard[]>;
  roomList: Readable<DungeonRoom[]>;
  roomPlatforms: Readable<RoomPlatform[]>;
  roomWalls: Readable<StaticWall[]>;
  sceneControlsLocked: Readable<boolean>;
  sceneUiVisible: Readable<boolean>;
  treasureFloorTexture: Readable<Texture | null>;
}

export const setGameSceneContext = (context: GameSceneContext) =>
  setContext(gameSceneContextKey, context);

export const getGameSceneContext = () =>
  getContext<GameSceneContext>(gameSceneContextKey);
