<script lang="ts">
  import {
    bossIntroPlaqueByEnemyId,
    fallbackBossIntroPlaqueUrl,
  } from "$lib/components/game/overlays/boss-intro-assets";
  import type { SceneOverlayProps } from "$lib/types/game";

  let {
    bossIntroEnemyId,
    bossIntroProgress,
    bossIntroTitle,
  }: Pick<
    SceneOverlayProps,
    "bossIntroEnemyId" | "bossIntroProgress" | "bossIntroTitle"
  > = $props();

  const bossIntroStrength = $derived(
    Math.sin((1 - bossIntroProgress) * Math.PI)
  );
  const bossIntroPlaqueUrl = $derived(
    bossIntroPlaqueByEnemyId[bossIntroEnemyId] ?? fallbackBossIntroPlaqueUrl
  );
</script>

{#if bossIntroProgress > 0}
  <div class="boss-intro" style:opacity={bossIntroStrength}>
    <div
      class="boss-intro-card"
      style:transform={`translateY(${(1 - bossIntroStrength) * 22}px) scale(${0.96 + bossIntroStrength * 0.04})`}
    >
      <img
        alt=""
        aria-hidden="true"
        class="boss-intro-art"
        draggable={false}
        src={bossIntroPlaqueUrl}
      >
      <span class="boss-intro-caption">Boss Encounter</span>
      <small class="boss-intro-player-name">Core Unit</small>
      <div class="boss-intro-versus">VS</div>
      <strong class="boss-intro-boss-name">{bossIntroTitle}</strong>
    </div>
  </div>
{/if}

<style>
  .boss-intro {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: grid;
    align-items: center;
    justify-items: center;
    padding-inline: 1rem;
    pointer-events: none;
  }

  .boss-intro-card {
    position: relative;
    inline-size: min(58rem, calc(100vw - 1.25rem));
    aspect-ratio: 16 / 9;
    overflow: hidden;
    color: #f4dfb7;
    background: #1b1009;
    border: 1px solid rgba(255, 219, 144, 0.4);
    border-radius: 0.85rem;
    box-shadow:
      0 1.4rem 4rem rgba(0, 0, 0, 0.54),
      0 0 0 1px rgba(17, 10, 5, 0.84) inset,
      0 0 2rem rgba(255, 114, 28, 0.18);
  }

  .boss-intro-card::after {
    position: absolute;
    inset: 0;
    pointer-events: none;
    content: "";
    background:
      linear-gradient(180deg, rgba(255, 232, 184, 0.1), transparent 28%),
      radial-gradient(
        circle at 50% 49%,
        rgba(255, 231, 178, 0.24),
        transparent 17%
      ),
      linear-gradient(
        90deg,
        rgba(0, 0, 0, 0.22),
        transparent 18% 82%,
        rgba(0, 0, 0, 0.24)
      );
    mix-blend-mode: soft-light;
  }

  .boss-intro-art {
    position: absolute;
    inset: 0;
    display: block;
    inline-size: 100%;
    block-size: 100%;
    user-select: none;
    object-fit: cover;
  }

  .boss-intro-caption {
    position: absolute;
    top: 17.8%;
    left: 50%;
    z-index: 1;
    font-size: 0.78rem;
    font-weight: 900;
    line-height: 1;
    color: rgba(42, 26, 13, 0.78);
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0;
    white-space: nowrap;
    text-shadow: 0 1px 0 rgba(255, 238, 199, 0.66);
    transform: translateX(-50%);
  }

  .boss-intro-player-name,
  .boss-intro-boss-name,
  .boss-intro-versus {
    position: absolute;
    z-index: 1;
    text-align: center;
    text-transform: uppercase;
  }

  .boss-intro-player-name {
    bottom: 18.4%;
    left: 25%;
    inline-size: 24%;
    font-size: 0.84rem;
    font-weight: 900;
    line-height: 1;
    color: #f8e2b8;
    letter-spacing: 0;
    text-shadow:
      0 0.12rem 0.18rem rgba(0, 0, 0, 0.84),
      0 0 0.6rem rgba(0, 0, 0, 0.72);
    transform: translateX(-50%);
  }

  .boss-intro-boss-name {
    right: 8%;
    bottom: 13.8%;
    inline-size: 34%;
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: 2.45rem;
    font-weight: 800;
    line-height: 0.9;
    color: #ffe5b6;
    text-transform: uppercase;
    letter-spacing: 0;
    overflow-wrap: break-word;
    text-shadow:
      0 0.16rem 0.16rem rgba(0, 0, 0, 0.9),
      0 0 0.9rem rgba(0, 0, 0, 0.72),
      0 0 1.1rem rgba(255, 106, 38, 0.28);
  }

  .boss-intro-versus {
    top: 50.8%;
    left: 50%;
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: 3.05rem;
    font-weight: 800;
    line-height: 1;
    color: rgba(45, 25, 11, 0.98);
    letter-spacing: 0;
    text-shadow:
      0 0.11rem 0 rgba(255, 238, 194, 0.52),
      0 0.25rem 0.65rem rgba(58, 31, 9, 0.34);
    transform: translate(-50%, -50%) rotate(-8deg);
  }

  @media (max-width: 640px) {
    .boss-intro {
      padding-inline: 0.4rem;
    }

    .boss-intro-card {
      inline-size: calc(100vw - 0.8rem);
      border-radius: 0.55rem;
    }

    .boss-intro-caption {
      top: 16.4%;
      font-size: 0.56rem;
    }

    .boss-intro-player-name {
      bottom: 16.2%;
      font-size: 0.56rem;
    }

    .boss-intro-boss-name {
      right: 7%;
      bottom: 12.6%;
      inline-size: 35%;
      font-size: 1.1rem;
    }

    .boss-intro-versus {
      font-size: 1.75rem;
    }
  }

  @media (max-width: 420px) {
    .boss-intro-caption {
      font-size: 0.5rem;
    }

    .boss-intro-player-name {
      bottom: 15.4%;
      font-size: 0.5rem;
    }

    .boss-intro-boss-name {
      bottom: 11.8%;
      font-size: 0.92rem;
    }

    .boss-intro-versus {
      font-size: 1.42rem;
    }
  }
</style>
