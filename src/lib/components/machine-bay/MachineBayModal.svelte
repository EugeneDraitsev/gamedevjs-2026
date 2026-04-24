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
            <strong>Installed</strong>
            <span
              >{machineStats.installedModuleIds.length}/4 active modules</span
            >
          </div>

          <div class="socket-grid">
            {#each socketViews as socket (socket.slot.id)}
              <article
                class:empty={!socket.template}
                class="socket"
                style:--accent={socket.accent}
                style:--rarity={socket.rarityAccent}
              >
                <div class="socket-label">
                  <span>{socket.slot.label}</span>
                  <small>{socket.slot.kind}</small>
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
                        <span class="rarity-label"
                          >{socket.template.rarity}</span
                        >
                        <span>{socket.template.kind}</span>
                      </small>
                    </div>
                  </div>
                  <p>{socket.template.effect}</p>
                  <div class="tag-row">
                    {#each socket.template.statLines as statLine}
                      <span>{statLine}</span>
                    {/each}
                  </div>
                  <button
                    class="secondary"
                    type="button"
                    onclick={() => onEjectModule?.(socket.slot.id)}
                  >
                    Eject
                  </button>
                {:else}
                  <div class="empty-copy">
                    <strong>Empty socket</strong>
                    <span>
                      Install a {socket.slot.kind} module from inventory.
                    </span>
                  </div>
                {/if}
              </article>
            {/each}
          </div>
        </section>

        <section class="inventory-panel" aria-label="Module inventory">
          <div class="panel-title">
            <strong>Recovered Modules</strong>
            <span>{moduleInventory.length} loose parts</span>
          </div>

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
                      <img src={getMachineModuleIconUrl(item.moduleId)} alt="">
                    </div>
                    <div>
                      <strong>{item.template.label}</strong>
                      <small class="module-meta">
                        <span class="rarity-label">{item.template.rarity}</span>
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
                        type="button"
                        onclick={() => onInstallModule?.(item.moduleId, slot.id)}
                      >
                        Install {slot.label}
                      </button>
                    {/each}
                    <button
                      class="secondary"
                      class:confirming={confirmingScrapModuleId ===
                        item.moduleId}
                      disabled={item.scrapValue <= 0}
                      type="button"
                      onclick={() => handleScrapClick(item.moduleId)}
                    >
                      {confirmingScrapModuleId === item.moduleId
                        ? `Confirm +${item.scrapValue}`
                        : `Scrap +${item.scrapValue}`}
                    </button>
                  </div>
                </article>
              {/each}
            </div>
          {/if}
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
    padding: clamp(0.45rem, 1.8vw, 1.2rem);
    background: rgba(2, 7, 13, 0.58);
    backdrop-filter: blur(14px);
  }

  .bay {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    inline-size: min(1180px, 100%);
    block-size: min(820px, calc(100vh - 2rem));
    overflow: hidden;
    color: #f2f8ff;
    background:
      linear-gradient(180deg, rgba(14, 20, 23, 0.96), rgba(4, 9, 13, 0.99)),
      repeating-linear-gradient(
        90deg,
        transparent 0 26px,
        rgba(245, 158, 11, 0.035) 26px 27px
      );
    border: 1px solid rgba(252, 211, 77, 0.22);
    border-radius: 8px;
    box-shadow: 0 24px 90px rgba(0, 0, 0, 0.42);
  }

  .bay-header,
  .module-head,
  .inventory-actions,
  .panel-title,
  .socket-label,
  .tag-row {
    display: flex;
    align-items: center;
  }

  .bay-header {
    gap: 0.75rem;
    justify-content: space-between;
    padding: 0.55rem 0.65rem;
    border-bottom: 1px solid rgba(252, 211, 77, 0.16);
  }

  .panel-title span,
  .socket-label small,
  .module-head small,
  p,
  .empty-copy span,
  .inventory-empty span {
    color: rgba(203, 214, 220, 0.74);
  }

  .machine-summary {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.38rem;
    align-items: center;
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
      linear-gradient(180deg, rgba(18, 26, 29, 0.95), rgba(6, 12, 16, 0.96)),
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--stat, #fbbf24) 18%, transparent),
        transparent
      );
    border: 1px solid
      color-mix(in srgb, var(--stat, #fbbf24) 28%, rgba(255, 255, 255, 0.1));
    border-radius: 6px;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.025);
  }

  .stat-icon {
    inline-size: 1.46rem;
    block-size: 1.46rem;
    object-fit: contain;
    filter: drop-shadow(0 0.1rem 0.12rem rgba(0, 0, 0, 0.44))
      drop-shadow(
        0 0 0.32rem color-mix(in srgb, var(--stat, #fbbf24) 36%, transparent)
      );
  }

  .stat-chip strong {
    min-inline-size: 1.55rem;
    font-size: 0.9rem;
    line-height: 1;
  }

  .gear-chip img {
    inline-size: 1.46rem;
    block-size: 1.46rem;
    filter: drop-shadow(0 0.1rem 0.12rem rgba(0, 0, 0, 0.44))
      drop-shadow(0 0 0.32rem rgba(255, 184, 77, 0.4));
  }

  button {
    min-block-size: 2.35rem;
    padding: 0.58rem 0.78rem;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 900;
    color: #061015;
    cursor: pointer;
    background: color-mix(in srgb, var(--accent, #f59e0b) 76%, white);
    border: 1px solid color-mix(in srgb, var(--accent, #f59e0b) 64%, white);
    border-radius: 6px;
  }

  button:hover,
  button:focus-visible {
    filter: brightness(1.08);
  }

  button:disabled {
    color: rgba(227, 235, 240, 0.42);
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .secondary {
    color: rgba(240, 247, 252, 0.86);
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.12);
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
    inline-size: 2.15rem;
    block-size: 2.15rem;
    min-block-size: 0;
    padding: 0;
    color: rgba(255, 235, 205, 0.9);
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
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
    grid-template-columns: minmax(0, 1.08fr) minmax(20rem, 0.92fr);
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
    justify-content: space-between;
    min-block-size: 2rem;
    margin-bottom: 0.85rem;
  }

  .panel-title strong {
    font-size: 0.95rem;
  }

  .panel-title span {
    font-size: 0.76rem;
  }

  .socket-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
    align-content: start;
    min-block-size: 0;
    padding-inline-end: 0.2rem;
    overflow: auto;
  }

  .socket,
  .inventory-item,
  .inventory-empty {
    display: grid;
    gap: 0.7rem;
    align-content: start;
    min-inline-size: 0;
    padding: 0.86rem;
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(11, 20, 25, 0.92), rgba(6, 12, 16, 0.96)),
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--accent, #f59e0b) 18%, transparent),
        transparent 34%
      ),
      repeating-linear-gradient(
        135deg,
        transparent 0 14px,
        color-mix(in srgb, var(--accent, #f59e0b) 10%, transparent) 14px 15px
      );
    border: 2px solid
      color-mix(in srgb, var(--accent, #f59e0b) 54%, rgba(255, 255, 255, 0.12));
    border-radius: 8px;
    box-shadow:
      inset 0 0 0 1px
      color-mix(in srgb, var(--accent, #f59e0b) 14%, transparent),
      0 0 1.2rem color-mix(in srgb, var(--accent, #f59e0b) 15%, transparent);
  }

  .socket {
    min-block-size: 13.6rem;
  }

  .socket.empty {
    min-block-size: 9.2rem;
    border-style: dashed;
    opacity: 0.82;
  }

  .socket-label {
    justify-content: space-between;
    min-block-size: 1.3rem;
    font-size: 0.72rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .socket-label span {
    color: color-mix(in srgb, var(--accent, #f59e0b) 74%, white);
  }

  .module-head {
    gap: 0.65rem;
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
    font-size: 0.92rem;
    line-height: 1.1;
    white-space: nowrap;
  }

  .module-head small {
    display: flex;
    flex-wrap: wrap;
    gap: 0.32rem;
    font-size: 0.68rem;
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
    inline-size: 2.7rem;
    block-size: 2.7rem;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--accent) 26%, transparent),
      rgba(255, 255, 255, 0.04)
    );
    border: 2px solid color-mix(in srgb, var(--accent) 58%, white);
    border-radius: 50%;
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--accent) 24%, transparent),
      0 0 1.1rem color-mix(in srgb, var(--accent) 34%, transparent);
  }

  .module-glyph img {
    inline-size: 3rem;
    block-size: 3rem;
    object-fit: contain;
    filter: drop-shadow(0 0.28rem 0.32rem rgba(0, 0, 0, 0.38));
  }

  p {
    min-block-size: 2.4em;
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.28;
  }

  .tag-row {
    flex-wrap: wrap;
    gap: 0.36rem;
  }

  .tag-row span {
    padding: 0.22rem 0.42rem;
    font-size: 0.68rem;
    font-weight: 900;
    color: color-mix(in srgb, var(--accent) 76%, white);
    background: color-mix(in srgb, var(--accent) 13%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
    border-radius: 999px;
  }

  .empty-copy,
  .inventory-empty {
    place-content: center;
    min-block-size: 10rem;
    text-align: center;
  }

  .empty-copy {
    display: grid;
    gap: 0.3rem;
  }

  .inventory-list {
    display: grid;
    gap: 0.75rem;
    align-content: start;
    min-block-size: 0;
    padding-inline-end: 0.2rem;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .inventory-item {
    block-size: 12.7rem;
  }

  .inventory-item p {
    min-block-size: auto;
  }

  .inventory-actions {
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  @media (max-width: 780px) {
    .bay {
      block-size: calc(100vh - 1rem);
    }

    .bay-layout {
      grid-template-columns: 1fr;
      overflow: auto;
    }

    .socket-panel {
      border-inline-end: 0;
      border-bottom: 1px solid rgba(252, 211, 77, 0.12);
    }

    .socket-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
