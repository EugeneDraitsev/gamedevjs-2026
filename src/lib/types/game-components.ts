import type { BufferGeometry, ShaderMaterial, Texture } from "three";
import type { OrbitControls as OrbitControlsInstance } from "three/examples/jsm/controls/OrbitControls.js";
import type { SwingParams } from "$lib/combat/melee-swing";
import type { DungeonLayout, DungeonRoom } from "$lib/config/dungeon-layout";
import type { RoomTemplate } from "$lib/config/room-templates";
import type { FloorTheme, WallTheme } from "$lib/config/scene-settings";
import type {
  WeaponBuild,
  WeaponNodeTemplate,
  WeaponNodeType,
} from "$lib/config/weapon-graph";
import type {
  ActiveBeam,
  ActiveEnemy,
  ActiveEnemyShot,
  CameraMode,
  DoorMarker,
  DoorSeal,
  MeleeFrame,
  MeleeTrailSettings,
  MinimapBounds,
  ProjectileData,
  RenderedDeflectBurst,
  RoomHazard,
  RoomPlatform,
  SceneFloorPalette,
  StaticWall,
  Vec3,
} from "$lib/types/game";

export interface GameSceneProps {
  ambientLightIntensity?: number;
  cameraFov?: number;
  cameraMode?: CameraMode;
  cameraSmoothing?: number;
  collectedArtifactRoomIds?: string[];
  controlsLocked?: boolean;
  dungeon: DungeonLayout;
  floorTheme?: FloorTheme;
  followDistance?: number;
  followPitch?: number;
  followYaw?: number;
  gravityY?: number;
  jumpSpeed?: number;
  lookHeight?: number;
  meleeCooldownMs?: number;
  meleeHitboxPadding?: number;
  meleeParams?: SwingParams;
  meleeShowSword?: boolean;
  meleeSwordOpacity?: number;
  meleeTrailSettings?: MeleeTrailSettings;
  moveResponsiveness?: number;
  moveSpeed?: number;
  onCollectArtifact?: (roomId: string, type: WeaponNodeType) => void;
  playerLinearDamping?: number;
  shadowBias?: number;
  shadowFar?: number;
  shadowFrustum?: number;
  shadowMapSize?: number;
  shadowNormalBias?: number;
  showDebugGeometry?: boolean;
  showPhysicsDebug?: boolean;
  sunIntensity?: number;
  sunPositionX?: number;
  sunPositionY?: number;
  sunPositionZ?: number;
  wallTheme?: WallTheme;
  weaponBuild: WeaponBuild;
}

export interface GameSceneEnvironmentProps {
  animationNow: number;
  bossDoorTexture: Texture | null;
  bossFloorTexture: Texture | null;
  currentArtifactTemplate: WeaponNodeTemplate | null;
  currentFloorPalette: SceneFloorPalette;
  currentRoom: DungeonRoom;
  currentRoomTemplate: RoomTemplate;
  doorOpenAmount: number;
  dungeon: DungeonLayout;
  lavaSurfaceTexture: Texture | null;
  roomDoorSeals: DoorSeal[];
  roomDoors: DoorMarker[];
  roomHazards: RoomHazard[];
  roomPlatforms: RoomPlatform[];
  roomWalls: StaticWall[];
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
  cameraMode?: CameraMode;
  cameraSmoothing?: number;
  controlsLocked?: boolean;
  followDistance?: number;
  followPitch?: number;
  followYaw?: number;
  hitFlash?: number;
  impactNonce?: number;
  impactVelocity?: Vec3 | null;
  jumpSpeed?: number;
  lookHeight?: number;
  meleeCooldownMs?: number;
  meleeHitboxPadding?: number;
  meleeParams?: SwingParams;
  meleeShowSword?: boolean;
  meleeSwordOpacity?: number;
  meleeTrailSettings?: MeleeTrailSettings;
  moveResponsiveness?: number;
  moveSpeed?: number;
  moveSpeedFactor?: number;
  onMeleeFrame?: (frame: MeleeFrame) => void;
  onMouseMove?: (x: number, y: number) => void;
  onPositionChange?: (position: Vec3) => void;
  onShoot?: (projectile: { position: Vec3; velocity: Vec3 }) => void;
  orbitControls?: OrbitControlsInstance;
  playerLinearDamping?: number;
  showDebugGeometry?: boolean;
  teleportNonce?: number;
  teleportTarget?: Vec3 | null;
  weaponBuild: WeaponBuild;
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
