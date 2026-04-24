<script lang="ts">
  import type { SceneOverlayProps } from "$lib/types/game";

  let { bossDeathProgress }: Pick<SceneOverlayProps, "bossDeathProgress"> =
    $props();

  const bossDeathAge = $derived(1 - bossDeathProgress);
  const bossDeathStrength = $derived(
    Math.max(0, Math.min(1, bossDeathAge / 0.16, bossDeathProgress / 0.34))
  );
</script>

{#if bossDeathProgress > 0}
  <div class="boss-death" style:opacity={bossDeathStrength}>
    <div
      class="boss-death-ring"
      style:transform={`scale(${0.44 + bossDeathAge * 1.24})`}
    ></div>
    <div
      class="boss-death-core"
      style:transform={`scale(${0.82 + bossDeathStrength * 0.2})`}
    ></div>
  </div>
{/if}

<style>
  .boss-death {
    position: fixed;
    inset: 0;
    z-index: 11;
    display: grid;
    place-items: center;
    pointer-events: none;
    background: radial-gradient(
      circle at 50% 48%,
      rgba(255, 198, 112, 0.18),
      transparent 38%
    );
    mix-blend-mode: screen;
  }

  .boss-death-ring,
  .boss-death-core {
    position: absolute;
    inline-size: min(42vw, 22rem);
    aspect-ratio: 1;
    border-radius: 50%;
  }

  .boss-death-ring {
    border: 2px solid rgba(255, 191, 96, 0.74);
    box-shadow:
      0 0 2.4rem rgba(255, 122, 62, 0.36),
      inset 0 0 2.2rem rgba(255, 222, 148, 0.18);
  }

  .boss-death-core {
    background: radial-gradient(
      circle,
      rgba(255, 239, 184, 0.22),
      rgba(255, 132, 62, 0.08) 34%,
      transparent 66%
    );
  }
</style>
