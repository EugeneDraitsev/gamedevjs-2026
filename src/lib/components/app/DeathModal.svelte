<script lang="ts">
  import {
    createAudioDuckReason,
    setGameAudioDucked,
  } from "$lib/audio/ducking";

  interface Props {
    onContinue?: () => void;
    onRestart?: () => void;
  }

  let { onContinue, onRestart }: Props = $props();
  const audioDuckReason = createAudioDuckReason("death-modal");

  $effect(() => {
    setGameAudioDucked(audioDuckReason, true);

    return () => {
      setGameAudioDucked(audioDuckReason, false);
    };
  });
</script>

<dialog class="death-dialog" open>
  <div class="death-panel">
    <span class="death-eyebrow">You Died</span>
    <strong class="death-title">The chassis is offline</strong>
    <p class="death-body">
      Restart the run from scratch, or skip the death and resume right here at
      full health (demo cheat).
    </p>

    <div class="death-actions">
      <button type="button" class="ghost" onclick={onRestart}>
        Restart Run
      </button>
      <button type="button" class="primary" onclick={onContinue}>
        Continue Here
      </button>
    </div>
  </div>
</dialog>

<style>
  .death-dialog {
    position: fixed;
    inset: 0;
    z-index: 130;
    display: grid;
    place-items: center;
    inline-size: 100%;
    block-size: 100%;
    padding: 1.5rem;
    color: #f6fbff;
    background:
      radial-gradient(
        circle at 50% 28%,
        rgba(186, 28, 14, 0.28),
        transparent 38%
      ),
      rgba(2, 4, 8, 0.78);
    border: 0;
    backdrop-filter: blur(16px);
  }

  .death-panel {
    display: grid;
    gap: 1.05rem;
    inline-size: min(30rem, 100%);
    padding: 1.6rem 1.5rem 1.4rem;
    text-align: center;
    background:
      radial-gradient(circle at 50% 0, rgba(255, 96, 64, 0.16), transparent 28%),
      linear-gradient(180deg, rgba(22, 12, 14, 0.96), rgba(8, 5, 8, 0.99));
    border: 1px solid rgba(255, 132, 96, 0.28);
    border-radius: 1.15rem;
    box-shadow:
      inset 0 1px 0 rgba(255, 218, 196, 0.06),
      0 24px 60px rgba(0, 0, 0, 0.55);
  }

  .death-eyebrow {
    font-size: 0.75rem;
    font-weight: 800;
    color: rgba(255, 142, 110, 0.86);
    text-transform: uppercase;
    letter-spacing: 0.32em;
  }

  .death-title {
    font-size: 1.5rem;
    line-height: 1.2;
    color: #fff3ec;
  }

  .death-body {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.55;
    color: rgba(245, 222, 215, 0.78);
  }

  .death-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    justify-content: center;
    margin-top: 0.4rem;
  }

  .death-actions button {
    flex: 1 1 0;
    min-inline-size: 12rem;
    padding: 0.75rem 1rem;
    font: inherit;
    font-weight: 800;
    color: rgba(246, 251, 255, 0.9);
    cursor: pointer;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.6rem;
    transition: transform 0.12s ease;
  }

  .death-actions button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .death-actions button:active:not(:disabled) {
    transform: translateY(0);
  }

  .death-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .death-actions .primary {
    color: #1c0a06;
    background: linear-gradient(180deg, #ffce86, #ff8b4b);
    border-color: rgba(255, 184, 116, 0.85);
    box-shadow: 0 0 0 1px rgba(255, 132, 76, 0.3);
  }

  .death-actions .ghost {
    color: rgba(255, 224, 210, 0.92);
    background: rgba(184, 24, 12, 0.16);
    border-color: rgba(255, 132, 96, 0.42);
  }
</style>
