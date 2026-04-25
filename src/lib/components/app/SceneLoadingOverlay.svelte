<script lang="ts">
  import gearCurrencyUrl from "$lib/assets/gear-currency.svg";

  let {
    active = true,
    label = "Loading",
    detail = "",
    progress = null,
  }: {
    active?: boolean;
    detail?: string;
    label?: string;
    progress?: number | null;
  } = $props();

  const normalizedProgress = $derived(
    progress === null ? null : Math.max(0, Math.min(1, progress))
  );
  const progressPercent = $derived(
    normalizedProgress === null ? 0 : Math.round(normalizedProgress * 100)
  );
</script>

{#if active}
  <div
    class="scene-loading-overlay"
    aria-busy="true"
    aria-live="polite"
    role="status"
  >
    <div class="gear-train" aria-hidden="true">
      <img class="gear gear-large" src={gearCurrencyUrl} alt="">
    </div>

    <span class="loading-label">{label}</span>
    {#if normalizedProgress !== null}
      <div
        class="loading-progress"
        aria-label="Loading progress"
        aria-valuemax="100"
        aria-valuemin="0"
        aria-valuenow={progressPercent}
        role="progressbar"
      >
        <span style:transform={`scaleX(${normalizedProgress})`}></span>
      </div>
      <span class="loading-detail"> {detail || `${progressPercent}%`} </span>
    {/if}
  </div>
{/if}

<style>
  .scene-loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    display: grid;
    gap: 1rem;
    place-content: center;
    justify-items: center;
    contain: strict;
    overflow: hidden;
    color: #f8e8bd;
    pointer-events: auto;
    background:
      radial-gradient(
        circle at 50% 44%,
        rgba(214, 169, 87, 0.12),
        transparent 20rem
      ),
      radial-gradient(
        circle at 50% 72%,
        rgba(98, 147, 158, 0.09),
        transparent 18rem
      ),
      linear-gradient(180deg, #100b08 0%, #050403 48%, #020202 100%);
  }

  .scene-loading-overlay::before {
    position: absolute;
    inset: 0;
    pointer-events: none;
    content: "";
    background:
      radial-gradient(
        circle at 50% 40%,
        transparent 0 18rem,
        rgba(0, 0, 0, 0.42) 32rem,
        rgba(0, 0, 0, 0.82) 100%
      ),
      repeating-linear-gradient(
        90deg,
        rgba(255, 236, 183, 0.026) 0 1px,
        transparent 1px 4.25rem
      );
  }

  .gear-train {
    position: relative;
    display: grid;
    place-items: center;
    inline-size: 5.35rem;
    block-size: 5.35rem;
    isolation: isolate;
  }

  .gear {
    display: block;
    filter: drop-shadow(0 0 0.65rem rgba(255, 192, 89, 0.32))
      drop-shadow(0 0.6rem 0.9rem rgba(0, 0, 0, 0.58));
    transform-origin: 50% 50%;
    animation: loading-gear-spin 4.6s linear infinite;
    will-change: transform;
  }

  .gear-large {
    inline-size: 5.15rem;
    block-size: 5.15rem;
  }

  .loading-label {
    position: relative;
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: clamp(2rem, 5vw, 3.35rem);
    font-weight: 400;
    line-height: 0.9;
    color: transparent;
    letter-spacing: 0.08em;
    background: linear-gradient(
      180deg,
      #fcf0c8 0%,
      #ddb36a 38%,
      #f8e5b1 64%,
      #8d612e 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    filter: drop-shadow(0 0 18px rgba(230, 188, 104, 0.13))
      drop-shadow(0 10px 20px rgba(0, 0, 0, 0.42));
  }

  .loading-progress {
    position: relative;
    inline-size: min(20rem, calc(100vw - 3rem));
    block-size: 0.5rem;
    overflow: hidden;
    background: rgba(255, 229, 166, 0.12);
    border: 1px solid rgba(255, 214, 128, 0.22);
    border-radius: 999px;
    box-shadow: inset 0 0.08rem 0.3rem rgba(0, 0, 0, 0.45);
  }

  .loading-progress span {
    position: absolute;
    inset: 0;
    display: block;
    background: linear-gradient(90deg, #b77835, #f4ce7a, #7bd0c2);
    border-radius: inherit;
    transform-origin: left center;
    transition: transform 160ms ease;
  }

  .loading-detail {
    position: relative;
    max-inline-size: min(28rem, calc(100vw - 3rem));
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1.25;
    color: rgba(248, 232, 189, 0.76);
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  @keyframes loading-gear-spin {
    to {
      transform: rotate(1turn);
    }
  }

  @media (max-width: 700px) {
    .gear-train {
      inline-size: 4.85rem;
      block-size: 4.85rem;
    }

    .gear-large {
      inline-size: 4.65rem;
      block-size: 4.65rem;
    }

    .loading-label {
      font-size: clamp(1.75rem, 10vw, 2.7rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .gear {
      animation-duration: 24s;
    }
  }
</style>
