<script lang="ts">
  import orbKnightIconUrl from "$lib/assets/orb-knight-icon.svg";
  import { playerMaxHealth } from "$lib/game/scene-layout";

  interface GameHudProps {
    playerHealth: number;
    playerHealthRatio: number;
    playerRecoverRatio: number;
  }

  let { playerHealth, playerHealthRatio, playerRecoverRatio }: GameHudProps =
    $props();
</script>

<div class="hud">
  <div class="hud-shell">
    <img class="hud-icon" src={orbKnightIconUrl} alt="" aria-hidden="true">
    <div
      class="hud-bar"
      aria-label={`Health ${playerHealth}/${playerMaxHealth}`}
    >
      <div
        class="hud-recover"
        style:width={`${playerRecoverRatio * 100}%`}
      ></div>
      <div class="hud-fill" style:width={`${playerHealthRatio * 100}%`}></div>
    </div>
  </div>
</div>

<style>
  .hud {
    position: fixed;
    top: 1.75rem;
    left: 1.1rem;
    z-index: 8;
    inline-size: clamp(16rem, 16vw, 13rem);
  }

  .hud-shell {
    display: flex;
    gap: 0.55rem;
    align-items: center;
  }

  .hud-icon {
    flex: 0 0 auto;
    inline-size: 2.1rem;
    block-size: 2.1rem;
    filter: drop-shadow(0 0.2rem 0.45rem rgba(0, 0, 0, 0.3));
  }

  .hud-bar {
    position: relative;
    flex: 1 1 auto;
    block-size: 0.5rem;
    overflow: hidden;
    background: rgba(18, 5, 4, 0.28);
    border-radius: 999px;
    box-shadow:
      inset 0 0 0 1px rgba(255, 218, 218, 0.08),
      0 0 1rem rgba(0, 0, 0, 0.16);
  }

  .hud-recover,
  .hud-fill {
    position: absolute;
    inset: 0;
    border-radius: inherit;
  }

  .hud-recover {
    background: linear-gradient(
      90deg,
      rgba(124, 15, 10, 0.16),
      rgba(124, 15, 10, 0.4)
    );
    opacity: 0.66;
  }

  .hud-fill {
    background:
      linear-gradient(
        90deg,
        #b3211dff 0%,
        #b3211dff 38%,
        #b3211dff 72%,
        #b3211dff 100%
      ),
      linear-gradient(180deg, rgba(255, 214, 214, 0.14), transparent);
    box-shadow:
      0 0 0.7rem rgba(179, 33, 29, 0.2),
      inset 0 1px 0 rgba(255, 214, 214, 0.16);
  }

  @media (max-width: 700px) {
    .hud {
      top: 0.9rem;
      left: 0.9rem;
      inline-size: min(11rem, calc(100vw - 8rem));
    }

    .hud-icon {
      inline-size: 1.8rem;
      block-size: 1.8rem;
    }
  }
</style>
