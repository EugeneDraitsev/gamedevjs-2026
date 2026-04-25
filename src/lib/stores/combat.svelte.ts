import { gameSfx } from "$lib/audio/sfx";
import type {
  ActiveBeam,
  ActiveBomb,
  ActiveEnemy,
  ActiveEnemyShot,
  ActiveGateLaser,
  ActiveProjectile,
  DamagePopup,
  DeflectBurst,
  HealBurst,
  MeleeFrame,
  ProjectileImpactBurst,
  Vec3,
} from "$lib/types/game";

export class CombatStore {
  enemies = $state<ActiveEnemy[]>([]);
  beams = $state<ActiveBeam[]>([]);
  bombs = $state<ActiveBomb[]>([]);
  enemyShots = $state<ActiveEnemyShot[]>([]);
  gateLasers = $state<ActiveGateLaser[]>([]);
  projectiles = $state<ActiveProjectile[]>([]);
  deflectBursts = $state<DeflectBurst[]>([]);
  projectileImpactBursts = $state<ProjectileImpactBurst[]>([]);
  healBursts = $state<HealBurst[]>([]);
  damagePopups = $state<DamagePopup[]>([]);

  readonly projectilePositions = new Map<string, Vec3>();
  readonly meleeHitEnemies = new Map<number, Set<string>>();
  currentMeleeFrame: MeleeFrame | null = null;

  popDamage(amount: number, position: Vec3, variant: DamagePopup["variant"]) {
    this.damagePopups.push({
      amount,
      createdAt: performance.now(),
      id: crypto.randomUUID(),
      position,
      variant,
    });

    if (variant === "enemy") {
      gameSfx.playEnemyHit();
    }
  }

  popHeal(amount: number, position: Vec3) {
    const createdAt = performance.now();

    this.damagePopups.push({
      amount,
      createdAt,
      id: crypto.randomUUID(),
      position,
      variant: "heal",
    });
    this.healBursts.push({
      createdAt,
      id: crypto.randomUUID(),
      position,
      radius: 1,
    });
  }

  popProjectileImpact(impact: Omit<ProjectileImpactBurst, "createdAt" | "id">) {
    this.projectileImpactBursts.push({
      ...impact,
      createdAt: performance.now(),
      id: crypto.randomUUID(),
    });

    if (this.projectileImpactBursts.length > 24) {
      this.projectileImpactBursts.splice(
        0,
        this.projectileImpactBursts.length - 24
      );
    }
  }

  addBeams(beams: ActiveBeam[]) {
    if (beams.length > 0) {
      this.beams = [...this.beams, ...beams];
    }
  }

  addProjectiles(projectiles: ActiveProjectile[]) {
    if (projectiles.length > 0) {
      this.projectiles = [...this.projectiles, ...projectiles];
    }
  }

  removeProjectile(id: string) {
    this.projectilePositions.delete(id);
    this.projectiles = this.projectiles.filter(
      (projectile) => projectile.id !== id
    );
  }

  removeProjectiles(ids: Set<string>) {
    if (ids.size === 0) {
      return;
    }

    for (const id of ids) {
      this.projectilePositions.delete(id);
    }

    this.projectiles = this.projectiles.filter(
      (projectile) => !ids.has(projectile.id)
    );
  }

  handleProjectileMove(id: string, x: number, y: number, z: number) {
    const position = this.projectilePositions.get(id);

    if (position) {
      position[0] = x;
      position[1] = y;
      position[2] = z;
      return;
    }

    this.projectilePositions.set(id, [x, y, z]);
  }

  pruneExpired(
    now: number,
    beamDurationMs: number,
    popupDurationMs: number,
    burstDurationMs: number,
    projectileImpactBurstDurationMs: number,
    healBurstDurationMs: number
  ) {
    this.beams = this.beams.filter(
      (beam) => now - beam.createdAt < beamDurationMs
    );
    this.gateLasers = this.gateLasers.filter(
      (laser) =>
        now - laser.createdAt < laser.telegraphMs + laser.sweepMs + laser.fadeMs
    );
    this.damagePopups = this.damagePopups.filter(
      (popup) => now - popup.createdAt < popupDurationMs
    );
    this.deflectBursts = this.deflectBursts.filter(
      (burst) => now - burst.createdAt < burstDurationMs
    );
    this.projectileImpactBursts = this.projectileImpactBursts.filter(
      (burst) => now - burst.createdAt < projectileImpactBurstDurationMs
    );
    this.healBursts = this.healBursts.filter(
      (burst) => now - burst.createdAt < healBurstDurationMs
    );
  }

  resetForFloor() {
    this.enemies = [];
    this.beams = [];
    this.bombs = [];
    this.enemyShots = [];
    this.gateLasers = [];
    this.projectiles = [];
    this.damagePopups = [];
    this.deflectBursts = [];
    this.projectileImpactBursts = [];
    this.healBursts = [];
    this.projectilePositions.clear();
    this.meleeHitEnemies.clear();
    this.currentMeleeFrame = null;
  }

  clearForRoomChange() {
    this.enemies = [];
    this.beams = [];
    this.bombs = [];
    this.enemyShots = [];
    this.gateLasers = [];
    this.projectiles = [];
    this.damagePopups = [];
    this.projectileImpactBursts = [];
    this.healBursts = [];
    this.projectilePositions.clear();
  }
}
