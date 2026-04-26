<script lang="ts">
  import { T } from "@threlte/core";
  import { onDestroy } from "svelte";
  import OrbKnight from "$lib/components/game/OrbKnight.svelte";
  import MachineModuleGlyph from "$lib/components/loadout/MachineModuleGlyph.svelte";
  import {
    computeMachineStats,
    createDefaultMachineLoadout,
    getMachineModuleKindAccent,
    getMachineModuleRarityAccent,
    type MachineLoadout,
    type MachineModuleId,
    type MachineModuleKind,
    type MachineSlotId,
    machineModuleTemplates,
    moduleFitsSlot,
  } from "$lib/config/machine-modules";
  import ModelTurntable from "./ModelTurntable.svelte";

  const slotOrder = [
    "attack",
    "body",
    "utility-c",
    "utility-a",
    "utility-b",
  ] satisfies MachineSlotId[];
  const slotLabels = {
    attack: "Eye",
    body: "Body",
    "utility-a": "Utility 1",
    "utility-b": "Utility 2",
    "utility-c": "Weapon",
  } satisfies Record<MachineSlotId, string>;
  const kindLabels = {
    attack: "Eye",
    body: "Body",
    sword: "Weapon",
    utility: "Utility",
  } satisfies Record<MachineModuleKind, string>;
  const getSlotKind = (slotId: MachineSlotId): MachineModuleKind => {
    if (slotId === "utility-c") {
      return "sword";
    }

    if (slotId === "attack" || slotId === "body") {
      return slotId;
    }

    return "utility";
  };

  let machineLoadout = $state<MachineLoadout>({
    ...createDefaultMachineLoadout(),
    "utility-a": "ammo-hopper",
    "utility-b": "salvage-magnet",
    "utility-c": "cleaver-axe-head",
  });
  let highlightedSlotId = $state<MachineSlotId | null>(null);
  let dummyHp = $state(260);
  let dummyHitFlash = $state(0);
  let lastRangeHit = $state("Ready");
  let rangeShots = $state<
    {
      color: string;
      core: string;
      delayMs: number;
      id: number;
      lane: number;
      mode: "beam" | "melee" | "projectile";
      widthRem: number;
    }[]
  >([]);
  let rangeShotCounter = 0;
  let rangeTimers: number[] = [];

  const machineStats = $derived(computeMachineStats(machineLoadout));
  const dummyMaxHp = 260;
  const groupedModules = $derived(
    (["attack", "body", "sword", "utility"] satisfies MachineModuleKind[])
      .map((kind) => ({
        accent: getMachineModuleKindAccent(kind),
        items: machineModuleTemplates.filter((module) => module.kind === kind),
        kind,
        label: kindLabels[kind],
      }))
      .filter((group) => group.items.length > 0)
  );
  const socketViews = $derived(
    slotOrder.map((slotId) => {
      const moduleId = machineLoadout[slotId];
      const template = moduleId
        ? machineModuleTemplates.find((module) => module.id === moduleId)
        : null;
      const kind = getSlotKind(slotId);

      return {
        accent: getMachineModuleKindAccent(kind),
        label: slotLabels[slotId],
        moduleId,
        slotId,
        template,
      };
    })
  );
  const statCards = $derived([
    { label: "Damage", value: `${machineStats.damage}` },
    { label: "Fire Rate", value: `${machineStats.fireRate.toFixed(2)}/s` },
    { label: "HP", value: `${machineStats.maxHealth}` },
    { label: "Magazine", value: `${machineStats.magazineSize}` },
    {
      label: "Reload",
      value: `${(machineStats.reloadDurationMs / 1000).toFixed(2)}s`,
    },
    { label: "Pattern", value: machineStats.weaponBuild.patternLabel },
  ]);
  const dummyHealthRatio = $derived(Math.max(0, dummyHp / dummyMaxHp));
  const rangeAttackLabel = $derived(
    machineStats.weaponBuild.attackMode === "beam"
      ? "Beam"
      : machineStats.weaponBuild.patternLabel
  );

  const slotsForModule = (moduleId: MachineModuleId) =>
    slotOrder.filter((slotId) => moduleFitsSlot(moduleId, slotId));

  const scheduleShotCleanup = (shotId: number, delayMs: number) => {
    const timer = window.setTimeout(() => {
      rangeShots = rangeShots.filter((shot) => shot.id !== shotId);
      rangeTimers = rangeTimers.filter((candidate) => candidate !== timer);
    }, delayMs);

    rangeTimers = [...rangeTimers, timer];
  };

  const flashDummy = () => {
    dummyHitFlash += 1;
    const flashId = dummyHitFlash;
    const timer = window.setTimeout(() => {
      if (dummyHitFlash === flashId) {
        dummyHitFlash = 0;
      }

      rangeTimers = rangeTimers.filter((candidate) => candidate !== timer);
    }, 190);

    rangeTimers = [...rangeTimers, timer];
  };

  const applyDummyDamage = (amount: number, label: string) => {
    const damage = Math.max(1, Math.round(amount));

    dummyHp = Math.max(0, dummyHp - damage);
    lastRangeHit = `${label} -${damage}`;
    flashDummy();
  };

  const fireRangeShot = () => {
    const build = machineStats.weaponBuild;
    const pelletCount = Math.max(1, build.pelletCount);
    const shots = Array.from({ length: pelletCount }, (_, index) => {
      const lane =
        pelletCount === 1 ? 0 : index / Math.max(1, pelletCount - 1) - 0.5;
      const id = ++rangeShotCounter;

      return {
        color: build.colors.shell,
        core: build.colors.core,
        delayMs: index * 36,
        id,
        lane,
        mode:
          build.attackMode === "beam"
            ? ("beam" as const)
            : ("projectile" as const),
        widthRem:
          build.attackMode === "beam"
            ? Math.max(0.36, build.beamWidth * 4)
            : Math.max(0.34, build.radius * 4.5),
      };
    });

    rangeShots = [...rangeShots, ...shots];

    for (const shot of shots) {
      scheduleShotCleanup(
        shot.id,
        shot.delayMs + (shot.mode === "beam" ? 360 : 720)
      );
    }

    applyDummyDamage(
      machineStats.damage,
      build.attackMode === "beam" ? "Beam hit" : "Shot hit"
    );
  };

  const swingRangeAxe = () => {
    const id = ++rangeShotCounter;

    rangeShots = [
      ...rangeShots,
      {
        color: "#56efff",
        core: "#eaffff",
        delayMs: 0,
        id,
        lane: 0,
        mode: "melee",
        widthRem: 1,
      },
    ];
    scheduleShotCleanup(id, 480);
    applyDummyDamage(machineStats.weaponBuild.meleeDamage, "Melee hit");
  };

  const resetDummy = () => {
    dummyHp = dummyMaxHp;
    lastRangeHit = "Ready";
    rangeShots = [];
    dummyHitFlash = 0;
  };

  const equipModule = (slotId: MachineSlotId, moduleId: MachineModuleId) => {
    const next: MachineLoadout = { ...machineLoadout };

    for (const candidate of slotOrder) {
      if (next[candidate] === moduleId) {
        next[candidate] = null;
      }
    }

    next[slotId] = moduleId;
    machineLoadout = next;
    highlightedSlotId = slotId;
  };

  const clearSlot = (slotId: MachineSlotId) => {
    if (slotId === "attack" || slotId === "body" || slotId === "utility-c") {
      return;
    }

    machineLoadout = { ...machineLoadout, [slotId]: null };
    highlightedSlotId = slotId;
  };

  const resetLoadout = () => {
    machineLoadout = createDefaultMachineLoadout();
    highlightedSlotId = null;
    resetDummy();
  };

  onDestroy(() => {
    for (const timer of rangeTimers) {
      window.clearTimeout(timer);
    }
  });
</script>

<main class="playground-shell">
  <section class="preview-panel">
    <ModelTurntable
      background="#050b0d"
      cameraPosition={[3.2, 2.1, 4.35]}
      height="520px"
      label="Orb Knight Loadout Preview"
    >
      <T.Group position={[0, 0, 0]}>
        <OrbKnight
          autoRotate={false}
          {highlightedSlotId}
          {machineLoadout}
          scale={1.04}
        />
      </T.Group>
    </ModelTurntable>

    <div class="stat-grid">
      {#each statCards as stat}
        <div>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
        </div>
      {/each}
    </div>

    <div class="socket-strip">
      {#each socketViews as socket (socket.slotId)}
        <button
          class:active={highlightedSlotId === socket.slotId}
          style:--accent={socket.accent}
          type="button"
          onmouseenter={() => (highlightedSlotId = socket.slotId)}
          onfocus={() => (highlightedSlotId = socket.slotId)}
          onclick={() => clearSlot(socket.slotId)}
        >
          <span>{socket.label}</span>
          <strong>{socket.template?.shortLabel ?? "Empty"}</strong>
        </button>
      {/each}
    </div>

    <section
      class="test-range"
      style:--range-accent={machineStats.weaponBuild.colors.shell}
    >
      <header class="range-header">
        <div>
          <span>Test Range</span>
          <strong>Dummy</strong>
        </div>
        <div class="range-actions">
          <button type="button" onclick={fireRangeShot}>Fire</button>
          <button type="button" onclick={swingRangeAxe}>Melee</button>
          <button type="button" onclick={resetDummy}>Reset</button>
        </div>
      </header>

      <div
        class="range-stage"
        style:--health={`${dummyHealthRatio}`}
        style:--health-pct={`${dummyHealthRatio * 100}%`}
        style:--range-accent={machineStats.weaponBuild.colors.shell}
      >
        <div class="range-hero" aria-hidden="true"><span></span></div>

        {#each rangeShots as shot (shot.id)}
          <span
            class:beam={shot.mode === "beam"}
            class:melee={shot.mode === "melee"}
            class:projectile={shot.mode === "projectile"}
            class="range-shot"
            style:--delay={`${shot.delayMs}ms`}
            style:--lane={`${shot.lane}`}
            style:--lane-offset={`${shot.lane * 3.4}rem`}
            style:--shot={shot.color}
            style:--shot-core={shot.core}
            style:--shot-width={`${shot.widthRem}rem`}
          ></span>
        {/each}

        <button
          class:hit={dummyHitFlash > 0}
          class:down={dummyHp <= 0}
          class="dummy-target"
          type="button"
          onclick={resetDummy}
        >
          <span>Dummy</span>
          <strong>{dummyHp <= 0 ? "Down" : `${Math.ceil(dummyHp)} HP`}</strong>
        </button>
      </div>

      <div class="range-readout">
        <span>{rangeAttackLabel}</span>
        <strong>{lastRangeHit}</strong>
      </div>
    </section>
  </section>

  <section class="module-panel">
    <header class="module-header">
      <div>
        <span>Try-On Modules</span>
        <strong>Click a socket target</strong>
      </div>
      <button type="button" onclick={resetLoadout}>Reset</button>
    </header>

    <div class="module-groups">
      {#each groupedModules as group (group.kind)}
        <section class="module-group" style:--accent={group.accent}>
          <h2 class="group-title">
            <span></span>
            {group.label}
          </h2>

          <div class="module-list">
            {#each group.items as module (module.id)}
              <article
                class="module-card"
                style:--accent={module.accent}
                style:--rarity={getMachineModuleRarityAccent(module.rarity)}
              >
                <div class="module-head">
                  <span class="module-glyph-frame" aria-hidden="true">
                    <MachineModuleGlyph
                      accent={module.accent}
                      moduleId={module.id}
                    />
                  </span>
                  <div>
                    <strong>{module.label}</strong>
                    <small class="module-rarity">{module.rarity}</small>
                  </div>
                </div>

                <p>{module.effect}</p>

                <div class="equip-row">
                  {#each slotsForModule(module.id) as slotId}
                    <button
                      class:installed={machineLoadout[slotId] === module.id}
                      type="button"
                      onclick={() => equipModule(slotId, module.id)}
                    >
                      {machineLoadout[slotId] === module.id
                        ? "Installed"
                        : slotLabels[slotId]}
                    </button>
                  {/each}
                </div>
              </article>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  </section>
</main>

<style>
  .playground-shell {
    display: grid;
    grid-template-columns: minmax(22rem, 0.96fr) minmax(22rem, 1fr);
    gap: 1rem;
    min-block-size: 100vh;
    padding: clamp(1rem, 2.6vw, 2rem);
    font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
    color: #f3f8f7;
    background:
      radial-gradient(
        circle at 30% 0,
        rgba(71, 190, 191, 0.14),
        transparent 34%
      ),
      linear-gradient(180deg, #101413, #03080b 70%);
  }

  .preview-panel,
  .module-panel {
    min-inline-size: 0;
  }

  .preview-panel {
    display: grid;
    gap: 0.9rem;
    align-content: start;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .stat-grid div,
  .socket-strip button,
  .module-card {
    background:
      linear-gradient(180deg, rgba(13, 22, 23, 0.96), rgba(5, 12, 15, 0.98)),
      linear-gradient(
        110deg,
        color-mix(in srgb, var(--accent, #fbbf24) 13%, transparent),
        transparent 48%
      );
    border: 1px solid
      color-mix(in srgb, var(--accent, #fbbf24) 34%, rgba(255, 255, 255, 0.08));
    border-radius: 8px;
  }

  .stat-grid div {
    display: grid;
    gap: 0.18rem;
    padding: 0.72rem;
  }

  .stat-grid span,
  .socket-strip span,
  .module-header span,
  .group-title,
  .module-rarity {
    font-size: 0.62rem;
    font-weight: 900;
    color: rgba(203, 214, 210, 0.72);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .stat-grid strong {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 1rem;
    white-space: nowrap;
  }

  .socket-strip {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .socket-strip button {
    display: grid;
    gap: 0.16rem;
    min-block-size: 3.6rem;
    padding: 0.55rem;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .socket-strip button.active,
  .socket-strip button:hover,
  .socket-strip button:focus-visible {
    border-color: color-mix(in srgb, var(--accent) 76%, white);
    box-shadow: 0 0 1rem color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .socket-strip strong {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.82rem;
    white-space: nowrap;
  }

  .test-range {
    display: grid;
    gap: 0.6rem;
    padding: 0.72rem;
    background:
      linear-gradient(180deg, rgba(10, 20, 22, 0.96), rgba(4, 10, 13, 0.98)),
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--range-accent, #38bdf8) 12%, transparent),
        transparent 58%
      );
    border: 1px solid
      color-mix(
        in srgb,
        var(--range-accent, #38bdf8) 36%,
        rgba(255, 255, 255, 0.08)
      );
    border-radius: 8px;
  }

  .range-header,
  .range-actions,
  .range-readout {
    display: flex;
    gap: 0.58rem;
    align-items: center;
  }

  .range-header {
    justify-content: space-between;
  }

  .range-header > div:first-child {
    display: grid;
    gap: 0.12rem;
  }

  .range-header span,
  .range-readout span {
    font-size: 0.62rem;
    font-weight: 900;
    color: rgba(203, 214, 210, 0.72);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .range-header strong {
    font-size: 1rem;
    line-height: 1;
  }

  .range-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .range-actions button {
    min-block-size: 2rem;
    padding: 0.4rem 0.62rem;
    font-size: 0.68rem;
    font-weight: 900;
    color: rgba(240, 247, 252, 0.88);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.065);
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 6px;
  }

  .range-actions button:hover,
  .range-actions button:focus-visible {
    border-color: color-mix(in srgb, var(--range-accent, #38bdf8) 58%, white);
    box-shadow: 0 0 0.82rem
      color-mix(in srgb, var(--range-accent, #38bdf8) 16%, transparent);
  }

  .range-stage {
    position: relative;
    min-block-size: 10.5rem;
    overflow: hidden;
    background:
      linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      radial-gradient(
        circle at 82% 50%,
        color-mix(in srgb, var(--range-accent, #38bdf8) 14%, transparent),
        transparent 32%
      ),
      rgba(2, 8, 11, 0.78);
    background-size:
      2.1rem 2.1rem,
      2.1rem 2.1rem,
      auto,
      auto;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
  }

  .range-stage::after {
    position: absolute;
    inset-block-start: calc(50% - 1px);
    inset-inline: 6.1rem 6.6rem;
    block-size: 2px;
    content: "";
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--range-accent, #38bdf8) 42%, transparent),
      transparent
    );
  }

  .range-hero {
    position: absolute;
    inset-block-start: calc(50% - 1.35rem);
    inset-inline-start: 1.2rem;
    display: grid;
    place-items: center;
    inline-size: 2.7rem;
    block-size: 2.7rem;
    background:
      radial-gradient(circle at 55% 42%, #fdf5d6, transparent 24%),
      radial-gradient(circle at 62% 55%, #8ee2eb, transparent 38%),
      linear-gradient(145deg, #9b5717, #2c2208 76%);
    border: 1px solid rgba(255, 244, 190, 0.32);
    border-radius: 999px;
    box-shadow:
      inset -0.45rem -0.5rem 0.8rem rgba(0, 0, 0, 0.38),
      0 0 1rem rgba(86, 239, 255, 0.14);
  }

  .range-hero span {
    inline-size: 0.88rem;
    block-size: 0.52rem;
    background: #dffcff;
    border-radius: 999px 999px 0.2rem 0.2rem;
    box-shadow: 0 0 0.55rem #56efff;
  }

  .dummy-target {
    position: absolute;
    inset-block-start: calc(50% - 2.2rem);
    inset-inline-end: 1rem;
    display: grid;
    gap: 0.15rem;
    place-items: center;
    inline-size: 4.4rem;
    block-size: 4.4rem;
    color: #f3f8f7;
    cursor: pointer;
    background:
      linear-gradient(
        0deg,
        color-mix(in srgb, #ef4444 64%, transparent) 0 var(--health-pct),
        transparent var(--health-pct) 100%
      ),
      radial-gradient(circle, rgba(239, 68, 68, 0.3), transparent 66%), #130b0c;
    border: 1px solid rgba(248, 113, 113, 0.58);
    border-radius: 8px;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.04),
      0 0 1rem rgba(248, 113, 113, 0.1);
    transition:
      filter 120ms ease,
      transform 120ms ease;
  }

  .dummy-target.hit {
    filter: brightness(1.35);
    transform: translateX(0.14rem) scale(1.02);
  }

  .dummy-target.down {
    opacity: 0.62;
  }

  .dummy-target span {
    font-size: 0.58rem;
    font-weight: 900;
    color: rgba(255, 234, 234, 0.82);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .dummy-target strong {
    font-size: 0.74rem;
  }

  .range-shot {
    position: absolute;
    inset-block-start: calc(50% + var(--lane-offset, 0rem));
    inset-inline-start: 5.1rem;
    z-index: 2;
    display: block;
    pointer-events: none;
    background: var(--shot-core, #eaffff);
    box-shadow:
      0 0 0.4rem var(--shot, #56efff),
      0 0 1.2rem color-mix(in srgb, var(--shot, #56efff) 46%, transparent);
  }

  .range-shot.projectile {
    inline-size: var(--shot-width, 0.48rem);
    block-size: var(--shot-width, 0.48rem);
    border-radius: 999px;
    animation: range-projectile 620ms ease-out var(--delay, 0ms) forwards;
  }

  .range-shot.beam {
    inset-inline-end: 5.7rem;
    block-size: var(--shot-width, 0.42rem);
    border-radius: 999px;
    opacity: 0;
    transform-origin: left center;
    animation: range-beam 300ms ease-out var(--delay, 0ms) forwards;
  }

  .range-shot.melee {
    inset-block-start: calc(50% - 3.15rem);
    inset-inline-start: 2.1rem;
    inline-size: 7.2rem;
    block-size: 6.3rem;
    background: transparent;
    border-block-start: 0.46rem solid var(--shot, #56efff);
    border-inline-end: 0.62rem solid var(--shot-core, #eaffff);
    border-radius: 50%;
    box-shadow:
      0 -0.12rem 0.9rem rgba(86, 239, 255, 0.45),
      inset -0.2rem 0.1rem 0.8rem rgba(234, 255, 255, 0.26);
    opacity: 0;
    transform: rotate(-14deg) scale(0.78);
    animation: range-melee 420ms ease-out forwards;
  }

  .range-readout {
    justify-content: space-between;
    min-block-size: 1.25rem;
  }

  .range-readout strong {
    max-inline-size: 62%;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.78rem;
    white-space: nowrap;
  }

  @keyframes range-projectile {
    from {
      opacity: 0;
      transform: translate(-0.3rem, -50%) scale(0.76);
    }

    10% {
      opacity: 1;
    }

    to {
      opacity: 0;
      transform: translate(27rem, -50%) scale(1.08);
    }
  }

  @keyframes range-beam {
    0% {
      opacity: 0;
      transform: translateY(-50%) scaleX(0.05);
    }

    35% {
      opacity: 1;
    }

    100% {
      opacity: 0;
      transform: translateY(-50%) scaleX(1);
    }
  }

  @keyframes range-melee {
    0% {
      opacity: 0;
      transform: rotate(-36deg) scale(0.72);
    }

    38% {
      opacity: 1;
    }

    100% {
      opacity: 0;
      transform: rotate(18deg) scale(1.04);
    }
  }

  .module-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0.8rem;
    min-block-size: 0;
  }

  .module-header {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 221, 139, 0.16);
  }

  .module-header > div {
    display: grid;
    gap: 0.12rem;
  }

  .module-header strong {
    font-size: clamp(1.2rem, 2vw, 1.55rem);
    line-height: 1;
  }

  .module-header button,
  .equip-row button {
    min-block-size: 2rem;
    padding: 0.4rem 0.62rem;
    font-size: 0.68rem;
    font-weight: 900;
    color: rgba(240, 247, 252, 0.88);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.065);
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 6px;
  }

  .module-groups {
    display: grid;
    gap: 1rem;
    align-content: start;
    min-block-size: 0;
    overflow-y: auto;
  }

  .module-group {
    display: grid;
    gap: 0.58rem;
  }

  .group-title {
    display: flex;
    gap: 0.42rem;
    align-items: center;
    margin: 0;
    color: color-mix(in srgb, var(--accent) 72%, white);
  }

  .group-title span {
    inline-size: 0.52rem;
    block-size: 0.52rem;
    background: var(--accent);
    border-radius: 999px;
    box-shadow: 0 0 0.5rem color-mix(in srgb, var(--accent) 44%, transparent);
  }

  .module-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 0.7rem;
  }

  .module-card {
    display: grid;
    gap: 0.58rem;
    align-content: start;
    padding: 0.72rem;
  }

  .module-head {
    display: flex;
    gap: 0.58rem;
    align-items: center;
    min-inline-size: 0;
  }

  .module-head > div {
    display: grid;
    gap: 0.1rem;
    min-inline-size: 0;
  }

  .module-glyph-frame {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    inline-size: 2.8rem;
    block-size: 2.8rem;
    padding: 0.35rem;
    background: rgba(0, 0, 0, 0.24);
    border: 1px solid color-mix(in srgb, var(--accent) 54%, white);
    border-radius: 7px;
  }

  .module-head strong {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.86rem;
    line-height: 1.1;
    white-space: nowrap;
  }

  .module-rarity {
    color: color-mix(in srgb, var(--rarity) 82%, white);
  }

  p {
    margin: 0;
    font-size: 0.72rem;
    line-height: 1.32;
    color: rgba(203, 214, 210, 0.72);
  }

  .equip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.38rem;
    margin-top: auto;
  }

  .equip-row button.installed {
    color: #061015;
    background: color-mix(in srgb, var(--accent) 76%, white);
    border-color: color-mix(in srgb, var(--accent) 64%, white);
  }

  @media (max-width: 1020px) {
    .playground-shell {
      grid-template-columns: 1fr;
    }

    .module-groups {
      overflow: visible;
    }
  }

  @media (max-width: 660px) {
    .stat-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .socket-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
