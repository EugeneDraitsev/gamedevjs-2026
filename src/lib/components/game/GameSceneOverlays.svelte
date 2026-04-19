<script lang="ts">
  import ArtifactPickupOverlay from "$lib/components/game/overlays/ArtifactPickupOverlay.svelte";
  import BossIntroOverlay from "$lib/components/game/overlays/BossIntroOverlay.svelte";
  import FloorIntroOverlay from "$lib/components/game/overlays/FloorIntroOverlay.svelte";
  import SceneCrosshair from "$lib/components/game/overlays/SceneCrosshair.svelte";
  import SceneDamagePopups from "$lib/components/game/overlays/SceneDamagePopups.svelte";
  import { getGameSceneContext } from "$lib/components/game/scene/context";

  const {
    animationNow,
    artifactPickupProgress,
    bossIntroProgress,
    bossIntroTitle,
    cameraMode,
    crosshairX,
    crosshairY,
    dungeonFloor,
    floorIntroProgress,
    pickedArtifactTemplate,
    playerHitFlash,
    projectedDamagePopups,
    sceneControlsLocked,
  } = getGameSceneContext();
</script>

<SceneCrosshair
  cameraMode={$cameraMode}
  controlsLocked={$sceneControlsLocked}
  crosshairX={$crosshairX}
  crosshairY={$crosshairY}
/>

<div class="damage-flash" style:opacity={$playerHitFlash * 0.66}></div>

<SceneDamagePopups
  animationNow={$animationNow}
  projectedDamagePopups={$projectedDamagePopups}
/>

<BossIntroOverlay
  bossIntroProgress={$bossIntroProgress}
  bossIntroTitle={$bossIntroTitle}
/>

<FloorIntroOverlay
  dungeonFloor={$dungeonFloor}
  floorIntroProgress={$floorIntroProgress}
/>

<ArtifactPickupOverlay
  artifactPickupProgress={$artifactPickupProgress}
  pickedArtifactTemplate={$pickedArtifactTemplate}
/>

<style>
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
