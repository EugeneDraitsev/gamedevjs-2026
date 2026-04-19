import { playerMaxHealth } from "$lib/game/scene-layout";
import type { Vec3 } from "$lib/types/game";

export class PlayerStore {
  readonly maxHealth = playerMaxHealth;
  health = $state(playerMaxHealth);
  lastPosition = $state<Vec3>([0, 1, 0]);
  lastHitAt = $state(0);
  recoverDuration = $state(0);
  recoverUntil = $state(0);
  impactNonce = $state(0);
  impactVelocity = $state<Vec3 | null>(null);
  shotCount = 0;
  lastTouchHitAt = 0;

  readonly healthRatio = $derived(this.health / this.maxHealth);

  triggerRecover(duration: number) {
    this.recoverDuration = duration;
    this.recoverUntil = performance.now() + duration;
  }

  pushImpact(vector: Vec3, strength: number, lift = 0.16) {
    const distance = Math.hypot(vector[0], vector[2]) || 1;

    this.impactVelocity = [
      (vector[0] / distance) * strength,
      lift,
      (vector[2] / distance) * strength,
    ];
    this.impactNonce += 1;
  }

  takeDamage(amount: number, at: number) {
    this.health = Math.max(0, this.health - amount);
    this.lastHitAt = at;
  }

  resetForRespawn() {
    this.health = playerMaxHealth;
    this.shotCount = 0;
    this.recoverDuration = 0;
    this.recoverUntil = 0;
    this.impactVelocity = null;
  }

  resetForFloor() {
    this.health = playerMaxHealth;
    this.shotCount = 0;
    this.lastHitAt = 0;
    this.lastTouchHitAt = 0;
    this.recoverDuration = 0;
    this.recoverUntil = 0;
    this.impactVelocity = null;
    this.impactNonce = 0;
  }
}
