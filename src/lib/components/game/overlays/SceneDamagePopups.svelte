<script lang="ts">
  import { damagePopupDurationMs } from "$lib/game/scene-layout";
  import type { SceneOverlayProps } from "$lib/types/game";

  let {
    animationNow,
    projectedDamagePopups,
  }: Pick<SceneOverlayProps, "animationNow" | "projectedDamagePopups"> =
    $props();
</script>

{#each projectedDamagePopups as popup (popup.id)}
  <div
    class="damage-popup-screen"
    style:left={`${popup.x}px`}
    style:top={`${popup.y}px`}
  >
    <div
      class="damage-popup"
      class:heal={popup.variant === "heal"}
      class:player={popup.variant === "player"}
      style:opacity={Math.max(0, 1 - Math.max(0, animationNow - popup.createdAt) / damagePopupDurationMs)}
      style:transform={`scale(${popup.variant === "player" ? 1.02 + Math.min(0.42, Math.max(0, animationNow - popup.createdAt) / 220) : 0.9 + Math.min(0.35, Math.max(0, animationNow - popup.createdAt) / 240)})`}
    >
      {#if popup.variant === "player"}
        -{popup.amount}
      {:else if popup.variant === "heal"}
        +{popup.amount}
      {:else}
        {popup.amount}
      {/if}
    </div>
  </div>
{/each}

<style>
  .damage-popup-screen {
    position: fixed;
    z-index: 9;
    pointer-events: none;
    transform: translate(-50%, -50%);
  }

  .damage-popup {
    padding: 0.26rem 0.48rem;
    font-weight: 800;
    color: #f6fbff;
    background: rgba(7, 15, 27, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.24);
  }

  .damage-popup.player {
    padding: 0.2rem 0.1rem;
    font-size: 1.15rem;
    color: #ff5c5c;
    text-shadow:
      0 0 0.55rem rgba(255, 64, 64, 0.34),
      0 0.18rem 0.7rem rgba(0, 0, 0, 0.42);
    background: transparent;
    border: 0;
    box-shadow: none;
  }

  .damage-popup.heal {
    padding: 0.2rem 0.1rem;
    font-size: 1.05rem;
    color: #7dffd7;
    text-shadow:
      0 0 0.55rem rgba(68, 255, 214, 0.42),
      0 0.18rem 0.7rem rgba(0, 0, 0, 0.42);
    background: transparent;
    border: 0;
    box-shadow: none;
  }
</style>
