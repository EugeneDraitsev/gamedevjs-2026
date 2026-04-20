<script lang="ts">
  import type { SceneOverlayProps } from "$lib/types/game";

  let {
    cameraMode,
    controlsLocked,
    crosshairX,
    crosshairY,
    playerReloadRatio,
    playerReloading,
  }: Pick<
    SceneOverlayProps,
    | "cameraMode"
    | "controlsLocked"
    | "crosshairX"
    | "crosshairY"
    | "playerReloadRatio"
    | "playerReloading"
  > = $props();
</script>

{#if cameraMode === "follow" && !controlsLocked}
  <div
    class="crosshair"
    style:left={`${crosshairX}px`}
    style:top={`${crosshairY}px`}
    class:reloading={playerReloading}
  >
    <div class="crosshair-dot"></div>
    <div class="crosshair-ring"></div>
    {#if playerReloading}
      <div
        class="crosshair-reload"
        style:--reload={`${playerReloadRatio}`}
      ></div>
    {/if}
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
  .crosshair-reload,
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
    transition:
      transform 0.16s ease,
      opacity 0.16s ease;
  }

  .crosshair-ring {
    inline-size: 1.5rem;
    block-size: 1.5rem;
    border: 1px solid rgba(138, 198, 255, 0.72);
    transition:
      transform 0.16s ease,
      opacity 0.16s ease,
      border-color 0.16s ease;
  }

  .crosshair.reloading .crosshair-dot {
    opacity: 0.42;
    transform: translate(-50%, -50%) scale(0.72);
  }

  .crosshair.reloading .crosshair-ring {
    border-color: rgba(255, 214, 145, 0.36);
    opacity: 0.3;
    transform: translate(-50%, -50%) scale(1.08);
  }

  .crosshair-reload {
    inline-size: 2.25rem;
    block-size: 2.25rem;
    background: conic-gradient(
      from -90deg,
      rgba(255, 228, 168, 0.98) calc(var(--reload) * 1turn),
      rgba(255, 228, 168, 0.08) 0
    );
    box-shadow:
      0 0 0.9rem rgba(255, 184, 107, 0.18),
      inset 0 0 0.45rem rgba(255, 236, 204, 0.16);
    mask: radial-gradient(
      farthest-side,
      transparent calc(100% - 0.16rem),
      #000 calc(100% - 0.14rem)
    );
    animation: crosshair-reload-spin 0.95s linear infinite;
  }

  @keyframes crosshair-reload-spin {
    from {
      transform: translate(-50%, -50%) rotate(0deg);
    }

    to {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }

  @media (pointer: coarse) {
    .crosshair {
      display: none;
    }
  }
</style>
