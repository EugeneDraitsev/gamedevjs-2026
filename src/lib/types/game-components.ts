import type { BufferGeometry, ShaderMaterial, Texture } from "three";
import type { OrbitControls as OrbitControlsInstance } from "three/examples/jsm/controls/OrbitControls.js";
import type { MusicCue, MusicTransitionOptions } from "$lib/audio/music";
import type { SwingParams } from "$lib/combat/melee-swing";
import type { DungeonLayout, DungeonRoom } from "$lib/config/dungeon-layout";
import type {
  MachineModuleId,
  MachineModuleTemplate,
  MachineStats,
} from "$lib/config/machine-modules";
import type { RoomTemplate } from "$lib/config/room-templates";
import type { SceneSettings } from "$lib/config/scene-settings";
import type { WeaponBuild } from "$lib/config/weapon-graph";
import type {
  ActiveBeam,
  ActiveEnemy,
  ActiveEnemyShot,
  DoorMarker,
  DoorSeal,
  MeleeFrame,
  MeleeTrailSettings,
  MinimapBounds,
  ProjectileData,
  RenderedDeflectBurst,
  RoomHazard,
  RoomPlatform,
  StaticWall,
  Vec3,
} from "$lib/types/game";

export interface GameSceneProps {
  collectedArtifactRoomIds?: string[];
  controlsLocked?: boolean;
  dungeon: DungeonLayout;
  enemyAiPaused?: boolean;
  enemySpawnOverride?: Partial<
    Pick<RoomTemplate, "enemyCount" | "enemyTemplateId" | "spawnPattern">
  >;
  floorReliefMaps?: boolean;
  floorReliefStrength?: number;
  gearCount?: number;
  machineStats: MachineStats;
  meleeParams: SwingParams;
  meleeTrailSettings: MeleeTrailSettings;
  onAdvanceFloor?: () => void;
  onCollectArtifact?: (roomId: string, type: MachineModuleId) => void;
  onEndDemo?: () => void;
  onGearCountChange?: (gearCount: number) => void;
  onMusicCue?: (cue: MusicCue, options?: MusicTransitionOptions) => void;
  onOpenSettings?: () => void;
  onOpenWeaponLab?: () => void;
  settings: SceneSettings;
  weaponBuild: WeaponBuild;
}

export interface GameSceneEnvironmentProps {
  animationNow: number;
  bossDoorTexture: Texture | null;
  bossFloorHeightTexture: Texture | null;
  bossFloorNormalTexture: Texture | null;
  bossFloorTexture: Texture | null;
  currentArtifactTemplate: MachineModuleTemplate | null;
  currentRoom: DungeonRoom;
  currentRoomTemplate: RoomTemplate;
  doorOpenAmount: number;
  dungeon: DungeonLayout;
  foundryFloorDecalTexture: Texture | null;
  foundryFloorTexture: Texture | null;
  lavaSurfaceTexture: Texture | null;
  roomDoorSeals: DoorSeal[];
  roomDoors: DoorMarker[];
  roomHazards: RoomHazard[];
  roomPlatforms: RoomPlatform[];
  roomWalls: StaticWall[];
  treasureFloorHeightTexture: Texture | null;
  treasureFloorNormalTexture: Texture | null;
  treasureFloorTexture: Texture | null;
}

export interface GameSceneActorsProps {
  activeBeams: ActiveBeam[];
  activeEnemies: ActiveEnemy[];
  animationNow: number;
  deflectBurstsRendered: RenderedDeflectBurst[];
  enemyShots: ActiveEnemyShot[];
}

export interface GameMinimapProps {
  currentRoom: DungeonRoom;
  dungeon: DungeonLayout;
  exploredRoomSet: Set<string>;
  isRoomUnlocked: (room: DungeonRoom) => boolean;
  minimapBounds: MinimapBounds;
  roomList: DungeonRoom[];
}

export interface GameHudProps {
  playerHealth: number;
  playerHealthRatio: number;
  playerRecoverRatio: number;
}

export interface PlayerControllerProps {
  onMeleeFrame?: (frame: MeleeFrame) => void;
  onPositionChange?: (position: Vec3) => void;
  onShoot?: (projectile: { position: Vec3; velocity: Vec3 }) => void;
  orbitControls?: OrbitControlsInstance;
}

export interface PlayerMeleeVisualsProps {
  isSwingingVisual: boolean;
  meleeParams: SwingParams;
  meleeShowSword: boolean;
  meleeSwordOpacity: number;
  meleeTrailSettings: MeleeTrailSettings;
  swingActiveFlare: number;
  swingBladeLength: number;
  swingBladeMidZ: number;
  swingBladeTipZ: number;
  swingCenter: Vec3;
  swingFacingYaw: number;
  swingLightRadial: number;
  swingLingerFade: number;
  swordRotationY: number;
  trailGeometry?: BufferGeometry;
  trailMaterial?: ShaderMaterial;
}

export interface PlayerDebugMarkersProps {
  cameraTarget: Vec3;
  groundProbeLength: number;
  groundProbePosition: Vec3;
  isGrounded: boolean;
  lookTarget: Vec3;
  showDebugGeometry: boolean;
}

export interface ProjectileProps {
  data: ProjectileData;
  enemyTargets?: Vec3[];
  onExpire?: (id: string) => void;
  onMove?: (id: string, position: Vec3) => void;
}
