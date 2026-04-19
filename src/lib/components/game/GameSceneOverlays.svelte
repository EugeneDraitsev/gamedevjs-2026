<script lang="ts">
  import { damagePopupDurationMs } from "$lib/game/scene-layout";
  import type { SceneOverlayProps } from "$lib/game/types";

  let {
    animationNow,
    artifactPickupProgress,
    bossIntroProgress,
    bossIntroTitle,
    cameraMode,
    controlsLocked,
    crosshairX,
    crosshairY,
    dungeonFloor,
    floorIntroProgress,
    pickedArtifactTemplate,
    playerHitFlash,
    projectedDamagePopups,
  }: SceneOverlayProps = $props();

  const bossIntroStrength = $derived(
    Math.sin((1 - bossIntroProgress) * Math.PI)
  );
  const floorIntroStrength = $derived(
    Math.sin((1 - floorIntroProgress) * Math.PI)
  );
  const artifactPickupStrength = $derived(
    Math.sin((1 - artifactPickupProgress) * Math.PI)
  );
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

<div class="damage-flash" style:opacity={playerHitFlash * 0.66}></div>

{#each projectedDamagePopups as popup (popup.id)}
  <div
    class="damage-popup-screen"
    style:left={`${popup.x}px`}
    style:top={`${popup.y}px`}
  >
    <div
      class="damage-popup"
      class:player={popup.variant === "player"}
      style:opacity={Math.max(0, 1 - (animationNow - popup.createdAt) / damagePopupDurationMs)}
      style:transform={`scale(${popup.variant === "player" ? 1.02 + Math.min(0.42, (animationNow - popup.createdAt) / 220) : 0.9 + Math.min(0.35, (animationNow - popup.createdAt) / 240)})`}
    >
      {#if popup.variant === "player"}
        -{popup.amount}
      {:else}
        {popup.amount}
      {/if}
    </div>
  </div>
{/each}

{#if bossIntroProgress > 0}
  <div class="boss-intro" style:opacity={bossIntroStrength}>
    <div
      class="boss-intro-card"
      style:transform={`translateY(${(1 - bossIntroStrength) * 22}px) scale(${0.96 + bossIntroStrength * 0.04})`}
    >
      <span class="boss-intro-caption">Boss Encounter</span>
      <div class="boss-intro-strip">
        <div class="boss-intro-panel boss-intro-panel-player">
          <div class="boss-intro-orb">
            <div class="boss-intro-orb-core"></div>
          </div>
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

{#if artifactPickupProgress > 0 && pickedArtifactTemplate}
  <div class="artifact-pickup" style:opacity={artifactPickupStrength}>
    <div
      class="artifact-pickup-card"
      style:--accent={pickedArtifactTemplate.accent}
      style:transform={`translateY(${(1 - artifactPickupStrength) * 18}px) scale(${0.97 + artifactPickupStrength * 0.03})`}
    >
      <span>Artifact Acquired</span>
      <strong>{pickedArtifactTemplate.label}</strong>
      <small>{pickedArtifactTemplate.rarity}</small>
    </div>
  </div>
{/if}

<style>
  .crosshair,
  .damage-popup-screen,
  .boss-intro,
  .floor-intro,
  .artifact-pickup {
    position: fixed;
    pointer-events: none;
  }

  .crosshair {
    z-index: 9;
    inline-size: 0;
    block-size: 0;
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

  .damage-flash {
    position: fixed;
    inset: 0;
    z-index: 7;
    pointer-events: none;
    background:
      radial-gradient(
        circle at center,
        transparent 46%,
        rgba(118, 0, 0, 0.18) 68%,
        rgba(132, 0, 0, 0.56) 100%
      ),
      linear-gradient(180deg, rgba(176, 0, 0, 0.34), transparent 24%),
      linear-gradient(0deg, rgba(176, 0, 0, 0.3), transparent 24%),
      linear-gradient(90deg, rgba(160, 0, 0, 0.28), transparent 20%),
      linear-gradient(270deg, rgba(160, 0, 0, 0.28), transparent 20%),
      radial-gradient(circle at top, rgba(255, 84, 84, 0.24), transparent 34%),
      radial-gradient(
        circle at bottom,
        rgba(255, 46, 46, 0.24),
        transparent 34%
      ),
      radial-gradient(circle at left, rgba(196, 0, 0, 0.16), transparent 26%),
      radial-gradient(circle at right, rgba(196, 0, 0, 0.16), transparent 26%);
  }

  .damage-popup-screen {
    z-index: 9;
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

  .floor-intro-card {
    display: grid;
    gap: 0.24rem;
    justify-items: center;
    padding: 0.35rem 1.6rem;
    margin-top: 6.6rem;
    color: #eff7ff;
  }

  .boss-intro,
  .artifact-pickup {
    inset: 0;
    z-index: 10;
    display: grid;
    justify-items: center;
  }

  .boss-intro {
    align-items: center;
    padding-inline: 1rem;
  }

  .floor-intro {
    inset: 0 auto auto 50%;
    z-index: 10;
    transform: translateX(-50%);
  }

  .boss-intro-caption,
  .floor-intro-card span,
  .artifact-pickup-card span,
  .artifact-pickup-card small {
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
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

  .boss-intro-caption {
    justify-self: center;
    padding-inline: 0.65rem;
    color: rgba(26, 18, 13, 0.66);
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
    inline-size: 5.3rem;
    block-size: 5.3rem;
    background: radial-gradient(
      circle at 35% 30%,
      #fce0a4 0,
      #d19a4e 42%,
      #5a3b1c 72%,
      #22140b 100%
    );
    border: 3px solid rgba(22, 15, 11, 0.98);
    border-radius: 999px;
    box-shadow:
      inset -0.55rem -0.75rem 1rem rgba(0, 0, 0, 0.26),
      0 0.55rem 1rem rgba(0, 0, 0, 0.18);
  }

  .boss-intro-orb::before {
    position: absolute;
    inset: 0.85rem 0.7rem;
    content: "";
    border: 1px solid rgba(22, 15, 11, 0.42);
    border-radius: 999px;
  }

  .boss-intro-orb-core {
    position: absolute;
    inset: 1.55rem;
    background: radial-gradient(circle, #fff4cb 0, #ffbe5f 58%, #7b3c17 100%);
    border-radius: 999px;
    box-shadow: 0 0 1rem rgba(255, 173, 84, 0.44);
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

  .floor-intro-card strong,
  .artifact-pickup-card strong {
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-shadow:
      0 0 2rem rgba(255, 255, 255, 0.12),
      0 0.35rem 1.2rem rgba(0, 0, 0, 0.44);
  }

  .floor-intro-card span {
    margin-top: 0.18rem;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 0.24em;
  }

  .floor-intro-card strong {
    font-size: clamp(2rem, 4.6vw, 3.6rem);
    color: rgba(255, 255, 255, 0.96);
    letter-spacing: 0.03em;
    text-shadow:
      0 0 0.4rem rgba(255, 255, 255, 0.06),
      0 0 1.8rem rgba(0, 0, 0, 0.38);
  }

  .artifact-pickup {
    align-items: end;
    padding: 0 1rem 4.5rem;
  }

  .artifact-pickup-card {
    position: relative;
    display: grid;
    gap: 0.18rem;
    justify-items: center;
    inline-size: min(20rem, calc(100vw - 2rem));
    padding: 0.85rem 1.8rem 0.95rem;
    overflow: hidden;
    color: #eff7ff;
    text-align: center;
    background:
      radial-gradient(
        circle at top,
        color-mix(in srgb, var(--accent) 22%, transparent),
        transparent 62%
      ),
      linear-gradient(180deg, rgba(8, 15, 26, 0.96), rgba(4, 10, 18, 0.94));
    border: 1px solid
      color-mix(in srgb, var(--accent) 36%, rgba(138, 198, 255, 0.2));
    border-radius: 1.1rem;
    box-shadow:
      0 1.15rem 2.8rem rgba(0, 0, 0, 0.34),
      0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  }

  .artifact-pickup-card::before,
  .artifact-pickup-card::after {
    position: absolute;
    left: 50%;
    inline-size: calc(100% - 2.4rem);
    block-size: 1px;
    content: "";
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, var(--accent) 72%, rgba(255, 255, 255, 0.74)),
      transparent
    );
    transform: translateX(-50%);
  }

  .artifact-pickup-card::before {
    top: 0.58rem;
  }

  .artifact-pickup-card::after {
    bottom: 0.58rem;
  }

  .artifact-pickup-card span {
    margin-top: 0.08rem;
    color: color-mix(in srgb, var(--accent) 54%, rgba(255, 255, 255, 0.82));
    letter-spacing: 0.18em;
  }

  .artifact-pickup-card strong {
    font-size: clamp(1.5rem, 4vw, 2.35rem);
    color: rgba(255, 255, 255, 0.98);
    letter-spacing: 0.04em;
  }

  .artifact-pickup-card small {
    margin-bottom: 0.08rem;
    color: rgba(198, 214, 232, 0.8);
    letter-spacing: 0.16em;
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
