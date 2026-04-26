import type { MachineModuleId } from "$lib/config/machine-modules";
import {
  artifactPickupDurationMs,
  bossDeathDurationMs,
  bossIntroDurationMs,
  floorIntroDurationMs,
  playerDeathAnimationMs,
  playerDeathOverlayMs,
  roomTransitionDurationMs,
} from "$lib/game/scene-layout";

export class TimingStore {
  now = $state(0);
  bossIntroEnemyId = $state("");
  bossIntroStartedAt = $state(0);
  bossIntroTitle = $state("");
  bossDeathStartedAt = $state(0);
  floorIntroStartedAt = $state(0);
  enemyWakeUntil = $state(0);
  pickedArtifactAt = $state(0);
  pickedArtifactType = $state<MachineModuleId | null>(null);
  playerDeathStartedAt = $state(0);
  roomTransitionStartedAt = $state(0);
  lastHazardAt = 0;

  readonly bossIntroProgress = $derived(
    this.bossIntroStartedAt > 0
      ? Math.max(
          0,
          1 - (this.now - this.bossIntroStartedAt) / bossIntroDurationMs
        )
      : 0
  );

  readonly bossIntroActive = $derived(
    this.bossIntroStartedAt > 0 &&
      this.now < this.bossIntroStartedAt + bossIntroDurationMs
  );

  readonly bossDeathProgress = $derived(
    this.bossDeathStartedAt > 0
      ? Math.max(
          0,
          1 - (this.now - this.bossDeathStartedAt) / bossDeathDurationMs
        )
      : 0
  );

  readonly floorIntroProgress = $derived(
    this.floorIntroStartedAt > 0
      ? Math.max(
          0,
          1 - (this.now - this.floorIntroStartedAt) / floorIntroDurationMs
        )
      : 0
  );

  readonly artifactPickupProgress = $derived(
    this.pickedArtifactAt > 0
      ? Math.max(
          0,
          1 - (this.now - this.pickedArtifactAt) / artifactPickupDurationMs
        )
      : 0
  );

  readonly roomTransitionProgress = $derived(
    this.roomTransitionStartedAt > 0
      ? Math.max(
          0,
          1 -
            (this.now - this.roomTransitionStartedAt) / roomTransitionDurationMs
        )
      : 0
  );

  readonly playerDeathActive = $derived(this.playerDeathStartedAt > 0);

  readonly playerDeathAnimationProgress = $derived(
    this.playerDeathStartedAt > 0
      ? Math.max(
          0,
          Math.min(
            1,
            (this.now - this.playerDeathStartedAt) / playerDeathAnimationMs
          )
        )
      : 0
  );

  readonly playerDeathOverlayProgress = $derived(
    this.playerDeathStartedAt > 0
      ? Math.max(
          0,
          Math.min(
            1,
            (this.now - this.playerDeathStartedAt) / playerDeathOverlayMs
          )
        )
      : 0
  );

  readonly playerDeathModalReady = $derived(
    this.playerDeathStartedAt > 0 &&
      this.now - this.playerDeathStartedAt >= playerDeathAnimationMs
  );

  beginBossIntro(title: string, enemyId: string, at: number) {
    this.bossIntroEnemyId = enemyId;
    this.bossIntroStartedAt = at;
    this.bossIntroTitle = title;
  }

  beginBossDeath(at: number) {
    this.bossDeathStartedAt = at;
  }

  pickArtifact(type: MachineModuleId, at: number) {
    this.pickedArtifactAt = at;
    this.pickedArtifactType = type;
  }

  beginRoomTransition(at: number) {
    this.roomTransitionStartedAt = at;
  }

  beginPlayerDeath(at: number) {
    this.playerDeathStartedAt = at;
  }

  clearPlayerDeath() {
    this.playerDeathStartedAt = 0;
  }

  resetForFloor() {
    this.floorIntroStartedAt =
      typeof performance === "undefined" ? 0 : performance.now();
    this.enemyWakeUntil = 0;
    this.bossIntroEnemyId = "";
    this.bossIntroStartedAt = 0;
    this.bossIntroTitle = "";
    this.bossDeathStartedAt = 0;
    this.pickedArtifactAt = 0;
    this.pickedArtifactType = null;
    this.playerDeathStartedAt = 0;
    this.roomTransitionStartedAt = 0;
    this.lastHazardAt = 0;
  }
}
