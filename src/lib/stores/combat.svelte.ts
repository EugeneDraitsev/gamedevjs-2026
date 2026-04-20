import type {
  ActiveBeam,
  ActiveBomb,
  ActiveEnemy,
  ActiveEnemyShot,
  ActiveProjectile,
  DamagePopup,
  DeflectBurst,
  MeleeFrame,
  Vec3,
} from "$lib/types/game";

export class CombatStore {
  enemies = $state<ActiveEnemy[]>([]);
  beams = $state<ActiveBeam[]>([]);
  bombs = $state<ActiveBomb[]>([]);
  enemyShots = $state<ActiveEnemyShot[]>([]);
  projectiles = $state<ActiveProjectile[]>([]);
  deflectBursts = $state<DeflectBurst[]>([]);
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

  handleProjectileMove(id: string, position: Vec3) {
    this.projectilePositions.set(id, position);
  }

  pruneExpired(
    now: number,
    beamDurationMs: number,
    popupDurationMs: number,
    burstDurationMs: number
  ) {
    this.beams = this.beams.filter(
      (beam) => now - beam.createdAt < beamDurationMs
    );
    this.damagePopups = this.damagePopups.filter(
      (popup) => now - popup.createdAt < popupDurationMs
    );
    this.deflectBursts = this.deflectBursts.filter(
      (burst) => now - burst.createdAt < burstDurationMs
    );
  }

  resetForFloor() {
    this.enemies = [];
    this.beams = [];
    this.bombs = [];
    this.enemyShots = [];
    this.projectiles = [];
    this.damagePopups = [];
    this.deflectBursts = [];
    this.projectilePositions.clear();
    this.meleeHitEnemies.clear();
    this.currentMeleeFrame = null;
  }

  clearForRoomChange() {
    this.enemies = [];
    this.beams = [];
    this.bombs = [];
    this.enemyShots = [];
    this.projectiles = [];
    this.damagePopups = [];
    this.projectilePositions.clear();
  }
}
