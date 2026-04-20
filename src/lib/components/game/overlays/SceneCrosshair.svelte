<script lang="ts">
  import type { SceneOverlayProps } from "$lib/types/game";

  let {
    cameraMode,
    controlsLocked,
    crosshairX,
    crosshairY,
  }: Pick<
    SceneOverlayProps,
    "cameraMode" | "controlsLocked" | "crosshairX" | "crosshairY"
  > = $props();
</script>

{#if cameraMode === "follow" && !controlsLocked}
  <div
    class="crosshair"
    style:left={`${crosshairX}px`}
    style:top={`${crosshairY}px`}
  >
    <div class="crosshair-dot"></div>
    <div class="crosshair-ring"></div>
  </div>
{/if}

<style>
  .crosshair {
    position: fixed;
    z-index: 9;
    inline-size: 0;
    block-size: 0;
    pointer-events: none;
    transform: translate(-50%, -50%);
  }

  .crosshair-dot,
  .crosshair-ring {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    transform: translate(-50%, -50%);
  }

  .crosshair-dot {
    inline-size: 0.4rem;
    block-size: 0.4rem;
    background: #f5fbff;
    box-shadow: 0 0 0.85rem rgba(245, 251, 255, 0.8);
  }

  .crosshair-ring {
    inline-size: 1.5rem;
    block-size: 1.5rem;
    border: 1px solid rgba(138, 198, 255, 0.72);
  }

  @media (pointer: coarse) {
    .crosshair {
      display: none;
    }
  }
</style>
