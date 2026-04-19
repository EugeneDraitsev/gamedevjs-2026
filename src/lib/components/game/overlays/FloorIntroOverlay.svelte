<script lang="ts">
  import type { SceneOverlayProps } from "$lib/types/game";

  let {
    dungeonFloor,
    floorIntroProgress,
  }: Pick<SceneOverlayProps, "dungeonFloor" | "floorIntroProgress"> = $props();

  const floorIntroStrength = $derived(
    Math.sin((1 - floorIntroProgress) * Math.PI)
  );
</script>

{#if floorIntroProgress > 0}
  <div class="floor-intro" style:opacity={floorIntroStrength}>
    <div
      class="floor-intro-card"
      style:transform={`translateY(${(1 - floorIntroStrength) * 18}px) scale(${0.985 + floorIntroStrength * 0.015})`}
    >
      <strong>Polygon Foundry</strong>
      <span>Floor {dungeonFloor}</span>
    </div>
  </div>
{/if}

<style>
  .floor-intro {
    position: fixed;
    inset: 0 auto auto 50%;
    z-index: 10;
    pointer-events: none;
    transform: translateX(-50%);
  }

  .floor-intro-card {
    display: grid;
    gap: 0.24rem;
    justify-items: center;
    padding: 0.35rem 1.6rem;
    margin-top: 6.6rem;
    color: #eff7ff;
  }

  .floor-intro-card::after {
    inline-size: min(26rem, 72vw);
    block-size: 1px;
    content: "";
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.52) 18%,
      rgba(255, 255, 255, 0.96) 50%,
      rgba(255, 255, 255, 0.52) 82%,
      transparent
    );
    box-shadow: 0 0 14px rgba(255, 255, 255, 0.12);
  }

  .floor-intro-card span {
    margin-top: 0.18rem;
    font-size: 0.72rem;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.24em;
  }

  .floor-intro-card strong {
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: clamp(2rem, 4.6vw, 3.6rem);
    font-weight: 500;
    color: rgba(255, 255, 255, 0.96);
    letter-spacing: 0.03em;
    text-shadow:
      0 0 0.4rem rgba(255, 255, 255, 0.06),
      0 0 1.8rem rgba(0, 0, 0, 0.38);
  }
</style>
