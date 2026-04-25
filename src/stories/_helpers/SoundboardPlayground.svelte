<script lang="ts">
  import { onMount } from "svelte";
  import { gameSfx } from "$lib/audio/sfx";

  type VisualKind =
    | "artifact"
    | "break"
    | "crack"
    | "damage"
    | "death"
    | "door"
    | "gear"
    | "hit"
    | "laser"
    | "loot"
    | "reload"
    | "repair"
    | "sword";

  interface SoundEntry {
    description: string;
    durationMs: number;
    id: string;
    name: string;
    play: () => void;
    visual: VisualKind;
  }

  const sliderUnit = 50;
  const sliderMax = 200;

  const levelToSlider = (level: number) =>
    Math.round(Math.min(sliderMax, level * sliderUnit));
  const sliderToLevel = (slider: number) => slider / sliderUnit;

  let masterVolume = $state(1);
  let sfxVolume = $state(1);
  let muted = $state(false);
  let swordVariant = $state(0);
  let laserIntensity = $state(0.5);
  let deathIntensity = $state(0.5);
  let crackHitIndex = $state(0);
  let playKeys = $state<Record<string, number>>({});
  let sequenceRunning = $state(false);
  let cardVolumes = $state<Record<string, number>>({});
  let copyHint = $state("Copy");

  const baseMix = () => ({
    masterSoundEnabled: !muted,
    masterVolume,
    sfxSoundEnabled: true,
    sfxVolume,
  });

  const syncFromGameSfx = () => {
    const levels = gameSfx.getPerSoundLevels();
    const next: Record<string, number> = {};
    for (const [id, level] of Object.entries(levels)) {
      next[id] = levelToSlider(level);
    }
    cardVolumes = next;
  };

  $effect(() => {
    gameSfx.syncMix(baseMix());
  });

  onMount(() => {
    gameSfx.syncMix(baseMix());
    syncFromGameSfx();
  });

  const sounds = $derived<SoundEntry[]>([
    {
      description: "3 procedural variants — pick with the slider",
      durationMs: 520,
      id: "sword",
      name: "Sword Swing",
      play: () => gameSfx.playSwordSwing(swordVariant),
      visual: "sword",
    },
    {
      description: `Lightning arc laser with crackle branches (intensity ${laserIntensity.toFixed(2)})`,
      durationMs: 840,
      id: "laser",
      name: "Laser Shot",
      play: () => gameSfx.playLaserShot(laserIntensity),
      visual: "laser",
    },
    {
      description: "Crisp ping when projectile lands on enemy",
      durationMs: 180,
      id: "hit",
      name: "Enemy Hit",
      play: () => gameSfx.playEnemyHit(),
      visual: "hit",
    },
    {
      description: `Gearbox bursts apart, gears scatter (${deathIntensity.toFixed(2)})`,
      durationMs: 780,
      id: "death",
      name: "Enemy Death",
      play: () => gameSfx.playEnemyDeath(deathIntensity),
      visual: "death",
    },
    {
      description: "Mechanical clink + ratchet ticks",
      durationMs: 620,
      id: "gear",
      name: "Gear Pickup",
      play: () => gameSfx.playGearPickup(),
      visual: "gear",
    },
    {
      description: "Materialize chimes + sparkle spray",
      durationMs: 760,
      id: "loot",
      name: "Loot Spawn",
      play: () => gameSfx.playLootSpawn(),
      visual: "loot",
    },
    {
      description: "Magazine release, metal slide, insert slap, bolt lock",
      durationMs: 1200,
      id: "reload",
      name: "Reload",
      play: () => gameSfx.playReload(),
      visual: "reload",
    },
    {
      description: "Servo whir + bandpass sweep + chimes",
      durationMs: 1040,
      id: "repair",
      name: "Repair Pickup",
      play: () => gameSfx.playRepairPickup(),
      visual: "repair",
    },
    {
      description: "Major arpeggio + airy shimmer + bell tail",
      durationMs: 920,
      id: "artifact",
      name: "Artifact Pickup",
      play: () => gameSfx.playArtifactPickup(),
      visual: "artifact",
    },
    {
      description: "Dull impact + static + sawtooth ow",
      durationMs: 720,
      id: "damage",
      name: "Player Damage",
      play: () => gameSfx.playPlayerDamage(),
      visual: "damage",
    },
    {
      description: "Stone slab grinding + heavy gear teeth + settle thud",
      durationMs: 1850,
      id: "door",
      name: "Door Open",
      play: () => gameSfx.playDoorOpen(),
      visual: "door",
    },
    {
      description: `Glass cracking, escalates with hit ${crackHitIndex}`,
      durationMs: 760,
      id: "crack",
      name: "Dome Crack",
      play: () => gameSfx.playCorePrisonDomeCrack(crackHitIndex),
      visual: "crack",
    },
    {
      description: "Full shatter — burst, shards, resonant rings",
      durationMs: 1650,
      id: "break",
      name: "Dome Break",
      play: () => gameSfx.playCorePrisonDomeBreak(),
      visual: "break",
    },
  ]);

  const updateLevel = (id: string, sliderValue: number) => {
    cardVolumes = { ...cardVolumes, [id]: sliderValue };
    gameSfx.setPerSoundLevel(id, sliderToLevel(sliderValue));
  };

  const triggerPlay = (entry: SoundEntry) => {
    playKeys = { ...playKeys, [entry.id]: (playKeys[entry.id] ?? 0) + 1 };
    entry.play();
  };

  const playAllSequence = async () => {
    if (sequenceRunning) {
      return;
    }

    sequenceRunning = true;

    for (const sound of sounds) {
      triggerPlay(sound);
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(sound.durationMs + 200, 700))
      );
    }

    sequenceRunning = false;
  };

  const resetVolumes = () => {
    gameSfx.resetPerSoundLevels();
    syncFromGameSfx();
  };

  const levelsText = $derived(
    sounds
      .map((entry) => `${entry.id}: ${cardVolumes[entry.id] ?? sliderUnit}`)
      .join("\n")
  );

  const copyLevels = async () => {
    try {
      await navigator.clipboard.writeText(levelsText);
      copyHint = "Copied!";
      window.setTimeout(() => (copyHint = "Copy"), 1400);
    } catch {
      copyHint = "Press Ctrl+C";
      window.setTimeout(() => (copyHint = "Copy"), 1400);
    }
  };
</script>

<div class="board">
  <header>
    <div class="header-left">
      <h2>Procedural Soundboard</h2>
      <p>Click a card to play and watch its visualization.</p>
    </div>
    <div class="mix">
      <label>
        <span>Master</span>
        <input
          bind:value={masterVolume}
          max="1"
          min="0"
          step="0.01"
          type="range"
        >
        <span class="mix-value">{masterVolume.toFixed(2)}</span>
      </label>
      <label>
        <span>SFX</span>
        <input bind:value={sfxVolume} max="1" min="0" step="0.01" type="range">
        <span class="mix-value">{sfxVolume.toFixed(2)}</span>
      </label>
      <label class="mute">
        <input bind:checked={muted} type="checkbox">
        <span>Mute</span>
      </label>
      <button
        class="sequence"
        disabled={sequenceRunning}
        onclick={playAllSequence}
        type="button"
      >
        {sequenceRunning ? "Playing…" : "Play All"}
      </button>
    </div>
  </header>

  <div class="grid">
    {#each sounds as sound (sound.id)}
      <button class="card" onclick={() => triggerPlay(sound)} type="button">
        <h3>{sound.name}</h3>
        <p class="desc">{sound.description}</p>

        <div class="viz">
          {#key playKeys[sound.id] ?? 0}
            {#if sound.visual === "sword"}
              <svg
                aria-label="Sword swing arc"
                class="viz-svg"
                role="img"
                viewBox="0 0 200 120"
              >
                <path
                  class="sword-arc"
                  d="M 30 90 Q 100 10 170 90"
                  fill="none"
                />
                <line class="sword-blade" x1="35" y1="92" x2="165" y2="92" />
              </svg>
            {:else if sound.visual === "laser"}
              <div class="laser-track">
                <div class="laser-beam"></div>
                <div class="laser-glow"></div>
              </div>
            {:else if sound.visual === "hit"}
              <div class="hit-ring"></div>
              <div class="hit-flash"></div>
            {:else if sound.visual === "death"}
              <div class="death-core"></div>
              <div class="death-ring death-ring-1"></div>
              <div class="death-ring death-ring-2"></div>
              {#each Array.from({ length: 8 }) as _, index (index)}
                <div class="death-shard" style="--i:{index}"></div>
              {/each}
            {:else if sound.visual === "gear"}
              <svg
                aria-label="Gear pickup"
                class="viz-svg gear-svg"
                role="img"
                viewBox="0 0 100 100"
              >
                <g class="gear-spin">
                  {#each Array.from({ length: 8 }) as _, index (index)}
                    <rect
                      class="gear-tooth"
                      height="14"
                      transform="rotate({index * 45} 50 50)"
                      width="8"
                      x="46"
                      y="6"
                    />
                  {/each}
                  <circle cx="50" cy="50" fill="#c08840" r="22" />
                  <circle cx="50" cy="50" fill="#1a1a1a" r="9" />
                </g>
              </svg>
            {:else if sound.visual === "loot"}
              <div class="loot-grid">
                {#each Array.from({ length: 4 }) as _, index (index)}
                  <div class="loot-orb" style="--i:{index}"></div>
                {/each}
              </div>
            {:else if sound.visual === "reload"}
              <div class="reload-frame">
                <div class="reload-mag reload-mag-out"></div>
                <div class="reload-mag reload-mag-in"></div>
                <div class="reload-bar">
                  <div class="reload-bar-fill"></div>
                </div>
              </div>
            {:else if sound.visual === "repair"}
              <div class="repair-pulse"></div>
              <svg
                aria-label="Repair cross"
                class="viz-svg repair-svg"
                role="img"
                viewBox="0 0 100 100"
              >
                <rect
                  class="repair-cross"
                  height="16"
                  width="48"
                  x="26"
                  y="42"
                />
                <rect
                  class="repair-cross"
                  height="48"
                  width="16"
                  x="42"
                  y="26"
                />
              </svg>
            {:else if sound.visual === "artifact"}
              <div class="artifact-glow"></div>
              <svg
                aria-label="Artifact crystal"
                class="viz-svg artifact-svg"
                role="img"
                viewBox="0 0 100 100"
              >
                <polygon
                  class="artifact-crystal"
                  points="50,15 75,50 50,85 25,50"
                />
              </svg>
              {#each Array.from({ length: 6 }) as _, index (index)}
                <div class="artifact-spark" style="--i:{index}"></div>
              {/each}
            {:else if sound.visual === "damage"}
              <div class="damage-flash"></div>
              <div class="damage-edges"></div>
            {:else if sound.visual === "door"}
              <div class="door-frame">
                <div class="door-panel door-panel-left"></div>
                <div class="door-panel door-panel-right"></div>
                <div class="door-light"></div>
              </div>
            {:else if sound.visual === "crack"}
              <svg
                aria-label="Cracking dome"
                class="viz-svg crack-svg"
                role="img"
                viewBox="0 0 100 100"
              >
                <circle class="crack-dome" cx="50" cy="50" r="38" />
                <path
                  class="crack-line crack-line-1"
                  d="M 50 50 L 30 22 M 50 50 L 70 26"
                />
                {#if crackHitIndex >= 1}
                  <path
                    class="crack-line crack-line-2"
                    d="M 50 50 L 22 60 M 50 50 L 78 56 M 50 50 L 56 80"
                  />
                {/if}
                {#if crackHitIndex >= 2}
                  <path
                    class="crack-line crack-line-3"
                    d="M 50 50 L 38 80 M 50 50 L 78 80 M 50 50 L 18 38"
                  />
                {/if}
              </svg>
            {:else if sound.visual === "break"}
              <div class="break-burst"></div>
              {#each Array.from({ length: 12 }) as _, index (index)}
                <div class="break-shard" style="--i:{index}"></div>
              {/each}
            {/if}
          {/key}
        </div>

        {#if sound.id === "sword"}
          <label class="control">
            Variant: {swordVariant}
            <input
              bind:value={swordVariant}
              max="2"
              min="0"
              onclick={(e) => e.stopPropagation()}
              step="1"
              type="range"
            >
          </label>
        {:else if sound.id === "laser"}
          <label class="control">
            Intensity: {laserIntensity.toFixed(2)}
            <input
              bind:value={laserIntensity}
              max="1"
              min="0"
              onclick={(e) => e.stopPropagation()}
              step="0.01"
              type="range"
            >
          </label>
        {:else if sound.id === "death"}
          <label class="control">
            Size: {deathIntensity.toFixed(2)}
            <input
              bind:value={deathIntensity}
              max="1"
              min="0"
              onclick={(e) => e.stopPropagation()}
              step="0.01"
              type="range"
            >
          </label>
        {:else if sound.id === "crack"}
          <label class="control">
            Hit: {crackHitIndex}
            <input
              bind:value={crackHitIndex}
              max="2"
              min="0"
              onclick={(e) => e.stopPropagation()}
              step="1"
              type="range"
            >
          </label>
        {/if}

        <label class="control volume-control">
          <span>
            Vol: <strong>{cardVolumes[sound.id] ?? sliderUnit}</strong>
          </span>
          <input
            max={sliderMax}
            min="0"
            onclick={(e) => e.stopPropagation()}
            oninput={(e) =>
              updateLevel(sound.id, Number(e.currentTarget.value))}
            step="1"
            type="range"
            value={cardVolumes[sound.id] ?? sliderUnit}
          >
        </label>
      </button>
    {/each}
  </div>

  <section class="levels">
    <div class="levels-header">
      <h3>Levels (0-100, default 50)</h3>
      <div class="levels-actions">
        <button class="ghost-btn" onclick={resetVolumes} type="button">
          Reset all
        </button>
        <button class="ghost-btn" onclick={copyLevels} type="button">
          {copyHint}
        </button>
      </div>
    </div>
    <pre class="levels-text">{levelsText}</pre>
  </section>
</div>

<style>
  .board {
    min-height: 100vh;
    padding: 24px 28px 48px;
    font-family: ui-sans-serif, system-ui, sans-serif;
    color: #d8dde6;
    background: linear-gradient(180deg, #0d1118 0%, #14181f 100%);
  }

  header {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    align-items: flex-end;
    justify-content: space-between;
    padding-bottom: 18px;
    margin-bottom: 24px;
    border-bottom: 1px solid #2a3140;
  }

  .header-left h2 {
    margin: 0 0 4px;
    font-size: 22px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .header-left p {
    margin: 0;
    font-size: 13px;
    color: #8590a8;
  }

  .mix {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    align-items: center;
  }

  .mix label {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 12px;
    color: #aab3c4;
  }

  .mix .mix-value {
    min-width: 32px;
    font-variant-numeric: tabular-nums;
    color: #6fbdef;
  }

  .mix input[type="range"] {
    width: 110px;
    accent-color: #6fbdef;
  }

  .mute input {
    accent-color: #ef6f7f;
  }

  .sequence {
    padding: 8px 16px;
    font-weight: 600;
    color: #0a0d12;
    cursor: pointer;
    background: #6fbdef;
    border: 0;
    border-radius: 6px;
  }

  .sequence:disabled {
    color: #758195;
    cursor: not-allowed;
    background: #3b4f64;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    background: #1a212c;
    border: 1px solid #2a3140;
    border-radius: 10px;
    transition:
      border-color 120ms ease,
      transform 120ms ease;
  }

  .card:hover {
    border-color: #6fbdef;
    transform: translateY(-1px);
  }

  .card:active {
    transform: translateY(0);
  }

  .card h3 {
    margin: 0;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .desc {
    min-height: 30px;
    margin: 0;
    font-size: 11px;
    line-height: 1.4;
    color: #8590a8;
  }

  .viz {
    position: relative;
    height: 110px;
    overflow: hidden;
    background: radial-gradient(circle at 50% 50%, #0a0e15 0%, #050709 100%);
    border-radius: 6px;
  }

  .viz-svg {
    width: 100%;
    height: 100%;
  }

  .control {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: #aab3c4;
  }

  .control input[type="range"] {
    flex: 1;
    accent-color: #6fbdef;
  }

  .volume-control {
    padding-top: 8px;
    color: #ffd066;
    border-top: 1px dashed #2a3140;
  }

  .volume-control strong {
    display: inline-block;
    min-width: 22px;
    font-variant-numeric: tabular-nums;
    color: #ffe6a0;
    text-align: right;
  }

  .volume-control input[type="range"] {
    accent-color: #ffd066;
  }

  .levels {
    padding: 18px;
    margin-top: 28px;
    background: #11161e;
    border: 1px solid #2a3140;
    border-radius: 10px;
  }

  .levels-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .levels-header h3 {
    margin: 0;
    font-size: 13px;
    color: #aab3c4;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .levels-actions {
    display: flex;
    gap: 8px;
  }

  .ghost-btn {
    padding: 6px 12px;
    font: inherit;
    font-size: 12px;
    color: #aab3c4;
    cursor: pointer;
    background: transparent;
    border: 1px solid #3a4452;
    border-radius: 5px;
    transition:
      border-color 120ms ease,
      color 120ms ease;
  }

  .ghost-btn:hover {
    color: #6fbdef;
    border-color: #6fbdef;
  }

  .levels-text {
    padding: 12px 14px;
    margin: 0;
    overflow-x: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    line-height: 1.55;
    color: #cfd6e2;
    user-select: text;
    background: #060a10;
    border-radius: 6px;
  }

  .sword-arc {
    stroke: rgba(120, 200, 255, 0.5);
    stroke-width: 3;
    stroke-linecap: round;
    transform-origin: 100px 92px;
    animation: sword-arc 420ms ease-out;
  }

  .sword-blade {
    filter: drop-shadow(0 0 4px rgba(150, 220, 255, 0.7));
    stroke: #cfe6ff;
    stroke-width: 2.5;
    stroke-linecap: round;
    transform-origin: 100px 92px;
    animation: sword-arc 420ms ease-out;
  }

  @keyframes sword-arc {
    0% {
      opacity: 0;
      transform: rotate(-45deg) scale(0.7);
    }
    20% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: rotate(45deg) scale(1);
    }
  }

  .laser-track {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 100%;
    padding: 0 18px;
  }

  .laser-beam {
    width: 100%;
    height: 4px;
    background: linear-gradient(
      90deg,
      transparent,
      #ff5a3a 30%,
      #ffb070 50%,
      #ff5a3a 70%,
      transparent
    );
    border-radius: 2px;
    box-shadow:
      0 0 10px #ff5a3a,
      0 0 20px rgba(255, 90, 58, 0.5);
    transform-origin: left center;
    animation: laser-streak 320ms ease-out;
  }

  .laser-glow {
    position: absolute;
    top: 50%;
    left: 16px;
    width: 60px;
    height: 60px;
    background: radial-gradient(
      circle,
      rgba(255, 120, 70, 0.55),
      transparent 70%
    );
    border-radius: 50%;
    transform: translateY(-50%);
    animation: laser-flash 320ms ease-out;
  }

  @keyframes laser-streak {
    0% {
      opacity: 0;
      transform: scaleX(0);
    }
    20% {
      opacity: 1;
      transform: scaleX(1);
    }
    100% {
      opacity: 0;
      transform: scaleX(1);
    }
  }

  @keyframes laser-flash {
    0% {
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  .hit-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16px;
    height: 16px;
    border: 2px solid #ffd066;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: hit-expand 220ms ease-out;
  }

  .hit-flash {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 36px;
    height: 36px;
    background: radial-gradient(circle, #fff5cc, transparent 65%);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: hit-flash 180ms ease-out;
  }

  @keyframes hit-expand {
    0% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(0.4);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(2.6);
    }
  }

  @keyframes hit-flash {
    0% {
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  .death-core {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 60px;
    height: 60px;
    background: radial-gradient(
      circle,
      #ff8a4a 0%,
      #c83020 50%,
      transparent 80%
    );
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: death-core 580ms ease-out;
  }

  .death-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 28px;
    height: 28px;
    border: 2px solid #ff7a3a;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  .death-ring-1 {
    animation: death-ring 520ms ease-out;
  }

  .death-ring-2 {
    border-color: #ffae6a;
    animation: death-ring 520ms ease-out 80ms;
  }

  .death-shard {
    --angle: calc(var(--i) * 45deg);
    position: absolute;
    top: 50%;
    left: 50%;
    width: 14px;
    height: 3px;
    background: #ffb87a;
    border-radius: 1px;
    transform: translate(-50%, -50%) rotate(var(--angle));
    transform-origin: center;
    animation: death-shard 620ms ease-out;
  }

  @keyframes death-core {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.2);
    }
    20% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.2);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.6);
    }
  }

  @keyframes death-ring {
    0% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(0.3);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(3.4);
    }
  }

  @keyframes death-shard {
    0% {
      opacity: 1;
      transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) rotate(var(--angle)) translateX(60px);
    }
  }

  .gear-svg {
    filter: drop-shadow(0 0 6px rgba(255, 180, 100, 0.4));
  }

  .gear-spin {
    transform-origin: 50px 50px;
    animation: gear-spin 620ms ease-out;
  }

  .gear-tooth {
    fill: #c08840;
  }

  @keyframes gear-spin {
    0% {
      opacity: 0;
      transform: rotate(0deg) scale(0.4);
    }
    30% {
      opacity: 1;
      transform: rotate(45deg) scale(1.1);
    }
    100% {
      opacity: 0.6;
      transform: rotate(180deg) scale(0.9);
    }
  }

  .loot-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    place-content: center;
    align-items: center;
    justify-items: center;
    height: 100%;
    padding: 18px;
  }

  .loot-orb {
    --delay: calc(var(--i) * 60ms);
    width: 18px;
    height: 18px;
    background: radial-gradient(circle, #5fe7ff, #2898c8);
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(95, 231, 255, 0.7);
    animation: loot-pop 760ms ease-out var(--delay) both;
  }

  @keyframes loot-pop {
    0% {
      opacity: 0;
      transform: scale(0);
    }
    40% {
      opacity: 1;
      transform: scale(1.2);
    }
    100% {
      opacity: 0;
      transform: scale(0.8) translateY(-12px);
    }
  }

  .reload-frame {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 12px;
  }

  .reload-mag {
    position: absolute;
    left: 50%;
    width: 22px;
    height: 38px;
    background: linear-gradient(180deg, #5a6478, #303a4a);
    border: 1px solid #6a7488;
    border-radius: 3px;
    box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.3);
  }

  .reload-mag-out {
    top: 30%;
    transform: translate(-50%, 0);
    animation: reload-mag-drop 1200ms ease-in forwards;
  }

  .reload-mag-in {
    top: 30%;
    opacity: 0;
    transform: translate(-50%, -120%);
    animation: reload-mag-insert 620ms ease-out 340ms forwards;
  }

  .reload-bar {
    position: absolute;
    bottom: 14px;
    width: 60%;
    height: 4px;
    overflow: hidden;
    background: rgba(255, 220, 168, 0.15);
    border-radius: 2px;
  }

  .reload-bar-fill {
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #ffe8a6, #ffb56a);
    box-shadow: 0 0 8px rgba(255, 184, 107, 0.7);
    animation: reload-bar 1200ms linear forwards;
  }

  @keyframes reload-mag-drop {
    0% {
      transform: translate(-50%, 0);
      opacity: 1;
    }
    35% {
      transform: translate(-50%, 60%) rotate(-12deg);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, 90%) rotate(-25deg);
      opacity: 0;
    }
  }

  @keyframes reload-mag-insert {
    0% {
      transform: translate(-50%, -120%);
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    70%,
    100% {
      transform: translate(-50%, 0);
      opacity: 1;
    }
  }

  @keyframes reload-bar {
    from {
      width: 0%;
    }
    to {
      width: 100%;
    }
  }

  .repair-pulse {
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      circle,
      rgba(80, 220, 140, 0.6),
      transparent 65%
    );
    border-radius: 50%;
    animation: repair-pulse 1040ms ease-out;
  }

  .repair-svg {
    position: relative;
    filter: drop-shadow(0 0 8px rgba(120, 240, 170, 0.7));
  }

  .repair-cross {
    fill: #5fe89a;
    animation: repair-cross 800ms ease-out;
  }

  @keyframes repair-pulse {
    0% {
      opacity: 0;
      transform: scale(0.4);
    }
    30% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: scale(1.4);
    }
  }

  @keyframes repair-cross {
    0% {
      opacity: 0;
      transform: scale(0.6);
    }
    30% {
      opacity: 1;
      transform: scale(1.1);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .artifact-glow {
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      circle,
      rgba(180, 100, 255, 0.7),
      transparent 60%
    );
    border-radius: 50%;
    animation: artifact-glow 920ms ease-out;
  }

  .artifact-svg {
    position: relative;
    filter: drop-shadow(0 0 10px rgba(200, 130, 255, 0.8));
  }

  .artifact-crystal {
    fill: #c79bff;
    stroke: #fff;
    stroke-width: 1.5;
    transform-origin: 50px 50px;
    animation: artifact-pop 720ms ease-out;
  }

  .artifact-spark {
    --angle: calc(var(--i) * 60deg);
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4px;
    height: 4px;
    background: #ffe6ff;
    border-radius: 50%;
    box-shadow: 0 0 6px #ff9bff;
    animation: artifact-spark 920ms ease-out;
  }

  @keyframes artifact-glow {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    40% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(1.4);
    }
  }

  @keyframes artifact-pop {
    0% {
      opacity: 0;
      transform: scale(0.4) rotate(-30deg);
    }
    50% {
      opacity: 1;
      transform: scale(1.1) rotate(0);
    }
    100% {
      opacity: 0.9;
      transform: scale(1) rotate(0);
    }
  }

  @keyframes artifact-spark {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0);
    }
    30% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) rotate(var(--angle)) translateX(46px)
        translateY(-30px);
    }
  }

  .damage-flash {
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      circle,
      rgba(255, 60, 60, 0.7),
      rgba(140, 20, 20, 0.3)
    );
    animation: damage-flash 720ms ease-out;
  }

  .damage-edges {
    position: absolute;
    width: 100%;
    height: 100%;
    box-shadow: inset 0 0 30px rgba(255, 0, 0, 0.8);
    animation: damage-edges 720ms ease-out;
  }

  @keyframes damage-flash {
    0% {
      opacity: 0;
    }
    15% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  @keyframes damage-edges {
    0%,
    100% {
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
  }

  .door-frame {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 70%;
    height: 80%;
    overflow: hidden;
    background: linear-gradient(180deg, #1a1f28, #0a0d12);
    border: 2px solid #3a4452;
    border-radius: 4px;
    transform: translate(-50%, -50%);
  }

  .door-panel {
    position: absolute;
    top: 0;
    width: 50%;
    height: 100%;
    background: linear-gradient(180deg, #5a6478, #303a4a);
    border: 1px solid #6a7488;
  }

  .door-panel-left {
    left: 0;
    animation: door-left 1500ms ease-in-out 200ms forwards;
  }

  .door-panel-right {
    right: 0;
    animation: door-right 1500ms ease-in-out 200ms forwards;
  }

  .door-light {
    position: absolute;
    top: 0;
    left: 50%;
    width: 4px;
    height: 100%;
    background: linear-gradient(90deg, transparent, #ffd170 50%, transparent);
    transform: translateX(-50%);
    animation: door-light 1700ms ease-out forwards;
  }

  @keyframes door-left {
    to {
      transform: translateX(-100%);
    }
  }

  @keyframes door-right {
    to {
      transform: translateX(100%);
    }
  }

  @keyframes door-light {
    0% {
      opacity: 0;
      width: 4px;
    }
    20% {
      opacity: 1;
    }
    100% {
      opacity: 1;
      width: 80%;
    }
  }

  .crack-svg {
    filter: drop-shadow(0 0 4px rgba(140, 200, 255, 0.4));
  }

  .crack-dome {
    fill: rgba(60, 100, 140, 0.2);
    stroke: #6fbdef;
    stroke-width: 1.5;
    transform-origin: 50px 50px;
    animation: crack-shake 760ms ease-out;
  }

  .crack-line {
    fill: none;
    stroke: #cfe9ff;
    stroke-width: 1.4;
    stroke-linecap: round;
  }

  .crack-line-1 {
    animation: crack-appear 200ms ease-out;
  }

  .crack-line-2 {
    animation: crack-appear 200ms ease-out 60ms both;
  }

  .crack-line-3 {
    animation: crack-appear 200ms ease-out 120ms both;
  }

  @keyframes crack-shake {
    0%,
    100% {
      transform: translate(0, 0);
    }
    20% {
      transform: translate(-2px, 1px);
    }
    40% {
      transform: translate(2px, -1px);
    }
    60% {
      transform: translate(-1px, 2px);
    }
  }

  @keyframes crack-appear {
    from {
      opacity: 0;
      stroke-dasharray: 0 60;
    }
    to {
      opacity: 1;
      stroke-dasharray: 60 0;
    }
  }

  .break-burst {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 80px;
    height: 80px;
    background: radial-gradient(
      circle,
      #fff 0%,
      rgba(180, 220, 255, 0.7) 30%,
      transparent 70%
    );
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: break-burst 1650ms ease-out;
  }

  .break-shard {
    --angle: calc(var(--i) * 30deg);
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 12px;
    background: linear-gradient(180deg, #cfe9ff, #6fbdef);
    box-shadow: 0 0 4px rgba(180, 220, 255, 0.7);
    clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
    transform-origin: center;
    animation: break-shard 1650ms ease-out;
  }

  @keyframes break-burst {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.2);
    }
    15% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.4);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.6);
    }
  }

  @keyframes break-shard {
    0% {
      opacity: 1;
      transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0)
        scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-90px)
        scale(0.4);
    }
  }
</style>
