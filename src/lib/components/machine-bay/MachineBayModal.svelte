<script lang="ts">
  import gearCurrencyUrl from "$lib/assets/gear-currency.svg";
  import damageStatIconUrl from "$lib/assets/machine-stats/stat-damage.svg";
  import fireRateStatIconUrl from "$lib/assets/machine-stats/stat-fire-rate.svg";
  import healthStatIconUrl from "$lib/assets/machine-stats/stat-health.svg";
  import magazineStatIconUrl from "$lib/assets/machine-stats/stat-magazine.svg";
  import reloadStatIconUrl from "$lib/assets/machine-stats/stat-reload.svg";
  import { getMachineModuleIconUrl } from "$lib/config/machine-module-icons";
  import {
    getMachineModule,
    getMachineModuleKindAccent,
    getMachineModuleRarityAccent,
    type MachineLoadout,
    type MachineModuleId,
    type MachineSlotId,
    type MachineStats,
    machineSlots,
    moduleFitsSlot,
  } from "$lib/config/machine-modules";
  import MachineBayOrbPreview from "./MachineBayOrbPreview.svelte";

  interface MachineBayModalProps {
    gearCount: number;
    machineLoadout: MachineLoadout;
    machineStats: MachineStats;
    moduleInventory: MachineModuleId[];
    onClose?: () => void;
    onEjectModule?: (slotId: MachineSlotId) => void;
    onInstallModule?: (
      moduleId: MachineModuleId,
      slotId: MachineSlotId
    ) => void;
    onScrapModule?: (moduleId: MachineModuleId) => void;
    open?: boolean;
  }

  const slotPresentation = {
    attack: {
      detail: "front lens",
      label: "Eye Module",
      marker: "eye lens",
      path: "M18 17 L46 42",
    },
    body: {
      detail: "outer casing",
      label: "Body Module",
      marker: "armor shell",
      path: "M82 17 L62 33",
    },
    "utility-a": {
      detail: "service heart",
      label: "Utility Module",
      marker: "left internals",
      path: "M18 74 L37 58",
    },
    "utility-b": {
      detail: "coil socket",
      label: "Utility Module",
      marker: "upper internals",
      path: "M82 50 L67 38",
    },
    "utility-c": {
      detail: "blade coupling",
      label: "Sword Module",
      marker: "blade mount",
      path: "M50 86 L66 61",
    },
  } satisfies Record<
    MachineSlotId,
    { detail: string; label: string; marker: string; path: string }
  >;

  let {
    gearCount,
    machineLoadout,
    machineStats,
    moduleInventory,
    onClose,
    onEjectModule,
    onInstallModule,
    onScrapModule,
    open = false,
  }: MachineBayModalProps = $props();

  let confirmingScrapModuleId = $state<MachineModuleId | null>(null);
  let hoveredSlotId = $state<MachineSlotId | null>(null);

  const clearHoveredSlot = () => {
    hoveredSlotId = null;
  };

  const statReadouts = $derived([
    {
      accent: "#f87171",
      iconUrl: damageStatIconUrl,
      label: "Damage",
      value: `${machineStats.damage}`,
    },
    {
      accent: "#facc15",
      iconUrl: fireRateStatIconUrl,
      label: "Fire Rate",
      value: `${machineStats.fireRate.toFixed(2)}/s`,
    },
    {
      accent: "#4ade80",
      iconUrl: healthStatIconUrl,
      label: "Max HP",
      value: `${machineStats.maxHealth}`,
    },
    {
      accent: "#60a5fa",
      iconUrl: magazineStatIconUrl,
      label: "Magazine",
      value: `${machineStats.magazineSize}`,
    },
    {
      accent: "#fbbf24",
      iconUrl: reloadStatIconUrl,
      label: "Reload",
      value: `${(machineStats.reloadDurationMs / 1000).toFixed(2)}s`,
    },
  ]);

  const compatibleSlots = (moduleId: MachineModuleId) =>
    machineSlots.filter((slot) => moduleFitsSlot(moduleId, slot.id));

  const socketViews = $derived(
    machineSlots.map((slot) => {
      const moduleId = machineLoadout[slot.id];
      const template = moduleId ? getMachineModule(moduleId) : null;

      return {
        accent: getMachineModuleKindAccent(slot.kind),
        moduleId,
        presentation: slotPresentation[slot.id],
        rarityAccent: template
          ? getMachineModuleRarityAccent(template.rarity)
          : getMachineModuleRarityAccent("common"),
        slot,
        template,
      };
    })
  );
  const inventoryViews = $derived(
    moduleInventory.map((moduleId, index) => {
      const template = getMachineModule(moduleId);

      return {
        key: `${moduleId}-${index}`,
        kindAccent: getMachineModuleKindAccent(template.kind),
        moduleId,
        rarityAccent: getMachineModuleRarityAccent(template.rarity),
        scrapValue: template.scrapValue + machineStats.scrapYieldBonus,
        slots: compatibleSlots(moduleId),
        template,
      };
    })
  );

  const handleScrapClick = (moduleId: MachineModuleId) => {
    if (confirmingScrapModuleId !== moduleId) {
      confirmingScrapModuleId = moduleId;
      return;
    }

    confirmingScrapModuleId = null;
    onScrapModule?.(moduleId);
  };

  $effect(() => {
    if (!open) {
      confirmingScrapModuleId = null;
      return;
    }

    if (
      confirmingScrapModuleId &&
      !moduleInventory.includes(confirmingScrapModuleId)
    ) {
      confirmingScrapModuleId = null;
    }
  });
</script>

{#if open}
  <div class="backdrop">
    <section class="bay" aria-label="Warden Chassis">
      <header class="bay-header">
        <div class="bay-heading"><strong>Core Configuration</strong></div>

        <div class="machine-summary" aria-label="Machine stats">
          {#each statReadouts as stat}
            <div
              class="stat-chip"
              aria-label={`${stat.label} ${stat.value}`}
              style:--stat={stat.accent}
            >
              <img
                class="stat-icon"
                src={stat.iconUrl}
                alt=""
                aria-hidden="true"
              >
              <strong>{stat.value}</strong>
            </div>
          {/each}

          <div class="stat-chip gear-chip" aria-label={`Gears ${gearCount}`}>
            <img src={gearCurrencyUrl} alt="" aria-hidden="true">
            <strong>{gearCount}</strong>
          </div>
        </div>

        <button
          class="close-button"
          type="button"
          aria-label="Close Warden Chassis"
          onclick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div class="bay-layout">
        <section class="socket-panel" aria-label="Installed modules">
          <div class="panel-title">
            <div><span>Installed Modules</span></div>
            <small
              >{machineStats.installedModuleIds.length}/{machineSlots.length}
              active</small
            >
          </div>

          <div class="chassis-stage">
            <svg
              class="callout-lines"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {#each socketViews as socket (socket.slot.id)}
                <path
                  class="callout-line"
                  class:active={hoveredSlotId === socket.slot.id}
                  d={socket.presentation.path}
                  style:--accent={socket.accent}
                />
              {/each}
            </svg>

            <div class="model-port">
              <MachineBayOrbPreview
                highlightedSlotId={hoveredSlotId}
                onHoverSlot={(slotId) => (hoveredSlotId = slotId)}
              />
            </div>

            <div class="loadout-slots">
              {#each socketViews as socket (socket.slot.id)}
                <article
                  class:empty={!socket.template}
                  class:highlighted={hoveredSlotId === socket.slot.id}
                  class={`loadout-slot slot-${socket.slot.id}`}
                  onfocusin={() => (hoveredSlotId = socket.slot.id)}
                  onfocusout={clearHoveredSlot}
                  onpointerenter={() => (hoveredSlotId = socket.slot.id)}
                  onpointerleave={clearHoveredSlot}
                  style:--accent={socket.accent}
                  style:--rarity={socket.rarityAccent}
                >
                  <div class="socket-label">
                    <span>{socket.presentation.label}</span>
                    <small>{socket.presentation.marker}</small>
                  </div>

                  {#if socket.template}
                    <div class="module-head">
                      <div class="module-glyph" aria-hidden="true">
                        <img
                          src={getMachineModuleIconUrl(socket.template.id)}
                          alt=""
                        >
                      </div>
                      <div>
                        <strong>{socket.template.label}</strong>
                        <small class="module-meta">
                          <span class="rarity-label">
                            {socket.template.rarity}
                          </span>
                          <span>{socket.presentation.detail}</span>
                        </small>
                      </div>
                    </div>
                    <p>{socket.template.effect}</p>
                    <div class="slot-footer">
                      <div class="tag-row">
                        {#each socket.template.statLines as statLine}
                          <span>{statLine}</span>
                        {/each}
                      </div>
                      <button
                        class="bay-button secondary"
                        type="button"
                        onclick={() => onEjectModule?.(socket.slot.id)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 5v10M7 10l5-5 5 5M6 19h12" />
                        </svg>
                        <span>Eject</span>
                      </button>
                    </div>
                  {:else}
                    <div class="empty-copy">
                      <strong>Empty socket</strong>
                      <span>
                        Waiting for {socket.presentation.label.toLowerCase()}.
                      </span>
                    </div>
                  {/if}
                </article>
              {/each}
            </div>
          </div>
        </section>

        <section class="inventory-panel" aria-label="Module inventory">
          <div class="panel-title inventory-title">
            <div>
              <span>Recovered Modules</span>
              <strong>Loose machine parts</strong>
            </div>
            <small>{moduleInventory.length} loose</small>
          </div>

          <div class="inventory-well">
            {#if moduleInventory.length === 0}
              <div class="inventory-empty">
                <strong>No loose modules</strong>
                <span
                  >Treasure rooms and cleared wardens drop machine parts.</span
                >
              </div>
            {:else}
              <div class="inventory-list">
                {#each inventoryViews as item (item.key)}
                  <article
                    class="inventory-item"
                    style:--accent={item.kindAccent}
                    style:--rarity={item.rarityAccent}
                  >
                    <div class="module-head">
                      <div class="module-glyph" aria-hidden="true">
                        <img
                          src={getMachineModuleIconUrl(item.moduleId)}
                          alt=""
                        >
                      </div>
                      <div>
                        <strong>{item.template.label}</strong>
                        <small class="module-meta">
                          <span class="rarity-label">
                            {item.template.rarity}
                          </span>
                          <span>{item.template.kind}</span>
                        </small>
                      </div>
                    </div>
                    <p>{item.template.description}</p>
                    <div class="tag-row">
                      {#each item.template.statLines as statLine}
                        <span>{statLine}</span>
                      {/each}
                    </div>
                    <div class="inventory-actions">
                      {#each item.slots as slot}
                        <button
                          class="bay-button"
                          type="button"
                          onclick={() =>
                            onInstallModule?.(item.moduleId, slot.id)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          <span>Install {slot.label}</span>
                        </button>
                      {/each}
                      <button
                        class="bay-button secondary"
                        class:confirming={confirmingScrapModuleId ===
                          item.moduleId}
                        disabled={item.scrapValue <= 0}
                        type="button"
                        onclick={() => handleScrapClick(item.moduleId)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M8 8h10M10 8V6h6v2M9 11v7M14 11v7M6 8l1 12h10l1-12"
                          />
                        </svg>
                        <span>
                          {confirmingScrapModuleId === item.moduleId
                            ? `Confirm +${item.scrapValue}`
                            : `Scrap +${item.scrapValue}`}
                        </span>
                      </button>
                    </div>
                  </article>
                {/each}
              </div>
            {/if}
          </div>
        </section>
      </div>
    </section>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: grid;
    place-items: center;
    padding: clamp(0.45rem, 1.6vw, 1.2rem);
    background:
      radial-gradient(
        circle at 50% 18%,
        rgba(71, 190, 191, 0.13),
        transparent 28%
      ),
      rgba(2, 7, 13, 0.66);
    backdrop-filter: blur(14px);
  }

  .bay {
    --bay-line: rgba(252, 211, 77, 0.18);
    --bay-panel: rgba(5, 12, 15, 0.94);
    --bay-panel-strong: rgba(9, 17, 20, 0.98);
    --bay-text: #f3f8f7;

    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    inline-size: min(1240px, 100%);
    block-size: min(850px, calc(100vh - 1.4rem));
    overflow: hidden;
    font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
    color: var(--bay-text);
    background:
      linear-gradient(180deg, rgba(16, 20, 19, 0.98), rgba(3, 8, 11, 0.99)),
      repeating-linear-gradient(
        90deg,
        transparent 0 31px,
        rgba(255, 202, 98, 0.025) 31px 32px
      );
    border: 1px solid rgba(255, 210, 105, 0.3);
    border-radius: 8px;
    box-shadow:
      0 28px 110px rgba(0, 0, 0, 0.58),
      inset 0 0 0 1px rgba(255, 255, 255, 0.025);
  }

  .bay-header,
  .machine-summary,
  .module-head,
  .inventory-actions,
  .panel-title,
  .socket-label,
  .slot-footer,
  .tag-row,
  .bay-button {
    display: flex;
    align-items: center;
  }

  .bay-header {
    gap: 0.8rem;
    min-block-size: 4.35rem;
    padding: 0.65rem 0.75rem 0.65rem 1rem;
    background:
      linear-gradient(180deg, rgba(22, 28, 27, 0.84), rgba(7, 13, 15, 0.92)),
      linear-gradient(90deg, rgba(225, 151, 45, 0.1), transparent 56%);
    border-bottom: 1px solid var(--bay-line);
  }

  .bay-heading {
    display: grid;
    gap: 0.12rem;
    min-inline-size: 10rem;
  }

  .panel-title span,
  .socket-label small,
  .module-head small,
  p,
  .empty-copy span,
  .inventory-empty span {
    color: rgba(203, 214, 210, 0.72);
  }

  .panel-title span {
    font-size: 0.67rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .bay-heading strong {
    font-size: clamp(1rem, 1.5vw, 1.18rem);
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .machine-summary {
    flex: 1 1 auto;
    flex-wrap: wrap;
    gap: 0.38rem;
    min-inline-size: 0;
  }

  .stat-chip {
    display: inline-flex;
    gap: 0.42rem;
    align-items: center;
    min-block-size: 2.35rem;
    padding: 0.34rem 0.55rem;
    color: color-mix(in srgb, var(--stat, #fbbf24) 78%, white);
    background:
      linear-gradient(180deg, rgba(21, 29, 30, 0.96), rgba(6, 12, 14, 0.98)),
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--stat, #fbbf24) 16%, transparent),
        transparent
      );
    border: 1px solid
      color-mix(in srgb, var(--stat, #fbbf24) 34%, rgba(255, 255, 255, 0.08));
    border-radius: 6px;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.025),
      0 0 0.9rem color-mix(in srgb, var(--stat, #fbbf24) 8%, transparent);
  }

  .stat-icon,
  .gear-chip img {
    inline-size: 1.46rem;
    block-size: 1.46rem;
    object-fit: contain;
    filter: drop-shadow(0 0.1rem 0.12rem rgba(0, 0, 0, 0.44))
      drop-shadow(
        0 0 0.32rem color-mix(in srgb, var(--stat, #fbbf24) 36%, transparent)
      );
  }

  .gear-chip {
    --stat: #fbbf24;
  }

  .stat-chip strong {
    min-inline-size: 1.55rem;
    font-size: 0.9rem;
    line-height: 1;
  }

  button {
    font: inherit;
  }

  .bay-button {
    gap: 0.42rem;
    justify-content: center;
    min-inline-size: 0;
    min-block-size: 2.15rem;
    padding: 0.5rem 0.68rem;
    font-size: 0.74rem;
    font-weight: 900;
    line-height: 1;
    color: #061015;
    cursor: pointer;
    background: color-mix(in srgb, var(--accent, #f59e0b) 76%, white);
    border: 1px solid color-mix(in srgb, var(--accent, #f59e0b) 64%, white);
    border-radius: 6px;
  }

  .bay-button svg {
    flex: 0 0 auto;
    inline-size: 0.92rem;
    block-size: 0.92rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.25;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .bay-button:hover,
  .bay-button:focus-visible,
  .close-button:hover,
  .close-button:focus-visible {
    filter: brightness(1.08);
  }

  .bay-button:disabled {
    color: rgba(227, 235, 240, 0.42);
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .secondary {
    color: rgba(240, 247, 252, 0.88);
    background: rgba(255, 255, 255, 0.065);
    border-color: rgba(255, 255, 255, 0.13);
  }

  .secondary.confirming {
    color: #140d05;
    background: #fbbf24;
    border-color: #ffe08a;
    animation: scrap-confirm-pulse 0.58s ease-in-out infinite alternate;
  }

  @keyframes scrap-confirm-pulse {
    from {
      box-shadow: 0 0 0 color-mix(in srgb, #fbbf24 0%, transparent);
      transform: translateY(0);
    }

    to {
      box-shadow: 0 0 0.85rem color-mix(in srgb, #fbbf24 42%, transparent);
      transform: translateY(-1px);
    }
  }

  .close-button {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    inline-size: 2.25rem;
    block-size: 2.25rem;
    min-block-size: 0;
    padding: 0;
    color: rgba(255, 235, 205, 0.9);
    cursor: pointer;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 50%;
  }

  .close-button svg {
    inline-size: 1.08rem;
    block-size: 1.08rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
  }

  .bay-layout {
    display: grid;
    grid-template-columns: minmax(46rem, 1fr) minmax(18rem, 0.58fr);
    min-block-size: 0;
  }

  .socket-panel,
  .inventory-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    min-block-size: 0;
    padding: 1rem;
  }

  .socket-panel {
    border-inline-end: 1px solid rgba(252, 211, 77, 0.12);
  }

  .panel-title {
    gap: 1rem;
    justify-content: space-between;
    min-block-size: 2.3rem;
    margin-bottom: 0.85rem;
  }

  .panel-title > div {
    display: grid;
    gap: 0.16rem;
  }

  .panel-title strong {
    font-size: 0.98rem;
    line-height: 1.08;
  }

  .panel-title small {
    font-size: 0.76rem;
    font-weight: 900;
    color: rgba(237, 227, 199, 0.78);
    white-space: nowrap;
  }

  .chassis-stage {
    position: relative;
    display: grid;
    grid-template-areas:
      "attack model body"
      "utility-a model utility-b"
      ". utility-c .";
    grid-template-rows: minmax(10rem, auto) minmax(10rem, auto) minmax(
        8.5rem,
        auto
      );
    grid-template-columns: minmax(11.8rem, 1fr) minmax(12.5rem, 0.86fr) minmax(
        11.8rem,
        1fr
      );
    gap: 0.78rem;
    min-block-size: 0;
    padding: 0.9rem;
    overflow: hidden;
    background:
      radial-gradient(
        circle at 50% 45%,
        rgba(77, 222, 235, 0.1),
        transparent 32%
      ),
      linear-gradient(180deg, rgba(9, 17, 18, 0.92), rgba(2, 8, 11, 0.96)),
      repeating-linear-gradient(
        0deg,
        transparent 0 27px,
        rgba(255, 219, 139, 0.028) 27px 28px
      );
    border: 1px solid rgba(255, 221, 139, 0.14);
    border-radius: 8px;
    box-shadow: inset 0 0 3rem rgba(0, 0, 0, 0.34);
  }

  .model-port {
    position: relative;
    z-index: 2;
    grid-area: model;
    align-self: center;
    justify-self: center;
    inline-size: min(29.7rem, 100%);
    aspect-ratio: 1;
    border-radius: 50%;
  }

  .callout-lines {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }

  .callout-line {
    fill: none;
    opacity: 0.36;
    stroke: color-mix(in srgb, var(--accent, #38bdf8) 52%, transparent);
    stroke-width: 0.28;
    stroke-linecap: round;
    transition:
      opacity 160ms ease,
      stroke-width 160ms ease,
      filter 160ms ease;
    vector-effect: non-scaling-stroke;
  }

  .callout-line.active {
    opacity: 0.92;
    filter: drop-shadow(
      0 0 0.42rem color-mix(in srgb, var(--accent, #38bdf8) 68%, transparent)
    );
    stroke-width: 0.54;
  }

  .loadout-slots {
    display: contents;
  }

  .loadout-slot,
  .inventory-item {
    display: grid;
    gap: 0.62rem;
    align-content: start;
    min-inline-size: 0;
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(13, 22, 23, 0.96), rgba(5, 12, 15, 0.98)),
      linear-gradient(
        110deg,
        color-mix(in srgb, var(--accent, #f59e0b) 17%, transparent),
        transparent 45%
      );
    border: 1px solid
      color-mix(in srgb, var(--accent, #f59e0b) 46%, rgba(255, 255, 255, 0.09));
    border-radius: 8px;
    box-shadow:
      inset 0 0 0 1px
      color-mix(in srgb, var(--accent, #f59e0b) 13%, transparent),
      0 0 1.2rem color-mix(in srgb, var(--accent, #f59e0b) 10%, transparent);
  }

  .loadout-slot {
    position: relative;
    z-index: 3;
    inline-size: 100%;
    min-block-size: 9.8rem;
    padding: 0.76rem;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease,
      background 160ms ease;
  }

  .slot-attack {
    grid-area: attack;
  }

  .slot-body {
    grid-area: body;
  }

  .slot-utility-a {
    grid-area: utility-a;
  }

  .slot-utility-b {
    grid-area: utility-b;
  }

  .slot-utility-c {
    grid-area: utility-c;
  }

  .loadout-slot.empty {
    border-style: dashed;
  }

  .loadout-slot:hover,
  .loadout-slot:focus-within,
  .loadout-slot.highlighted,
  .inventory-item:hover,
  .inventory-item:focus-within {
    background:
      linear-gradient(180deg, rgba(16, 29, 30, 0.98), rgba(7, 15, 18, 0.99)),
      linear-gradient(
        110deg,
        color-mix(in srgb, var(--accent, #f59e0b) 24%, transparent),
        transparent 48%
      );
    border-color: color-mix(in srgb, var(--accent, #f59e0b) 78%, white);
    box-shadow:
      inset 0 0 0 1px
      color-mix(in srgb, var(--accent, #f59e0b) 22%, transparent),
      0 0 1.6rem color-mix(in srgb, var(--accent, #f59e0b) 22%, transparent);
    transform: translateY(-2px);
  }

  .socket-label {
    gap: 0.6rem;
    justify-content: space-between;
    min-block-size: 1.2rem;
    font-size: 0.68rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .socket-label span {
    min-inline-size: 0;
    color: color-mix(in srgb, var(--accent, #f59e0b) 72%, white);
  }

  .socket-label small {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: end;
    white-space: nowrap;
  }

  .module-head {
    gap: 0.62rem;
    min-inline-size: 0;
  }

  .module-head > div:last-child {
    display: grid;
    gap: 0.18rem;
    min-inline-size: 0;
  }

  .module-head strong {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.86rem;
    line-height: 1.1;
    white-space: nowrap;
  }

  .module-head small {
    display: flex;
    flex-wrap: wrap;
    gap: 0.32rem;
    font-size: 0.62rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .rarity-label {
    color: color-mix(in srgb, var(--rarity, #cbd5e1) 86%, white);
  }

  .module-glyph {
    position: relative;
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    inline-size: 2.45rem;
    block-size: 2.45rem;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--accent) 26%, transparent),
      rgba(255, 255, 255, 0.035)
    );
    border: 2px solid color-mix(in srgb, var(--accent) 58%, white);
    border-radius: 50%;
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--accent) 24%, transparent),
      0 0 1rem color-mix(in srgb, var(--accent) 28%, transparent);
  }

  .module-glyph img {
    inline-size: 2.8rem;
    block-size: 2.8rem;
    object-fit: contain;
    filter: drop-shadow(0 0.28rem 0.32rem rgba(0, 0, 0, 0.38));
  }

  p {
    min-block-size: 2.35em;
    margin: 0;
    font-size: 0.73rem;
    line-height: 1.28;
  }

  .slot-footer {
    gap: 0.55rem;
    justify-content: space-between;
    margin-top: auto;
  }

  .tag-row {
    flex: 1 1 auto;
    flex-wrap: wrap;
    gap: 0.32rem;
  }

  .tag-row span {
    padding: 0.2rem 0.4rem;
    font-size: 0.64rem;
    font-weight: 900;
    color: color-mix(in srgb, var(--accent) 76%, white);
    background: color-mix(in srgb, var(--accent) 13%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
    border-radius: 999px;
  }

  .empty-copy,
  .inventory-empty {
    display: grid;
    gap: 0.3rem;
    place-content: center;
    min-block-size: 7.2rem;
    text-align: center;
  }

  .empty-copy strong,
  .inventory-empty strong {
    font-size: 0.92rem;
  }

  .inventory-panel {
    background:
      linear-gradient(180deg, rgba(8, 14, 15, 0.26), transparent),
      radial-gradient(
        circle at 50% 12%,
        rgba(251, 191, 36, 0.07),
        transparent 33%
      );
  }

  .inventory-well {
    min-block-size: 0;
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(9, 18, 20, 0.93), rgba(3, 9, 12, 0.98)),
      radial-gradient(
        circle at 50% 48%,
        rgba(251, 191, 36, 0.055),
        transparent 44%
      );
    border: 2px solid rgba(190, 125, 23, 0.86);
    border-radius: 8px;
    box-shadow:
      inset 0 0 0 1px rgba(255, 225, 154, 0.12),
      inset 0 0 3rem rgba(0, 0, 0, 0.42),
      0 0 1.8rem rgba(189, 117, 16, 0.12);
  }

  .inventory-empty {
    block-size: 100%;
    padding: 1.4rem;
  }

  .inventory-list {
    display: grid;
    gap: 0.75rem;
    align-content: start;
    block-size: 100%;
    padding: 0.85rem;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .inventory-item {
    padding: 0.82rem;
  }

  .inventory-item p {
    min-block-size: auto;
  }

  .inventory-actions {
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  @media (max-width: 1080px) {
    .bay-layout {
      grid-template-columns: minmax(0, 1fr);
      overflow: auto;
    }

    .socket-panel {
      min-block-size: 42rem;
      border-inline-end: 0;
      border-bottom: 1px solid rgba(252, 211, 77, 0.12);
    }

    .inventory-panel {
      min-block-size: 24rem;
    }
  }

  @media (max-width: 760px) {
    .backdrop {
      align-items: stretch;
      padding: 0;
    }

    .bay {
      block-size: 100vh;
      border-width: 0;
      border-radius: 0;
    }

    .bay-header {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: start;
      min-block-size: auto;
      padding: 0.72rem;
    }

    .close-button {
      grid-row: 1;
      grid-column: 2;
      justify-self: end;
    }

    .machine-summary {
      flex-wrap: nowrap;
      grid-row: 2;
      grid-column: 1 / -1;
      padding-block-end: 0.12rem;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .machine-summary::-webkit-scrollbar {
      display: none;
    }

    .stat-chip {
      flex: 0 0 auto;
      gap: 0.3rem;
      min-block-size: 2rem;
      padding: 0.25rem 0.42rem;
    }

    .stat-icon,
    .gear-chip img {
      inline-size: 1.2rem;
      block-size: 1.2rem;
    }

    .stat-chip strong {
      min-inline-size: auto;
      font-size: 0.78rem;
    }

    .socket-panel,
    .inventory-panel {
      padding: 0.72rem;
    }

    .socket-panel {
      min-block-size: auto;
    }

    .chassis-stage {
      display: grid;
      grid-template-areas:
        "model"
        "slots";
      grid-template-rows: auto auto;
      grid-template-columns: minmax(0, 1fr);
      gap: 0.75rem;
      padding: 0.75rem;
      overflow: visible;
    }

    .model-port {
      position: relative;
      inset: auto;
      grid-area: model;
      justify-self: center;
      inline-size: min(19.8rem, 92%);
      transform: none;
    }

    .callout-lines {
      display: none;
    }

    .loadout-slots {
      display: grid;
      grid-area: slots;
      grid-template-columns: 1fr;
      gap: 0.62rem;
    }

    .loadout-slot {
      position: relative;
      inset: auto;
      inline-size: 100%;
      min-block-size: 0;
      transform: none;
    }

    .slot-attack,
    .slot-body,
    .slot-utility-a,
    .slot-utility-b,
    .slot-utility-c {
      grid-area: auto;
    }

    .slot-footer,
    .inventory-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .bay-button {
      inline-size: 100%;
    }
  }

  @media (max-width: 430px) {
    .panel-title {
      flex-direction: column;
      gap: 0.35rem;
      align-items: start;
    }

    .socket-label {
      flex-direction: column;
      gap: 0.15rem;
      align-items: start;
    }

    .socket-label small {
      text-align: start;
    }
  }
</style>
