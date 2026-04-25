<script lang="ts">
  import gearCurrencyUrl from "$lib/assets/gear-currency.svg";
  import damageStatIconUrl from "$lib/assets/machine-stats/stat-damage.svg";
  import fireRateStatIconUrl from "$lib/assets/machine-stats/stat-fire-rate.svg";
  import healthStatIconUrl from "$lib/assets/machine-stats/stat-health.svg";
  import magazineStatIconUrl from "$lib/assets/machine-stats/stat-magazine.svg";
  import reloadStatIconUrl from "$lib/assets/machine-stats/stat-reload.svg";
  import {
    computeMachineStats,
    getMachineModule,
    getMachineModuleKindAccent,
    getMachineModuleRarityAccent,
    type MachineLoadout,
    type MachineModuleId,
    type MachineSlotId,
    type MachineStats,
    machineModuleTemplates,
    machineSlots,
    moduleFitsSlot,
  } from "$lib/config/machine-modules";
  import MachineBayOrbPreview from "./MachineBayOrbPreview.svelte";
  import MachineModuleGlyph from "./MachineModuleGlyph.svelte";

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
    open?: boolean;
  }

  const baySlotOrder = [
    "attack",
    "body",
    "utility-c",
    "utility-a",
    "utility-b",
  ] satisfies MachineSlotId[];

  const slotPresentation = {
    attack: {
      code: "EYE",
      empty: "Recover an eye module from wardens.",
      label: "Eye Module",
      shortLabel: "Eye",
    },
    body: {
      code: "BODY",
      empty: "Recover a body module from wardens.",
      label: "Body Module",
      shortLabel: "Body",
    },
    "utility-a": {
      code: "UTILITY 1",
      empty: "Recover utility modules from treasure rooms.",
      label: "Utility Module",
      shortLabel: "Utility 1",
    },
    "utility-b": {
      code: "UTILITY 2",
      empty: "Recover utility modules from treasure rooms.",
      label: "Utility Module",
      shortLabel: "Utility 2",
    },
    "utility-c": {
      code: "WEAPON",
      empty: "Recover a weapon module from wardens.",
      label: "Weapon Module",
      shortLabel: "Weapon",
    },
  } satisfies Record<
    MachineSlotId,
    { code: string; empty: string; label: string; shortLabel: string }
  >;

  let {
    gearCount,
    machineLoadout,
    machineStats,
    moduleInventory,
    onClose,
    onEjectModule,
    onInstallModule,
    open = false,
  }: MachineBayModalProps = $props();

  let selectedSlotId = $state<MachineSlotId | null>(null);
  let viewingModuleId = $state<MachineModuleId | null>(null);

  const machineStatAccent = "#fbbf24";
  const moduleCatalogOrder = new Map(
    machineModuleTemplates.map((template, index) => [template.id, index])
  );

  const formatCompactDelta = (delta: number) => {
    if (Math.abs(delta) < 0.05) {
      return null;
    }

    const rounded =
      Math.abs(delta) >= 1 ? Math.round(delta) : Math.round(delta * 10) / 10;

    if (rounded === 0) {
      return null;
    }

    const magnitude =
      Math.abs(rounded) >= 1 ? `${Math.abs(rounded)}` : `${Math.abs(rounded)}`;
    const sign = rounded > 0 ? "+" : "-";

    return `${sign}${magnitude}`;
  };

  const deltaKind = (delta: number, lowerIsBetter = false) => {
    if (Math.abs(delta) < 0.005) {
      return "flat";
    }

    return (lowerIsBetter ? delta < 0 : delta > 0) ? "buff" : "nerf";
  };

  const slotById = Object.fromEntries(
    machineSlots.map((slot) => [slot.id, slot])
  ) as Record<MachineSlotId, (typeof machineSlots)[number]>;

  const getModuleOptionsForSlot = (slotId: MachineSlotId) => {
    const currentModuleId = machineLoadout[slotId];
    const ids = [
      ...(currentModuleId ? [currentModuleId] : []),
      ...moduleInventory.filter((moduleId) => moduleFitsSlot(moduleId, slotId)),
    ];
    const uniqueIds = [...new Set(ids)].sort(
      (left, right) =>
        (moduleCatalogOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (moduleCatalogOrder.get(right) ?? Number.MAX_SAFE_INTEGER)
    );

    return uniqueIds.map((moduleId) => {
      const template = getMachineModule(moduleId);

      return {
        accent: template.accent,
        equipped: currentModuleId === moduleId,
        moduleId,
        rarityAccent: getMachineModuleRarityAccent(template.rarity),
        template,
      };
    });
  };

  const socketViews = $derived(
    baySlotOrder.map((slotId) => {
      const slot = slotById[slotId];
      const moduleId = machineLoadout[slotId];
      const template = moduleId ? getMachineModule(moduleId) : null;

      return {
        accent: getMachineModuleKindAccent(slot.kind),
        moduleId,
        moduleAccent: template?.accent ?? getMachineModuleKindAccent(slot.kind),
        options: getModuleOptionsForSlot(slotId),
        presentation: slotPresentation[slotId],
        rarityAccent: template
          ? getMachineModuleRarityAccent(template.rarity)
          : getMachineModuleRarityAccent("common"),
        slot,
        template,
      };
    })
  );
  const selectedSocket = $derived(
    selectedSlotId
      ? (socketViews.find((socket) => socket.slot.id === selectedSlotId) ??
          null)
      : null
  );
  const selectedOptions = $derived(selectedSocket?.options ?? []);
  const selectedModule = $derived(
    viewingModuleId ? getMachineModule(viewingModuleId) : null
  );
  const selectedModuleAccent = $derived(
    selectedModule ? selectedModule.accent : "#fbbf24"
  );
  const selectedModuleRarityAccent = $derived(
    selectedModule
      ? getMachineModuleRarityAccent(selectedModule.rarity)
      : getMachineModuleRarityAccent("common")
  );
  const selectedIsEquipped = $derived(
    Boolean(
      selectedSlotId &&
        viewingModuleId &&
        machineLoadout[selectedSlotId] === viewingModuleId
    )
  );
  const selectedCanEquip = $derived(
    Boolean(
      selectedSlotId &&
        viewingModuleId &&
        !selectedIsEquipped &&
        moduleInventory.includes(viewingModuleId)
    )
  );
  const selectedSlotRequired = $derived(
    selectedSlotId === "attack" ||
      selectedSlotId === "body" ||
      selectedSlotId === "utility-c"
  );
  const previewLoadout = $derived.by(() => {
    if (!(selectedSlotId && viewingModuleId)) {
      return machineLoadout;
    }

    if (machineLoadout[selectedSlotId] === viewingModuleId) {
      return machineLoadout;
    }

    return { ...machineLoadout, [selectedSlotId]: viewingModuleId };
  });
  const previewStats = $derived(computeMachineStats(previewLoadout));
  const statReadouts = $derived.by(() => {
    const damageDelta = previewStats.damage - machineStats.damage;
    const fireRateDelta = previewStats.fireRate - machineStats.fireRate;
    const healthDelta = previewStats.maxHealth - machineStats.maxHealth;
    const magazineDelta = previewStats.magazineSize - machineStats.magazineSize;
    const reloadDeltaSeconds =
      (previewStats.reloadDurationMs - machineStats.reloadDurationMs) / 1000;

    return [
      {
        accent: machineStatAccent,
        deltaKind: deltaKind(damageDelta),
        deltaLabel: formatCompactDelta(damageDelta),
        description: "Damage dealt by each shot.",
        iconUrl: damageStatIconUrl,
        label: "Damage",
        value: `${previewStats.damage}`,
      },
      {
        accent: machineStatAccent,
        deltaKind: deltaKind(fireRateDelta),
        deltaLabel: formatCompactDelta(fireRateDelta),
        description: "Shots fired per second.",
        iconUrl: fireRateStatIconUrl,
        label: "Fire Rate",
        value: `${previewStats.fireRate.toFixed(2)}/s`,
      },
      {
        accent: machineStatAccent,
        deltaKind: deltaKind(healthDelta),
        deltaLabel: formatCompactDelta(healthDelta),
        description: "Maximum machine health.",
        iconUrl: healthStatIconUrl,
        label: "Max HP",
        value: `${previewStats.maxHealth}`,
      },
      {
        accent: machineStatAccent,
        deltaKind: deltaKind(magazineDelta),
        deltaLabel: formatCompactDelta(magazineDelta),
        description: "Shots available before reloading.",
        iconUrl: magazineStatIconUrl,
        label: "Magazine",
        value: `${previewStats.magazineSize}`,
      },
      {
        accent: machineStatAccent,
        deltaKind: deltaKind(reloadDeltaSeconds, true),
        deltaLabel: formatCompactDelta(reloadDeltaSeconds),
        description: "Time needed to reload.",
        iconUrl: reloadStatIconUrl,
        label: "Reload",
        value: `${(previewStats.reloadDurationMs / 1000).toFixed(2)}s`,
      },
    ];
  });
  const selectSlot = (slotId: MachineSlotId) => {
    selectedSlotId = selectedSlotId === slotId ? null : slotId;
  };

  const equipViewedModule = () => {
    if (!(selectedSlotId && viewingModuleId && selectedCanEquip)) {
      return;
    }

    onInstallModule?.(viewingModuleId, selectedSlotId);
  };

  const ejectSelectedModule = () => {
    if (!(selectedSlotId && selectedIsEquipped)) {
      return;
    }

    onEjectModule?.(selectedSlotId);
  };

  $effect(() => {
    if (!open) {
      selectedSlotId = null;
      viewingModuleId = null;
      return;
    }

    if (!selectedSlotId) {
      viewingModuleId = null;
      return;
    }

    if (
      viewingModuleId &&
      selectedOptions.some((item) => item.moduleId === viewingModuleId)
    ) {
      return;
    }

    viewingModuleId = selectedOptions[0]?.moduleId ?? null;
  });
</script>

{#if open}
  <div class="backdrop">
    <section class="bay" aria-label="Orb Knight Loadout">
      <header class="bay-header">
        <div class="bay-heading"><strong>Loadout</strong></div>

        <div class="machine-summary" aria-label="Loadout stats">
          {#each statReadouts as stat}
            <div
              class="stat-chip"
              aria-label={`${stat.label}: ${stat.value}. ${stat.description}`}
              data-tooltip={`${stat.label}: ${stat.description}`}
              style:--stat={stat.accent}
            >
              <span class="stat-icon-frame" aria-hidden="true">
                <img class="stat-icon" src={stat.iconUrl} alt="">
              </span>
              <strong>{stat.value}</strong>
              <small
                class:buff={stat.deltaKind === "buff"}
                class:empty={!stat.deltaLabel}
                class:nerf={stat.deltaKind === "nerf"}
                aria-hidden={!stat.deltaLabel}
              >
                {stat.deltaLabel ?? ""}
              </small>
            </div>
          {/each}

          <div
            class="stat-chip gear-chip"
            aria-label={`Gears: ${gearCount}. Currency used for loadout modules.`}
            data-tooltip="Gears: Currency used for loadout modules."
          >
            <span class="stat-icon-frame" aria-hidden="true">
              <img class="stat-icon" src={gearCurrencyUrl} alt="">
            </span>
            <strong>{gearCount}</strong>
          </div>
        </div>

        <button
          class="close-button"
          type="button"
          aria-label="Close Loadout"
          onclick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div class:menu-open={selectedSlotId !== null} class="bay-layout">
        <nav class="socket-rail" aria-label="Loadout sockets">
          {#each socketViews as socket (socket.slot.id)}
            <button
              class:active={selectedSlotId === socket.slot.id}
              class="socket-button"
              style:--accent={socket.accent}
              type="button"
              aria-label={socket.presentation.label}
              aria-pressed={selectedSlotId === socket.slot.id}
              onclick={() => selectSlot(socket.slot.id)}
            >
              <span class="socket-glyph" aria-hidden="true">
                {#if socket.moduleId}
                  <MachineModuleGlyph
                    accent={socket.moduleAccent}
                    moduleId={socket.moduleId}
                  />
                {:else}
                  <svg viewBox="0 0 64 64" aria-hidden="true">
                    <circle cx="32" cy="32" r="19" />
                    <path d="M32 21v22M21 32h22" />
                  </svg>
                {/if}
              </span>
            </button>
          {/each}
        </nav>

        {#if selectedSocket}
          <aside
            class="module-drawer"
            style:--accent={selectedSocket.accent}
            aria-label={`${selectedSocket.presentation.shortLabel} modules`}
          >
            <section class="drawer-grid">
              <div class="drawer-title">
                <span>Available {selectedSocket.presentation.shortLabel}</span>
                <small>{selectedOptions.length}</small>
              </div>

              {#if selectedOptions.length > 0}
                <div class="module-tile-grid">
                  {#each selectedOptions as option (option.moduleId)}
                    <button
                      class:equipped={option.equipped}
                      class:selected={viewingModuleId === option.moduleId}
                      class="module-tile"
                      style:--accent={option.accent}
                      type="button"
                      aria-label={option.template.label}
                      aria-pressed={viewingModuleId === option.moduleId}
                      onclick={() => (viewingModuleId = option.moduleId)}
                    >
                      <MachineModuleGlyph
                        accent={option.accent}
                        moduleId={option.moduleId}
                      />
                      {#if option.equipped}
                        <span class="equipped-dot" aria-hidden="true"></span>
                      {/if}
                    </button>
                  {/each}
                </div>
              {:else}
                <div class="empty-modules">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 10V7a4 4 0 0 1 8 0v3M6 10h12v10H6z" />
                  </svg>
                  <strong>No modules found</strong>
                  <span>{selectedSocket.presentation.empty}</span>
                </div>
              {/if}
            </section>

            <section
              class:empty={!selectedModule}
              class="module-detail"
              style:--accent={selectedModuleAccent}
              style:--rarity={selectedModuleRarityAccent}
            >
              <div class="detail-kicker">
                <span>{selectedSocket.presentation.shortLabel}</span>
                <small>{selectedSocket.presentation.label}</small>
              </div>

              {#if selectedModule && viewingModuleId}
                <div class="detail-body">
                  <div class="detail-head">
                    <div class="detail-glyph" aria-hidden="true">
                      <MachineModuleGlyph
                        accent={selectedModuleAccent}
                        moduleId={viewingModuleId}
                      />
                    </div>
                    <div>
                      <strong>{selectedModule.label}</strong>
                      <small>{selectedModule.rarity}</small>
                    </div>
                  </div>

                  <p>{selectedModule.description}</p>
                  <p class="effect">{selectedModule.effect}</p>

                  <div class="tag-row">
                    {#each selectedModule.statLines as statLine}
                      <span>{statLine}</span>
                    {/each}
                  </div>

                  <div class="detail-actions">
                    {#if selectedIsEquipped}
                      <button
                        class="bay-button equipped"
                        type="button"
                        disabled
                      >
                        <span>Equipped</span>
                      </button>
                      {#if !selectedSlotRequired}
                        <button
                          class="bay-button secondary"
                          type="button"
                          onclick={ejectSelectedModule}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 5v10M7 10l5-5 5 5M6 19h12" />
                          </svg>
                          <span>Eject</span>
                        </button>
                      {/if}
                    {:else}
                      <button
                        class="bay-button"
                        disabled={!selectedCanEquip}
                        type="button"
                        onclick={equipViewedModule}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        <span>Equip Module</span>
                      </button>
                    {/if}
                  </div>
                </div>
              {:else}
                <div class="empty-detail">
                  <strong>Empty socket</strong>
                  <span>{selectedSocket.presentation.empty}</span>
                </div>
              {/if}
            </section>
          </aside>
        {/if}

        <section class="hero-stage" aria-label="Orb Knight preview">
          <div class="model-port">
            <MachineBayOrbPreview
              highlightedSlotId={selectedSlotId}
              machineLoadout={previewLoadout}
            />
          </div>
          <span class="drag-hint">Drag to rotate</span>
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
    inline-size: min(1180px, 100%);
    block-size: min(820px, calc(100vh - 1.4rem));
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
  .detail-head,
  .detail-actions,
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
    position: relative;
    display: inline-flex;
    gap: 0.34rem;
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

  .stat-chip::after {
    position: absolute;
    inset-block-start: calc(100% + 0.42rem);
    inset-inline-start: 50%;
    z-index: 8;
    visibility: hidden;
    inline-size: max-content;
    max-inline-size: 13rem;
    padding: 0.42rem 0.5rem;
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1.18;
    color: #fff7d7;
    text-align: center;
    white-space: normal;
    pointer-events: none;
    content: attr(data-tooltip);
    background: rgba(8, 11, 10, 0.96);
    border: 1px solid color-mix(in srgb, var(--stat, #fbbf24) 42%, #2a2110);
    border-radius: 5px;
    box-shadow:
      0 0.55rem 1.3rem rgba(0, 0, 0, 0.42),
      0 0 0.8rem color-mix(in srgb, var(--stat, #fbbf24) 13%, transparent);
    opacity: 0;
    transform: translate(-50%, -0.15rem);
    transition:
      opacity 120ms ease,
      visibility 120ms ease,
      transform 120ms ease;
  }

  .stat-chip:hover::after {
    visibility: visible;
    opacity: 1;
    transform: translate(-50%, 0);
  }

  .stat-icon-frame {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    inline-size: 1.9rem;
    block-size: 1.9rem;
    overflow: hidden;
  }

  .stat-icon {
    inline-size: 1.75rem;
    block-size: 1.75rem;
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

  .stat-chip small {
    min-inline-size: 1.45rem;
    padding: 0;
    margin-inline-start: 0.04rem;
    font-size: 0.68rem;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    text-align: end;
  }

  .stat-chip small.buff {
    color: #4ade80;
  }

  .stat-chip small.nerf {
    color: #fb7185;
  }

  .stat-chip small.empty {
    visibility: hidden;
  }

  button {
    font: inherit;
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
    border-radius: 6px;
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
    position: relative;
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr);
    gap: 1rem;
    min-block-size: 0;
    padding: 1rem;
  }

  .socket-rail {
    z-index: 6;
    display: flex;
    flex-direction: column;
    gap: 0.72rem;
    min-inline-size: 0;
  }

  .socket-button {
    position: relative;
    display: grid;
    place-items: center;
    inline-size: 3.55rem;
    block-size: 3.55rem;
    padding: 0.48rem;
    color: var(--accent);
    cursor: pointer;
    background:
      linear-gradient(180deg, rgba(14, 21, 23, 0.98), rgba(5, 11, 14, 0.98)),
      radial-gradient(
        circle,
        color-mix(in srgb, var(--accent) 8%, transparent),
        transparent 64%
      );
    border: 2px solid color-mix(in srgb, var(--accent) 32%, #1c252f);
    border-radius: 8px;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.025);
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease,
      transform 150ms ease,
      background 150ms ease;
  }

  .socket-button:hover,
  .socket-button.active,
  .socket-button:focus-visible {
    border-color: color-mix(in srgb, var(--accent) 78%, white);
    box-shadow:
      0 0 1rem color-mix(in srgb, var(--accent) 24%, transparent),
      inset 0 0 1rem color-mix(in srgb, var(--accent) 16%, transparent);
    transform: translateY(-1px);
  }

  .socket-glyph,
  .module-tile,
  .detail-glyph {
    display: grid;
    place-items: center;
  }

  .socket-glyph {
    inline-size: 2.1rem;
    block-size: 2.1rem;
  }

  .socket-glyph svg {
    inline-size: 100%;
    block-size: 100%;
    opacity: 0.62;
    fill: none;
    stroke: currentColor;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .equipped-dot {
    position: absolute;
    inline-size: 0.48rem;
    block-size: 0.48rem;
    background: #4ade80;
    border-radius: 999px;
    box-shadow: 0 0 0.35rem #22c55e;
  }

  .module-drawer {
    position: absolute;
    inset-block: 1rem;
    inset-inline-start: 5.75rem;
    z-index: 5;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0.8rem;
    inline-size: 20rem;
  }

  .drawer-grid,
  .module-detail {
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(8, 16, 19, 0.97), rgba(3, 9, 12, 0.98)),
      radial-gradient(
        circle at 0 0,
        color-mix(in srgb, var(--accent) 14%, transparent),
        transparent 64%
      );
    border: 1px solid color-mix(in srgb, var(--accent) 42%, #26313e);
    border-radius: 8px;
    box-shadow: 0 16px 44px rgba(0, 0, 0, 0.46);
  }

  .drawer-grid {
    display: grid;
    gap: 0.85rem;
    padding: 0.92rem;
  }

  .drawer-title,
  .detail-kicker {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-inline-size: 0;
    font-size: 0.65rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .drawer-title span,
  .detail-kicker span {
    color: color-mix(in srgb, var(--accent) 72%, white);
  }

  .drawer-title small,
  .detail-kicker small,
  .detail-head small,
  .empty-modules span,
  .empty-detail span,
  .module-detail p {
    color: rgba(203, 214, 210, 0.72);
  }

  .module-tile-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .module-tile {
    position: relative;
    aspect-ratio: 1;
    padding: 0.52rem;
    color: var(--accent);
    cursor: pointer;
    background: rgba(5, 12, 15, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    opacity: 0.84;
    transition:
      border-color 140ms ease,
      box-shadow 140ms ease,
      opacity 140ms ease,
      transform 140ms ease;
  }

  .module-tile:hover,
  .module-tile.selected,
  .module-tile:focus-visible {
    border-color: color-mix(in srgb, var(--accent) 76%, white);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--accent) 24%, transparent),
      0 0 1rem color-mix(in srgb, var(--accent) 18%, transparent);
    opacity: 1;
    transform: translateY(-1px);
  }

  .module-tile.equipped {
    background:
      radial-gradient(
        circle,
        color-mix(in srgb, #22c55e 12%, transparent),
        transparent 62%
      ),
      rgba(5, 12, 15, 0.92);
  }

  .equipped-dot {
    inset-block-start: 0.38rem;
    inset-inline-end: 0.38rem;
    inline-size: 0.42rem;
    block-size: 0.42rem;
  }

  .empty-modules,
  .empty-detail {
    display: grid;
    gap: 0.36rem;
    place-content: center;
    justify-items: center;
    text-align: center;
  }

  .empty-modules {
    min-block-size: 8.6rem;
  }

  .empty-modules svg {
    inline-size: 1.35rem;
    block-size: 1.35rem;
    fill: none;
    stroke: rgba(203, 214, 210, 0.36);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .empty-modules strong,
  .empty-detail strong {
    font-size: 0.84rem;
  }

  .empty-modules span,
  .empty-detail span {
    max-inline-size: 13rem;
    font-size: 0.72rem;
    line-height: 1.32;
  }

  .module-detail {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    min-block-size: 0;
    padding: 1rem;
    border-color: color-mix(in srgb, var(--accent) 48%, #26313e);
  }

  .module-detail.empty {
    border-style: dashed;
  }

  .detail-body {
    display: grid;
    gap: 0.8rem;
    align-content: start;
    min-block-size: 0;
    padding-top: 0.95rem;
  }

  .detail-head {
    gap: 0.7rem;
    min-inline-size: 0;
  }

  .detail-head > div:last-child {
    display: grid;
    gap: 0.12rem;
    min-inline-size: 0;
  }

  .detail-head strong {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.98rem;
    line-height: 1.1;
    white-space: nowrap;
  }

  .detail-head small,
  .drawer-title small {
    font-size: 0.62rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .detail-glyph {
    flex: 0 0 auto;
    inline-size: 3.05rem;
    block-size: 3.05rem;
    padding: 0.42rem;
    background:
      radial-gradient(
        circle,
        color-mix(in srgb, var(--accent) 22%, transparent),
        transparent 68%
      ),
      rgba(0, 0, 0, 0.28);
    border: 2px solid color-mix(in srgb, var(--accent) 58%, white);
    border-radius: 7px;
  }

  .module-detail p {
    margin: 0;
    font-size: 0.76rem;
    line-height: 1.38;
  }

  .module-detail p.effect {
    color: color-mix(in srgb, var(--accent) 54%, white);
  }

  .tag-row {
    flex-wrap: wrap;
    gap: 0.34rem;
  }

  .tag-row span {
    padding: 0.18rem 0.42rem;
    font-size: 0.62rem;
    font-weight: 900;
    color: color-mix(in srgb, var(--accent) 78%, white);
    background: color-mix(in srgb, var(--accent) 13%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
    border-radius: 4px;
  }

  .detail-actions {
    flex-wrap: wrap;
    gap: 0.48rem;
    align-self: end;
    padding-top: 0.8rem;
    margin-top: auto;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .bay-button {
    gap: 0.36rem;
    justify-content: center;
    min-inline-size: 8.6rem;
    min-block-size: 2.2rem;
    padding: 0.45rem 0.68rem;
    font-size: 0.7rem;
    font-weight: 900;
    line-height: 1;
    color: #061015;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
    background: color-mix(in srgb, var(--accent, #f59e0b) 76%, white);
    border: 1px solid color-mix(in srgb, var(--accent, #f59e0b) 64%, white);
    border-radius: 6px;
  }

  .bay-button svg {
    flex: 0 0 auto;
    inline-size: 0.82rem;
    block-size: 0.82rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.25;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .bay-button.secondary {
    color: rgba(240, 247, 252, 0.88);
    background: rgba(255, 255, 255, 0.065);
    border-color: rgba(255, 255, 255, 0.13);
  }

  .bay-button.equipped,
  .bay-button:disabled {
    color: #4ade80;
    cursor: default;
    background: rgba(14, 40, 24, 0.95);
    border-color: rgba(34, 197, 94, 0.3);
  }

  .hero-stage {
    position: relative;
    z-index: 2;
    display: grid;
    place-items: center;
    min-inline-size: 0;
    min-block-size: 0;
    overflow: visible;
  }

  .model-port {
    inline-size: min(100%, clamp(22rem, 42vw, 31rem));
    aspect-ratio: 1;
    transition:
      transform 260ms ease,
      opacity 260ms ease;
  }

  .menu-open .model-port {
    transform: translateX(6.5rem) scale(0.82);
  }

  .drag-hint {
    position: absolute;
    inset-block-end: 1.2rem;
    font-size: 0.68rem;
    font-weight: 900;
    color: rgba(203, 214, 210, 0.34);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    pointer-events: none;
  }

  .close-button:hover,
  .close-button:focus-visible,
  .bay-button:hover,
  .bay-button:focus-visible {
    filter: brightness(1.08);
  }

  @media (max-width: 1060px) {
    .bay-layout {
      grid-template-rows: minmax(26rem, 1fr) minmax(16rem, 0.68fr);
      grid-template-columns: 4rem minmax(0, 1fr);
      overflow: auto;
    }

    .menu-open .model-port {
      transform: translateX(5rem) scale(0.76);
    }
  }

  @media (max-width: 760px) {
    .backdrop {
      align-items: stretch;
      justify-items: stretch;
      inline-size: 100dvw;
      block-size: 100dvh;
      padding: 0;
    }

    .bay {
      inline-size: 100dvw;
      max-inline-size: none;
      block-size: 100dvh;
      border-width: 0;
      border-radius: 0;
    }

    .bay-header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.58rem;
      align-items: start;
      min-block-size: auto;
      padding: 0.58rem 0.62rem;
    }

    .bay-heading {
      min-inline-size: 0;
    }

    .bay-heading strong {
      font-size: 0.98rem;
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
      overscroll-behavior-inline: contain;
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

    .stat-icon-frame {
      inline-size: 1.62rem;
      block-size: 1.62rem;
    }

    .stat-icon {
      inline-size: 1.48rem;
      block-size: 1.48rem;
    }

    .stat-chip strong {
      min-inline-size: auto;
      font-size: 0.78rem;
    }

    .bay-layout {
      display: block;
      padding: 0.65rem;
      overflow: auto;
    }

    .socket-rail {
      position: sticky;
      top: 0;
      z-index: 8;
      flex-direction: row;
      gap: 0.5rem;
      padding-bottom: 0.65rem;
      overflow-x: auto;
      scrollbar-width: none;
      background: linear-gradient(180deg, rgba(3, 8, 11, 0.98), transparent);
    }

    .socket-rail::-webkit-scrollbar {
      display: none;
    }

    .socket-button {
      flex: 0 0 auto;
      inline-size: 3.1rem;
      block-size: 3.1rem;
    }

    .module-drawer {
      position: relative;
      inset: auto;
      inline-size: 100%;
      margin-bottom: 0.65rem;
    }

    .hero-stage {
      min-block-size: 16rem;
      margin-bottom: 0.65rem;
    }

    .model-port,
    .menu-open .model-port {
      inline-size: min(16rem, 72vw);
      transform: none;
    }

    .drag-hint {
      inset-block-end: 0.2rem;
    }
  }

  @media (max-width: 420px) {
    .module-tile-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .detail-actions {
      align-items: stretch;
    }

    .bay-button {
      flex: 1 1 100%;
    }
  }
</style>
