<script lang="ts">
  import ArtifactPickupOverlay from "$lib/components/game/overlays/ArtifactPickupOverlay.svelte";
  import BossIntroOverlay from "$lib/components/game/overlays/BossIntroOverlay.svelte";
  import FloorIntroOverlay from "$lib/components/game/overlays/FloorIntroOverlay.svelte";
  import SceneCrosshair from "$lib/components/game/overlays/SceneCrosshair.svelte";
  import SceneDamagePopups from "$lib/components/game/overlays/SceneDamagePopups.svelte";
  import type { SceneOverlayProps } from "$lib/types/game";

  let { overlays }: { overlays: SceneOverlayProps } = $props();
</script>

<div class="scene-overlays">
  <SceneCrosshair
    cameraMode={overlays.cameraMode}
    controlsLocked={overlays.controlsLocked}
    crosshairX={overlays.crosshairX}
    crosshairY={overlays.crosshairY}
    playerReloadRatio={overlays.playerReloadRatio}
    playerReloading={overlays.playerReloading}
  />

  <div
    class="damage-flash"
    style:opacity={overlays.playerHitFlash * 0.66}
  ></div>

  <SceneDamagePopups
    animationNow={overlays.animationNow}
    projectedDamagePopups={overlays.projectedDamagePopups}
  />

  {#key `${overlays.bossIntroStartedAt ?? 0}:${overlays.bossIntroTitle}`}
    <BossIntroOverlay
      bossIntroProgress={overlays.bossIntroProgress}
      bossIntroTitle={overlays.bossIntroTitle}
    />
  {/key}

  {#key `${overlays.dungeonFloor}:${overlays.floorIntroStartedAt ?? 0}`}
    <FloorIntroOverlay
      dungeonFloor={overlays.dungeonFloor}
      floorIntroProgress={overlays.floorIntroProgress}
    />
  {/key}

  {#key `${overlays.artifactPickupAt ?? 0}:${overlays.pickedArtifactTemplate?.type ?? ""}`}
    <ArtifactPickupOverlay
      artifactPickupProgress={overlays.artifactPickupProgress}
      pickedArtifactTemplate={overlays.pickedArtifactTemplate}
    />
  {/key}
</div>

<style>
  .scene-overlays {
    position: fixed;
    inset: 0;
    z-index: 30;
    pointer-events: none;
    isolation: isolate;
  }

  .damage-flash {
    position: fixed;
    inset: 0;
    z-index: 7;
    pointer-events: none;
    background:
      radial-gradient(
        circle at center,
        transparent 46%,
        rgba(118, 0, 0, 0.18) 68%,
        rgba(132, 0, 0, 0.56) 100%
      ),
      linear-gradient(180deg, rgba(176, 0, 0, 0.34), transparent 24%),
      linear-gradient(0deg, rgba(176, 0, 0, 0.3), transparent 24%),
      linear-gradient(90deg, rgba(160, 0, 0, 0.28), transparent 20%),
      linear-gradient(270deg, rgba(160, 0, 0, 0.28), transparent 20%),
      radial-gradient(circle at top, rgba(255, 84, 84, 0.24), transparent 34%),
      radial-gradient(
        circle at bottom,
        rgba(255, 46, 46, 0.24),
        transparent 34%
      ),
      radial-gradient(circle at left, rgba(196, 0, 0, 0.16), transparent 26%),
      radial-gradient(circle at right, rgba(196, 0, 0, 0.16), transparent 26%);
  }
</style>
