import type { WeaponNodeType } from "$lib/config/weapon-graph";
import {
  artifactPickupDurationMs,
  bossIntroDurationMs,
  floorIntroDurationMs,
} from "$lib/game/scene-layout";

export class TimingStore {
  now = $state(0);
  bossIntroStartedAt = $state(0);
  bossIntroTitle = $state("");
  floorIntroStartedAt = $state(0);
  enemyWakeUntil = $state(0);
  pickedArtifactAt = $state(0);
  pickedArtifactType = $state<WeaponNodeType | null>(null);
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

  beginBossIntro(title: string, at: number) {
    this.bossIntroStartedAt = at;
    this.bossIntroTitle = title;
  }

  pickArtifact(type: WeaponNodeType, at: number) {
    this.pickedArtifactAt = at;
    this.pickedArtifactType = type;
  }

  resetForFloor() {
    this.floorIntroStartedAt =
      typeof performance === "undefined" ? 0 : performance.now();
    this.enemyWakeUntil = 0;
    this.bossIntroStartedAt = 0;
    this.bossIntroTitle = "";
    this.pickedArtifactAt = 0;
    this.pickedArtifactType = null;
    this.lastHazardAt = 0;
  }
}
