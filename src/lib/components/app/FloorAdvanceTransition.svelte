<script lang="ts">
  type FloorAdvancePhase = "covered" | "closing" | "idle" | "opening";

  let {
    nextFloor = 2,
    phase = "idle",
  }: {
    nextFloor?: number;
    phase?: FloorAdvancePhase;
  } = $props();

  const active = $derived(phase !== "idle");
  const nextFloorLabel = $derived(
    nextFloor === 0 ? "OUTSIDE" : `FLOOR ${nextFloor}`
  );
</script>

<div
  class="floor-advance"
  class:active
  class:closing={phase === "closing"}
  class:covered={phase === "covered"}
  class:opening={phase === "opening"}
  aria-hidden="true"
>
  <div class="panel panel-left"></div>
  <div class="panel panel-right"></div>
  <div class="panel panel-top"></div>
  <div class="panel panel-bottom"></div>
  <div class="aperture">
    <div class="aperture-ring"></div>
    <div class="aperture-core"></div>
  </div>
  <div class="readout">
    <span>ASCENT</span>
    <strong>{nextFloorLabel}</strong>
  </div>
  <div class="scan"></div>
</div>

<style>
  .floor-advance {
    position: fixed;
    inset: 0;
    z-index: 80;
    overflow: hidden;
    pointer-events: none;
    isolation: isolate;
    opacity: 0;
    transition: opacity 0.16s ease;
  }

  .floor-advance.active {
    pointer-events: auto;
    opacity: 1;
  }

  .panel,
  .scan,
  .aperture,
  .readout {
    position: absolute;
    pointer-events: none;
  }

  .panel {
    background:
      linear-gradient(
        135deg,
        rgba(255, 196, 113, 0.12),
        transparent 26%,
        rgba(65, 107, 127, 0.14) 72%,
        rgba(0, 0, 0, 0.12)
      ),
      repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.035) 0 1px,
        transparent 1px 42px
      ),
      linear-gradient(180deg, #14100d, #07090c 54%, #020305);
    box-shadow:
      inset 0 0 0 1px rgba(255, 198, 118, 0.1),
      inset 0 0 3rem rgba(0, 0, 0, 0.54),
      0 0 2.4rem rgba(0, 0, 0, 0.55);
    transition: transform 0.56s cubic-bezier(0.22, 0.8, 0.24, 1);
  }

  .panel-left,
  .panel-right {
    inset-block: 0;
    inline-size: 52vw;
  }

  .panel-left {
    inset-inline-start: 0;
    border-inline-end: 1px solid rgba(255, 188, 101, 0.22);
    transform: translateX(-104%);
  }

  .panel-right {
    inset-inline-end: 0;
    border-inline-start: 1px solid rgba(255, 188, 101, 0.22);
    transform: translateX(104%);
  }

  .panel-top,
  .panel-bottom {
    inset-inline: 0;
    block-size: 28vh;
  }

  .panel-top {
    inset-block-start: 0;
    border-block-end: 1px solid rgba(255, 188, 101, 0.18);
    transform: translateY(-104%);
  }

  .panel-bottom {
    inset-block-end: 0;
    border-block-start: 1px solid rgba(255, 188, 101, 0.18);
    transform: translateY(104%);
  }

  .floor-advance.closing .panel-left,
  .floor-advance.covered .panel-left {
    transform: translateX(0);
  }

  .floor-advance.closing .panel-right,
  .floor-advance.covered .panel-right {
    transform: translateX(0);
  }

  .floor-advance.closing .panel-top,
  .floor-advance.covered .panel-top {
    transform: translateY(0);
  }

  .floor-advance.closing .panel-bottom,
  .floor-advance.covered .panel-bottom {
    transform: translateY(0);
  }

  .floor-advance.opening .panel-left {
    transform: translateX(-104%);
  }

  .floor-advance.opening .panel-right {
    transform: translateX(104%);
  }

  .floor-advance.opening .panel-top {
    transform: translateY(-104%);
  }

  .floor-advance.opening .panel-bottom {
    transform: translateY(104%);
  }

  .aperture {
    inset-block-start: 50%;
    inset-inline-start: 50%;
    display: grid;
    place-items: center;
    inline-size: min(18rem, 44vw);
    block-size: min(18rem, 44vw);
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.72);
    transition:
      opacity 0.28s ease,
      transform 0.56s cubic-bezier(0.22, 0.8, 0.24, 1);
  }

  .floor-advance.closing .aperture,
  .floor-advance.covered .aperture {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }

  .floor-advance.opening .aperture {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.16);
  }

  .aperture-ring,
  .aperture-core {
    grid-area: 1 / 1;
    border-radius: 50%;
  }

  .aperture-ring {
    inline-size: 100%;
    block-size: 100%;
    background:
      radial-gradient(
        circle,
        transparent 48%,
        rgba(180, 226, 240, 0.72) 50% 54%,
        transparent 56%
      ),
      conic-gradient(
        from 0deg,
        rgba(255, 198, 91, 0.72),
        rgba(125, 211, 252, 0.5),
        rgba(255, 198, 91, 0.72)
      );
    box-shadow:
      0 0 2rem rgba(125, 211, 252, 0.16),
      inset 0 0 1.6rem rgba(0, 0, 0, 0.52);
    animation: aperture-spin 1.6s linear infinite;
  }

  .aperture-core {
    inline-size: 64%;
    block-size: 64%;
    background:
      radial-gradient(
        circle at 50% 36%,
        rgba(11, 32, 44, 0.92),
        rgba(1, 2, 4, 0.98) 68%
      ),
      #010204;
    border: 1px solid rgba(125, 211, 252, 0.22);
    box-shadow: inset 0 0 2rem rgba(0, 0, 0, 0.8);
  }

  .readout {
    inset-block-start: calc(50% + min(10.4rem, 25vw));
    inset-inline-start: 50%;
    display: grid;
    gap: 0.3rem;
    justify-items: center;
    color: #f6efe0;
    text-align: center;
    text-shadow: 0 0.25rem 1rem rgba(0, 0, 0, 0.8);
    opacity: 0;
    transform: translate(-50%, 0.6rem);
    transition:
      opacity 0.24s ease,
      transform 0.36s ease;
  }

  .floor-advance.closing .readout,
  .floor-advance.covered .readout {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  .readout span {
    font-size: 0.68rem;
    font-weight: 900;
    color: rgba(251, 191, 36, 0.78);
    text-transform: uppercase;
    letter-spacing: 0.26em;
  }

  .readout strong {
    font-size: clamp(1.5rem, 4vw, 2.9rem);
    font-weight: 900;
    letter-spacing: 0.06em;
  }

  .scan {
    inset: 0;
    z-index: 2;
    background:
      linear-gradient(
        180deg,
        transparent,
        rgba(125, 211, 252, 0.06),
        transparent
      ),
      repeating-linear-gradient(
        0deg,
        transparent 0 7px,
        rgba(255, 255, 255, 0.035) 7px 8px
      );
    mix-blend-mode: screen;
    opacity: 0;
    transition: opacity 0.24s ease;
  }

  .floor-advance.closing .scan,
  .floor-advance.covered .scan {
    opacity: 1;
  }

  @keyframes aperture-spin {
    to {
      transform: rotate(1turn);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .panel,
    .aperture,
    .readout,
    .scan,
    .floor-advance {
      transition-duration: 0.01ms;
    }

    .aperture-ring {
      animation: none;
    }
  }
</style>
