<script lang="ts">
  import { mobileInput } from "$lib/stores/mobile-input.svelte";

  interface MobileControlsProps {
    visible: boolean;
  }

  let { visible }: MobileControlsProps = $props();

  const stickRadius = 56;
  const deadzone = 0.12;

  interface StickState {
    knobX: number;
    knobY: number;
    originX: number;
    originY: number;
    pointerId: number;
  }

  let moveStick = $state<StickState | null>(null);
  let aimStick = $state<StickState | null>(null);

  const normalize = (dx: number, dy: number) => {
    const len = Math.hypot(dx, dy);

    if (len < 1) {
      return { x: 0, y: 0, mag: 0 };
    }

    const clamped = Math.min(len, stickRadius);
    const nx = (dx / len) * (clamped / stickRadius);
    const ny = (dy / len) * (clamped / stickRadius);
    const mag = clamped / stickRadius;

    return { x: nx, y: ny, mag };
  };

  const handleMoveStart = (event: PointerEvent) => {
    if (moveStick) {
      return;
    }

    (event.target as Element).setPointerCapture(event.pointerId);
    moveStick = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      knobX: 0,
      knobY: 0,
    };
    mobileInput.setMove(0, 0);
    event.preventDefault();
  };

  const handleMoveMove = (event: PointerEvent) => {
    if (!moveStick || event.pointerId !== moveStick.pointerId) {
      return;
    }

    const dx = event.clientX - moveStick.originX;
    const dy = event.clientY - moveStick.originY;
    const { x, y, mag } = normalize(dx, dy);

    moveStick = {
      ...moveStick,
      knobX: x * stickRadius,
      knobY: y * stickRadius,
    };

    if (mag < deadzone) {
      mobileInput.setMove(0, 0);
    } else {
      mobileInput.setMove(x, y);
    }
  };

  const handleMoveEnd = (event: PointerEvent) => {
    if (!moveStick || event.pointerId !== moveStick.pointerId) {
      return;
    }

    moveStick = null;
    mobileInput.clearMove();
  };

  const handleAimStart = (event: PointerEvent) => {
    if (aimStick) {
      return;
    }

    (event.target as Element).setPointerCapture(event.pointerId);
    aimStick = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      knobX: 0,
      knobY: 0,
    };
    event.preventDefault();
  };

  const handleAimMove = (event: PointerEvent) => {
    if (!aimStick || event.pointerId !== aimStick.pointerId) {
      return;
    }

    const dx = event.clientX - aimStick.originX;
    const dy = event.clientY - aimStick.originY;
    const { x, y, mag } = normalize(dx, dy);

    aimStick = {
      ...aimStick,
      knobX: x * stickRadius,
      knobY: y * stickRadius,
    };

    if (mag < deadzone) {
      mobileInput.clearAim();
    } else {
      mobileInput.setAim(x, y);
    }
  };

  const handleAimEnd = (event: PointerEvent) => {
    if (!aimStick || event.pointerId !== aimStick.pointerId) {
      return;
    }

    aimStick = null;
    mobileInput.clearAim();
  };

  const handleJump = (event: PointerEvent) => {
    mobileInput.requestJump();
    event.preventDefault();
  };

  const handleMelee = (event: PointerEvent) => {
    mobileInput.requestMelee();
    event.preventDefault();
  };
</script>

{#if visible}
  <div class="mobile-controls">
    <div
      class="stick-zone left"
      role="presentation"
      onpointerdown={handleMoveStart}
      onpointermove={handleMoveMove}
      onpointerup={handleMoveEnd}
      onpointercancel={handleMoveEnd}
    >
      {#if moveStick}
        <div
          class="stick-base"
          style:left={`${moveStick.originX}px`}
          style:top={`${moveStick.originY}px`}
        >
          <div
            class="stick-knob"
            style:transform={`translate(calc(-50% + ${moveStick.knobX}px), calc(-50% + ${moveStick.knobY}px))`}
          ></div>
        </div>
      {:else}
        <div class="stick-hint">
          <div class="stick-hint-ring"></div>
          <span>MOVE</span>
        </div>
      {/if}
    </div>

    <div
      class="stick-zone right"
      role="presentation"
      onpointerdown={handleAimStart}
      onpointermove={handleAimMove}
      onpointerup={handleAimEnd}
      onpointercancel={handleAimEnd}
    >
      {#if aimStick}
        <div
          class="stick-base aim"
          style:left={`${aimStick.originX}px`}
          style:top={`${aimStick.originY}px`}
        >
          <div
            class="stick-knob aim"
            style:transform={`translate(calc(-50% + ${aimStick.knobX}px), calc(-50% + ${aimStick.knobY}px))`}
          ></div>
        </div>
      {:else}
        <div class="stick-hint right">
          <div class="stick-hint-ring aim"></div>
          <span>AIM &amp; FIRE</span>
        </div>
      {/if}
    </div>

    <button
      type="button"
      class="action-button melee"
      aria-label="Melee attack"
      onpointerdown={handleMelee}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 3v4l-11 11H6v-4z" />
        <path d="M6 18l-3 3" />
        <path d="M15 9l3 3" />
      </svg>
    </button>

    <button
      type="button"
      class="action-button jump"
      aria-label="Jump"
      onpointerdown={handleJump}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 5 11h4v8h6v-8h4z" fill="currentColor" />
      </svg>
    </button>
  </div>
{/if}

<style>
  .mobile-controls {
    position: fixed;
    inset: 0;
    z-index: 9;
    pointer-events: none;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
  }

  .stick-zone {
    position: absolute;
    inset-block-end: 0;
    inline-size: 48vw;
    block-size: 52vh;
    pointer-events: auto;
    touch-action: none;
  }

  .stick-zone.left {
    inset-inline-start: 0;
  }

  .stick-zone.right {
    inset-inline-end: 0;
  }

  .stick-hint {
    position: absolute;
    inset-block-end: 3rem;
    inset-inline-start: 3rem;
    display: grid;
    place-items: center;
    inline-size: 7rem;
    block-size: 7rem;
    font-size: 0.62rem;
    font-weight: 800;
    color: rgba(236, 224, 196, 0.42);
    text-transform: uppercase;
    letter-spacing: 0.24em;
    pointer-events: none;
  }

  .stick-hint.right {
    inset-inline-start: auto;
    inset-inline-end: 3rem;
  }

  .stick-hint-ring {
    position: absolute;
    inset: 0;
    border: 1.5px dashed rgba(236, 224, 196, 0.24);
    border-radius: 50%;
    box-shadow:
      inset 0 0 1.2rem rgba(3, 5, 8, 0.32),
      0 0 1.2rem rgba(3, 5, 8, 0.22);
  }

  .stick-hint-ring.aim {
    border-color: rgba(255, 180, 120, 0.28);
  }

  .stick-hint span {
    position: relative;
    z-index: 1;
  }

  .stick-base {
    position: fixed;
    inline-size: 7rem;
    block-size: 7rem;
    pointer-events: none;
    background: radial-gradient(
      circle,
      rgba(236, 224, 196, 0.08),
      rgba(3, 5, 8, 0.12) 70%
    );
    border: 1.5px solid rgba(236, 224, 196, 0.32);
    border-radius: 50%;
    box-shadow:
      inset 0 0 1.2rem rgba(3, 5, 8, 0.36),
      0 0.5rem 1.4rem rgba(0, 0, 0, 0.28);
    translate: -50% -50%;
  }

  .stick-base.aim {
    background: radial-gradient(
      circle,
      rgba(255, 180, 120, 0.1),
      rgba(3, 5, 8, 0.12) 70%
    );
    border-color: rgba(255, 180, 120, 0.44);
  }

  .stick-knob {
    position: absolute;
    top: 50%;
    left: 50%;
    inline-size: 3.2rem;
    block-size: 3.2rem;
    background: radial-gradient(
      circle at 40% 30%,
      rgba(236, 224, 196, 0.9),
      rgba(120, 100, 70, 0.72) 70%
    );
    border: 1px solid rgba(255, 245, 215, 0.52);
    border-radius: 50%;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.32),
      0 0.35rem 0.9rem rgba(0, 0, 0, 0.34);
  }

  .stick-knob.aim {
    background: radial-gradient(
      circle at 40% 30%,
      rgba(255, 208, 152, 0.96),
      rgba(172, 74, 40, 0.78) 70%
    );
    border-color: rgba(255, 224, 196, 0.6);
    box-shadow:
      inset 0 1px 0 rgba(255, 236, 208, 0.36),
      0 0.35rem 1.1rem rgba(172, 74, 40, 0.36);
  }

  .action-button {
    position: fixed;
    display: grid;
    place-items: center;
    inline-size: 3.6rem;
    block-size: 3.6rem;
    padding: 0;
    color: rgba(255, 245, 220, 0.9);
    pointer-events: auto;
    touch-action: none;
    cursor: pointer;
    background: radial-gradient(
      circle at 36% 30%,
      rgba(70, 42, 36, 0.86),
      rgba(18, 12, 16, 0.92)
    );
    border: 1.5px solid rgba(236, 224, 196, 0.36);
    border-radius: 50%;
    box-shadow:
      inset 0 1px 0 rgba(255, 244, 216, 0.12),
      0 0.4rem 1rem rgba(0, 0, 0, 0.36);
    transition:
      transform 0.08s ease-out,
      box-shadow 0.12s ease-out;
  }

  .action-button:active {
    box-shadow:
      inset 0 1px 0 rgba(255, 244, 216, 0.08),
      0 0.2rem 0.5rem rgba(0, 0, 0, 0.34);
    transform: scale(0.92);
  }

  .action-button svg {
    inline-size: 1.6rem;
    block-size: 1.6rem;
  }

  .action-button.melee {
    inset-block-end: 13rem;
    inset-inline-end: 1rem;
    color: rgba(255, 208, 156, 0.94);
    background: radial-gradient(
      circle at 36% 30%,
      rgba(96, 46, 32, 0.88),
      rgba(24, 14, 14, 0.94)
    );
    border-color: rgba(255, 180, 120, 0.48);
  }

  .action-button.jump {
    inset-block-end: 11rem;
    inset-inline-end: 5.4rem;
    color: rgba(200, 232, 255, 0.94);
    background: radial-gradient(
      circle at 36% 30%,
      rgba(38, 60, 84, 0.9),
      rgba(12, 18, 28, 0.94)
    );
    border-color: rgba(160, 210, 255, 0.4);
  }

  @media (max-width: 420px) {
    .stick-hint {
      inset-block-end: 2.2rem;
      inset-inline-start: 2rem;
      inline-size: 6rem;
      block-size: 6rem;
    }

    .stick-hint.right {
      inset-inline-end: 2rem;
    }

    .action-button.melee {
      inset-block-end: 10.5rem;
      inset-inline-end: 0.8rem;
    }

    .action-button.jump {
      inset-block-end: 8.6rem;
      inset-inline-end: 4.6rem;
    }
  }
</style>
