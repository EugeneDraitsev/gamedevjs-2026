import type { CombatStore } from "$lib/stores/combat.svelte";
import type { PlayerStore } from "$lib/stores/player.svelte";
import type { TimingStore } from "$lib/stores/timing.svelte";

interface PauseGameSceneTimersArgs {
  combat: CombatStore;
  deltaMs: number;
  player: PlayerStore;
  timing: TimingStore;
}

const shiftPositiveTimestamp = (value: number, deltaMs: number) =>
  value > 0 && Number.isFinite(value) ? value + deltaMs : value;

export const pauseGameSceneTimers = ({
  combat,
  deltaMs,
  player,
  timing,
}: PauseGameSceneTimersArgs) => {
  if (deltaMs <= 0) {
    return;
  }

  // Advance the frozen "now" alongside every shifted createdAt so visual
  // ages (animationNow - createdAt) stay constant through the pause. If
  // we only shifted createdAts forward, ages would go negative each frame
  // and scale formulas like `1 + Math.min(cap, age / dur)` would produce
  // huge negative scales (the giant flipped damage popup bug).
  timing.now += deltaMs;

  combat.pauseEnemyTimedActors(deltaMs);

  for (const beam of combat.beams) {
    beam.createdAt += deltaMs;
  }

  for (const popup of combat.damagePopups) {
    popup.createdAt += deltaMs;
  }

  for (const burst of combat.deflectBursts) {
    burst.createdAt += deltaMs;
  }

  for (const burst of combat.projectileImpactBursts) {
    burst.createdAt += deltaMs;
  }

  for (const burst of combat.healBursts) {
    burst.createdAt += deltaMs;
  }

  for (const enemy of combat.enemies) {
    if (typeof enemy.lastBombAt === "number") {
      enemy.lastBombAt += deltaMs;
    }

    enemy.lastHitAt += deltaMs;
    enemy.lastShotAt += deltaMs;
  }

  player.lastHitAt = shiftPositiveTimestamp(player.lastHitAt, deltaMs);
  player.lastPositionAt = shiftPositiveTimestamp(
    player.lastPositionAt,
    deltaMs
  );
  player.lastTouchHitAt = shiftPositiveTimestamp(
    player.lastTouchHitAt,
    deltaMs
  );
  player.recoverUntil = shiftPositiveTimestamp(player.recoverUntil, deltaMs);
  player.reloadStartedAt = shiftPositiveTimestamp(
    player.reloadStartedAt,
    deltaMs
  );
  player.reloadUntil = shiftPositiveTimestamp(player.reloadUntil, deltaMs);

  timing.bossDeathStartedAt = shiftPositiveTimestamp(
    timing.bossDeathStartedAt,
    deltaMs
  );
  timing.bossIntroStartedAt = shiftPositiveTimestamp(
    timing.bossIntroStartedAt,
    deltaMs
  );
  timing.enemyWakeUntil = shiftPositiveTimestamp(
    timing.enemyWakeUntil,
    deltaMs
  );
  timing.floorIntroStartedAt = shiftPositiveTimestamp(
    timing.floorIntroStartedAt,
    deltaMs
  );
  timing.lastHazardAt = shiftPositiveTimestamp(timing.lastHazardAt, deltaMs);
  timing.pickedArtifactAt = shiftPositiveTimestamp(
    timing.pickedArtifactAt,
    deltaMs
  );
  timing.roomTransitionStartedAt = shiftPositiveTimestamp(
    timing.roomTransitionStartedAt,
    deltaMs
  );
};
