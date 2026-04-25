<script lang="ts">
  import type { SceneOverlayProps } from "$lib/types/game";

  let {
    playerDeathOverlayProgress,
  }: Pick<SceneOverlayProps, "playerDeathOverlayProgress"> = $props();

  const strength = $derived(
    Math.max(0, Math.min(1, playerDeathOverlayProgress))
  );
</script>

{#if strength > 0}
  <div class="player-death" style:opacity={Math.min(0.92, strength * 1.1)}>
    <div class="player-death-vignette"></div>
    <div
      class="player-death-pulse"
      style:transform={`scale(${0.92 + strength * 0.18})`}
    ></div>
  </div>
{/if}

<style>
  .player-death {
    position: fixed;
    inset: 0;
    z-index: 12;
    pointer-events: none;
  }

  .player-death-vignette {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        circle at 50% 52%,
        transparent 26%,
        rgba(124, 12, 6, 0.32) 58%,
        rgba(38, 2, 0, 0.78) 100%
      ),
      linear-gradient(180deg, rgba(120, 10, 4, 0.34), transparent 35%),
      linear-gradient(0deg, rgba(140, 12, 6, 0.42), transparent 38%);
    mix-blend-mode: multiply;
  }

  .player-death-pulse {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(255, 70, 50, 0.12),
      rgba(120, 8, 4, 0.06) 38%,
      transparent 64%
    );
    mix-blend-mode: screen;
  }
</style>
