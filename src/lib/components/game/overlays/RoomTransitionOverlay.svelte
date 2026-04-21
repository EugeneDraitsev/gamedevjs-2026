<script lang="ts">
  import type { SceneOverlayProps } from "$lib/types/game";

  let {
    roomTransitionProgress,
  }: Pick<SceneOverlayProps, "roomTransitionProgress"> = $props();

  const transitionStrength = $derived(
    Math.sin((1 - roomTransitionProgress) * Math.PI)
  );
</script>

{#if roomTransitionProgress > 0}
  <div class="room-transition" style:opacity={transitionStrength}>
    <div class="room-transition-band top"></div>
    <div class="room-transition-band bottom"></div>
  </div>
{/if}

<style>
  .room-transition {
    position: fixed;
    inset: 0;
    z-index: 8;
    pointer-events: none;
    background:
      radial-gradient(circle at center, transparent 42%, rgba(0, 0, 0, 0.5)),
      rgba(6, 4, 2, 0.24);
  }

  .room-transition-band {
    position: absolute;
    inset-inline: 0;
    block-size: 18vh;
    background: linear-gradient(180deg, rgba(3, 2, 1, 0.9), rgba(3, 2, 1, 0));
  }

  .room-transition-band.top {
    inset-block-start: 0;
  }

  .room-transition-band.bottom {
    inset-block-end: 0;
    transform: rotate(180deg);
  }

  @media (prefers-reduced-motion: reduce) {
    .room-transition-band {
      block-size: 12vh;
    }
  }
</style>
