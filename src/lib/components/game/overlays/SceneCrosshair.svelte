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
    <div class="crosshair-bracket bracket-tl"></div>
    <div class="crosshair-bracket bracket-tr"></div>
    <div class="crosshair-bracket bracket-bl"></div>
    <div class="crosshair-bracket bracket-br"></div>
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
  .crosshair-reload {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    transform: translate(-50%, -50%);
  }

  .crosshair-dot {
    inline-size: 0.32rem;
    block-size: 0.32rem;
    background: #fff1cc;
    box-shadow:
      0 0 0.55rem rgba(255, 197, 120, 0.85),
      0 0 1.1rem rgba(255, 130, 60, 0.32);
    transition:
      transform 0.18s cubic-bezier(0.2, 1.5, 0.4, 1),
      opacity 0.18s ease;
  }

  .crosshair-bracket {
    position: absolute;
    inline-size: 0.5rem;
    block-size: 0.5rem;
    border-color: rgba(255, 220, 168, 0.9);
    border-style: solid;
    border-width: 0;
    transition:
      transform 0.22s cubic-bezier(0.2, 1.4, 0.4, 1),
      border-color 0.22s ease,
      opacity 0.22s ease;
  }

  .bracket-tl {
    top: -0.75rem;
    left: -0.75rem;
    border-top-width: 1.5px;
    border-left-width: 1.5px;
    border-top-left-radius: 0.16rem;
  }

  .bracket-tr {
    top: -0.75rem;
    right: -0.75rem;
    border-top-width: 1.5px;
    border-right-width: 1.5px;
    border-top-right-radius: 0.16rem;
  }

  .bracket-bl {
    bottom: -0.75rem;
    left: -0.75rem;
    border-bottom-width: 1.5px;
    border-left-width: 1.5px;
    border-bottom-left-radius: 0.16rem;
  }

  .bracket-br {
    right: -0.75rem;
    bottom: -0.75rem;
    border-right-width: 1.5px;
    border-bottom-width: 1.5px;
    border-bottom-right-radius: 0.16rem;
  }

  .crosshair.reloading .crosshair-dot {
    opacity: 0.4;
    transform: translate(-50%, -50%) scale(0.6);
  }

  .crosshair.reloading .crosshair-bracket {
    border-color: rgba(255, 214, 145, 0.32);
    opacity: 0.5;
  }

  .crosshair.reloading .bracket-tl {
    transform: translate(0.32rem, 0.32rem);
  }

  .crosshair.reloading .bracket-tr {
    transform: translate(-0.32rem, 0.32rem);
  }

  .crosshair.reloading .bracket-bl {
    transform: translate(0.32rem, -0.32rem);
  }

  .crosshair.reloading .bracket-br {
    transform: translate(-0.32rem, -0.32rem);
  }

  .crosshair-reload {
    inline-size: 3.1rem;
    block-size: 3.1rem;
    background: conic-gradient(
      from -90deg,
      #ffe8a6 0deg,
      #ffb56a calc(var(--reload) * 360deg),
      rgba(96, 38, 14, 0.55) calc(var(--reload) * 360deg)
    );
    box-shadow:
      0 0 1.1rem rgba(255, 184, 107, calc(0.45 + var(--reload) * 0.35)),
      0 0 2.2rem rgba(255, 130, 60, calc(0.16 + var(--reload) * 0.22)),
      inset 0 0 0.55rem rgba(255, 236, 204, calc(0.22 + var(--reload) * 0.22));
    mask: radial-gradient(
      farthest-side,
      transparent calc(100% - 0.4rem),
      #000 calc(100% - 0.36rem)
    );
    animation: crosshair-reload-pulse 1.1s ease-in-out infinite;
  }

  .crosshair-reload::before {
    position: absolute;
    inset: 0;
    pointer-events: none;
    content: "";
    background: repeating-conic-gradient(
      from -90deg,
      transparent 0deg 41deg,
      rgba(6, 3, 1, 0.7) 41deg 45deg
    );
    mask: radial-gradient(
      farthest-side,
      transparent calc(100% - 0.4rem),
      #000 calc(100% - 0.36rem)
    );
  }

  @keyframes crosshair-reload-pulse {
    0%,
    100% {
      filter: brightness(1);
    }

    50% {
      filter: brightness(1.18);
    }
  }

  @media (pointer: coarse) {
    .crosshair {
      display: none;
    }
  }
</style>
