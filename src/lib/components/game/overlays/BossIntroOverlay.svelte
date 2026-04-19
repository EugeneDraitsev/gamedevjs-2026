<script lang="ts">
  import orbKnightIconUrl from "$lib/assets/orb-knight-icon.svg";
  import type { SceneOverlayProps } from "$lib/types/game";

  let {
    bossIntroProgress,
    bossIntroTitle,
  }: Pick<SceneOverlayProps, "bossIntroProgress" | "bossIntroTitle"> = $props();

  const bossIntroStrength = $derived(
    Math.sin((1 - bossIntroProgress) * Math.PI)
  );
</script>

{#if bossIntroProgress > 0}
  <div class="boss-intro" style:opacity={bossIntroStrength}>
    <div
      class="boss-intro-card"
      style:transform={`translateY(${(1 - bossIntroStrength) * 22}px) scale(${0.96 + bossIntroStrength * 0.04})`}
    >
      <span class="boss-intro-caption">Boss Encounter</span>
      <div class="boss-intro-strip">
        <div class="boss-intro-panel boss-intro-panel-player">
          <img class="boss-intro-orb" src={orbKnightIconUrl} alt="">
          <div class="boss-intro-blade"></div>
          <small>Core Unit</small>
        </div>

        <div class="boss-intro-versus">VS</div>

        <div class="boss-intro-panel boss-intro-panel-boss">
          <div class="boss-intro-face">
            <div class="boss-intro-face-eye"></div>
          </div>
          <strong>{bossIntroTitle}</strong>
        </div>
      </div>
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
    display: grid;
    gap: 0.7rem;
    inline-size: min(40rem, calc(100vw - 2rem));
    padding: 1.15rem;
    color: #1a120d;
    background:
      radial-gradient(circle at top, rgba(255, 255, 255, 0.62), transparent 60%),
      linear-gradient(
        180deg,
        rgba(230, 216, 188, 0.98),
        rgba(204, 187, 157, 0.96)
      );
    border: 3px solid rgba(22, 15, 11, 0.96);
    border-radius: 1.25rem;
    box-shadow:
      0 1.2rem 3rem rgba(0, 0, 0, 0.38),
      0 0 0 1px rgba(255, 255, 255, 0.12) inset;
  }

  .boss-intro-caption {
    justify-self: center;
    padding-inline: 0.65rem;
    font-size: 0.72rem;
    font-weight: 800;
    color: rgba(26, 18, 13, 0.66);
    text-transform: uppercase;
    letter-spacing: 0.16em;
  }

  .boss-intro-strip {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 0.8rem;
    align-items: center;
  }

  .boss-intro-panel {
    position: relative;
    display: grid;
    gap: 0.7rem;
    justify-items: center;
    min-block-size: 11rem;
    padding: 1.1rem 1rem;
    overflow: hidden;
    background:
      linear-gradient(
        180deg,
        rgba(251, 246, 233, 0.96),
        rgba(215, 199, 170, 0.95)
      ),
      repeating-linear-gradient(
        90deg,
        transparent 0 8px,
        rgba(0, 0, 0, 0.025) 8px 9px
      );
    border: 2px solid rgba(22, 15, 11, 0.96);
    border-radius: 1rem;
    box-shadow: 0 0.5rem 1.3rem rgba(0, 0, 0, 0.12) inset;
  }

  .boss-intro-panel::after {
    position: absolute;
    inset: auto -18% -14% -18%;
    block-size: 44%;
    content: "";
    background: rgba(0, 0, 0, 0.06);
    transform: rotate(-7deg);
  }

  .boss-intro-panel-player {
    padding-right: 2.8rem;
  }

  .boss-intro-panel small,
  .boss-intro-panel strong {
    position: relative;
    z-index: 1;
  }

  .boss-intro-panel small {
    font-size: 0.72rem;
    font-weight: 800;
    color: rgba(26, 18, 13, 0.66);
    text-transform: uppercase;
    letter-spacing: 0.16em;
  }

  .boss-intro-panel strong {
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: clamp(1.8rem, 4vw, 2.9rem);
    font-weight: 700;
    line-height: 0.94;
    color: rgba(22, 15, 11, 0.98);
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .boss-intro-versus {
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: clamp(2.2rem, 4.3vw, 3.3rem);
    font-weight: 700;
    color: rgba(22, 15, 11, 0.98);
    text-shadow: 0 0.15rem 0 rgba(255, 255, 255, 0.5);
    transform: rotate(-10deg);
  }

  .boss-intro-orb,
  .boss-intro-face {
    position: relative;
    z-index: 1;
  }

  .boss-intro-orb {
    display: block;
    inline-size: 5.3rem;
    block-size: 5.3rem;
    filter: drop-shadow(0 0.55rem 1rem rgba(0, 0, 0, 0.18));
  }

  .boss-intro-blade {
    position: absolute;
    right: 1.05rem;
    bottom: 1rem;
    z-index: 1;
    inline-size: 0.84rem;
    block-size: 5.2rem;
    background: linear-gradient(180deg, #ffffff, #a9d6ff 45%, #31536b 100%);
    border: 2px solid rgba(22, 15, 11, 0.98);
    border-radius: 0.45rem;
    box-shadow: 0 0 1rem rgba(169, 214, 255, 0.36);
    transform: rotate(28deg);
  }

  .boss-intro-blade::after {
    position: absolute;
    inset: auto -0.35rem -0.5rem;
    block-size: 0.58rem;
    content: "";
    background: #2f2318;
    border: 2px solid rgba(22, 15, 11, 0.98);
    border-radius: 999px;
  }

  .boss-intro-face {
    inline-size: 5.8rem;
    block-size: 5.8rem;
    background: radial-gradient(
      circle at 50% 48%,
      #8a271d 0 14%,
      #1a110d 15% 40%,
      #7f5b3a 41% 58%,
      #21150d 59% 100%
    );
    border: 3px solid rgba(22, 15, 11, 0.98);
    border-radius: 1.2rem;
    box-shadow:
      inset -0.8rem -0.85rem 1rem rgba(0, 0, 0, 0.24),
      0 0.6rem 1rem rgba(0, 0, 0, 0.18);
    transform: rotate(11deg);
  }

  .boss-intro-face::before {
    position: absolute;
    inset: -0.6rem;
    content: "";
    border: 0.55rem dashed rgba(33, 21, 13, 0.92);
    border-radius: 1.5rem;
  }

  .boss-intro-face-eye {
    position: absolute;
    inset: 2.1rem 1rem auto;
    block-size: 0.7rem;
    background: linear-gradient(90deg, #ff856b, #ffe0a0, #ff856b);
    border-radius: 999px;
    box-shadow: 0 0 1rem rgba(255, 133, 107, 0.5);
  }

  @media (max-width: 700px) {
    .boss-intro-strip {
      grid-template-columns: 1fr;
    }

    .boss-intro-panel-player {
      padding-right: 0.9rem;
    }

    .boss-intro-versus {
      justify-self: center;
    }
  }
</style>
