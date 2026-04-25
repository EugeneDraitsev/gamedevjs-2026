import type {
  MachineModuleId,
  MachineModuleTemplate,
} from "$lib/config/machine-modules";
import type { WeaponBuild } from "$lib/config/weapon-graph";

export type Vec3 = [number, number, number];
export type CameraMode = "follow" | "orbit";

export interface MeleeFrame {
  active: boolean;
  center: Vec3;
  ended: boolean;
  facingYaw: number;
  swingId: number;
  t: number;
}

export interface MeleeTrailSettings {
  bandAlphas: [number, number, number];
  bandCenters: [number, number, number];
  bandWidths: [number, number, number];
  coreColor: string;
  edgeColor: string;
  tailLength: number;
}

export interface ProjectileData {
  build: WeaponBuild;
  id: string;
  position: Vec3;
  velocity: Vec3;
}

export interface ActiveProjectile extends ProjectileData {}

export interface ActiveBeam {
  color: string;
  core: string;
  createdAt: number;
  curve: number;
  id: string;
  length: number;
  position: Vec3;
  rotationY: number;
  width: number;
}

export interface ActiveGateLaser {
  arcSpan: number;
  center: Vec3;
  color: string;
  core: string;
  createdAt: number;
  damage: number;
  fadeMs: number;
  id: string;
  originId: string;
  radius: number;
  startAngle: number;
  sweepMs: number;
  telegraphMs: number;
  width: number;
}

export interface ActiveEnemy {
  behavior: "rush" | "shooter" | "bomber";
  bombArmMs?: number;
  bombColor?: string;
  bombCooldownMs?: number;
  bombCount?: number;
  bombDamage?: number;
  bombExplosionRadius?: number;
  bombHp?: number;
  bombMaxActive?: number;
  bombRadius?: number;
  bombSpeed?: number;
  bombTtlMs?: number;
  color: string;
  hp: number;
  id: string;
  knockbackVelocity: Vec3;
  lastBombAt?: number;
  lastHitAt: number;
  lastShotAt: number;
  maxHp: number;
  moveSpeed: number;
  patrolCenter?: Vec3;
  patrolRadius?: number;
  patrolSpeed?: number;
  position: Vec3;
  preferredRange?: number;
  radius: number;
  shotColor?: string;
  shotDamage?: number;
  shotIntervalMs?: number;
  shotSpeed?: number;
  templateId: string;
  touchDamage: number;
  touchIntervalMs: number;
}

export interface ActiveEnemyShot {
  color: string;
  damage: number;
  id: string;
  position: Vec3;
  radius: number;
  ttlMs: number;
  velocity: Vec3;
}

export interface ActiveBomb {
  armAt: number;
  color: string;
  damage: number;
  expiresAt: number;
  explosionRadius: number;
  hp: number;
  id: string;
  lastHitAt: number;
  maxHp: number;
  originId: string;
  position: Vec3;
  radius: number;
  spawnedAt: number;
  velocity: Vec3;
}

export type PickupKind = "gear" | "heal" | "key";

export interface ActivePickup {
  collectedAt?: number;
  collectedTo?: Vec3;
  createdAt: number;
  id: string;
  kind: PickupKind;
  position: Vec3;
  radius: number;
  value: number;
}

export interface DeflectBurst {
  color: string;
  createdAt: number;
  id: string;
  position: Vec3;
  radius: number;
}

export interface HealBurst {
  createdAt: number;
  id: string;
  position: Vec3;
  radius: number;
}

export interface DeflectBurstShard {
  angle: number;
  position: Vec3;
  rotation: Vec3;
  scale: number;
}

export interface RenderedDeflectBurst extends DeflectBurst {
  age: number;
  fade: number;
  shards: DeflectBurstShard[];
}

export interface HealBurstParticle {
  color: string;
  opacity: number;
  position: Vec3;
  scale: number;
}

export interface RenderedHealBurst extends HealBurst {
  age: number;
  fade: number;
  particles: HealBurstParticle[];
}

export interface DoorMarker {
  args: Vec3;
  boss: boolean;
  color: string;
  emissive?: string;
  id: string;
  position: Vec3;
  style?: WallStyle;
  trimColor?: string;
}

export interface DoorSeal {
  args: Vec3;
  color: string;
  emissive?: string;
  id: string;
  position: Vec3;
  style?: WallStyle;
  trimColor?: string;
}

export interface DamagePopup {
  amount: number;
  createdAt: number;
  id: string;
  position: Vec3;
  variant: "enemy" | "heal" | "player";
}

export interface ProjectedDamagePopup extends DamagePopup {
  x: number;
  y: number;
}

export interface RoomHazard {
  args: Vec3;
  color: string;
  damage: number;
  id: string;
  position: Vec3;
}

export interface RoomPlatform {
  args: Vec3;
  color: string;
  conveyor?: Vec3;
  id: string;
  position: Vec3;
  shape?: "box" | "hex";
}

export type WallFacing = "east" | "north" | "south" | "west";
export type WallStyle = "mechanic" | "plain";

export interface StaticWall {
  args: Vec3;
  color: string;
  facing: WallFacing;
  id: string;
  lamp?: boolean;
  opacity?: number;
  position: Vec3;
  style?: WallStyle;
  trimColor?: string;
}

export interface MinimapBounds {
  columns: number;
  minX: number;
  minY: number;
  rows: number;
}

export interface SceneFloorPalette {
  even: string;
  odd: string;
  trim: string;
}

export interface SceneWallPalette {
  horizontal: string;
  vertical: string;
}

export interface SceneGearTooth {
  rotation: number;
  x: number;
  y: number;
}

export interface SceneTreasureGearMount {
  panel: Vec3;
  position: Vec3;
  size: number;
}

export interface SceneBossGearMount {
  color: string;
  position: Vec3;
  size: number;
}

export interface SceneOverlayProps {
  animationNow: number;
  artifactPickupAt?: number;
  artifactPickupProgress: number;
  bossDeathProgress: number;
  bossDeathStartedAt?: number;
  bossIntroProgress: number;
  bossIntroStartedAt?: number;
  bossIntroTitle: string;
  cameraMode: CameraMode;
  controlsLocked: boolean;
  crosshairX: number;
  crosshairY: number;
  dungeonFloor: number;
  floorIntroProgress: number;
  floorIntroStartedAt?: number;
  floorIntroSubtitle: string | null;
  floorIntroTitle: string;
  pickedArtifactTemplate: MachineModuleTemplate | null;
  playerHitFlash: number;
  playerReloading: boolean;
  playerReloadRatio: number;
  projectedDamagePopups: ProjectedDamagePopup[];
  roomTransitionProgress: number;
  vignetteIntensity: number;
}

export interface RoomEnemyContext {
  clearedEnemyRoomSet: Set<string>;
  currentEntryDirection: "east" | "north" | "south" | "west";
  now?: number;
}

export interface ArtifactCollection {
  roomId: string;
  type: MachineModuleId;
}
