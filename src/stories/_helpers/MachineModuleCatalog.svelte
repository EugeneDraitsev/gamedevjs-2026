<script lang="ts">
  import MachineModuleGlyph from "$lib/components/machine-bay/MachineModuleGlyph.svelte";
  import {
    getMachineModuleKindAccent,
    getMachineModuleRarityAccent,
    type MachineModuleKind,
    machineModuleTemplates,
  } from "$lib/config/machine-modules";

  const kindLabels = {
    attack: "Eye Modules",
    body: "Body Modules",
    sword: "Weapon Modules",
    utility: "Utility Modules",
  } satisfies Record<MachineModuleKind, string>;

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
</script>

<main class="catalog-shell">
  <header>
    <span>Loadout Module Catalog</span>
    <strong>Readable socket parts</strong>
  </header>

  <div class="catalog-groups">
    {#each groupedModules as group (group.kind)}
      <section class="module-group" style:--accent={group.accent}>
        <h2>
          <span></span>
          {group.label}
        </h2>

        <div class="module-grid">
          {#each group.items as module (module.id)}
            <article
              class="module-card"
              style:--accent={module.accent}
              style:--rarity={getMachineModuleRarityAccent(module.rarity)}
            >
              <div class="module-glyph-frame" aria-hidden="true">
                <MachineModuleGlyph
                  accent={module.accent}
                  moduleId={module.id}
                />
              </div>

              <div class="module-copy">
                <div>
                  <strong>{module.label}</strong>
                  <small>{module.rarity}</small>
                </div>
                <p>{module.effect}</p>
                <div class="tag-row">
                  {#each module.statLines as statLine}
                    <span>{statLine}</span>
                  {/each}
                </div>
              </div>
            </article>
          {/each}
        </div>
      </section>
    {/each}
  </div>
</main>

<style>
  .catalog-shell {
    box-sizing: border-box;
    min-block-size: 100vh;
    padding: clamp(1rem, 3vw, 2.4rem);
    font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
    color: #f3f8f7;
    background:
      radial-gradient(
        circle at 50% 0,
        rgba(71, 190, 191, 0.14),
        transparent 30%
      ),
      linear-gradient(180deg, #101413, #03080b 70%);
  }

  .catalog-shell *,
  .catalog-shell *::before,
  .catalog-shell *::after {
    box-sizing: inherit;
  }

  header {
    display: grid;
    gap: 0.2rem;
    max-inline-size: 76rem;
    padding-bottom: 0.8rem;
    margin: 0 auto 1.4rem;
    border-bottom: 1px solid rgba(255, 221, 139, 0.16);
  }

  header span {
    font-size: 0.72rem;
    font-weight: 900;
    color: rgba(203, 214, 210, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.16em;
  }

  header strong {
    font-size: clamp(1.35rem, 3vw, 2.2rem);
    line-height: 1;
    letter-spacing: 0.02em;
  }

  .catalog-groups {
    display: grid;
    gap: 1.35rem;
    max-inline-size: 76rem;
    margin: 0 auto;
  }

  .module-group {
    display: grid;
    gap: 0.7rem;
  }

  h2 {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin: 0;
    font-size: 0.82rem;
    color: color-mix(in srgb, var(--accent) 70%, white);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  h2 span {
    inline-size: 0.58rem;
    block-size: 0.58rem;
    background: var(--accent);
    border-radius: 999px;
    box-shadow: 0 0 0.55rem color-mix(in srgb, var(--accent) 45%, transparent);
  }

  .module-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 21rem), 1fr));
    gap: 0.8rem;
  }

  .module-card {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.82rem;
    align-items: start;
    min-block-size: 8.35rem;
    padding: 0.9rem;
    background:
      linear-gradient(180deg, rgba(13, 22, 23, 0.96), rgba(5, 12, 15, 0.98)),
      linear-gradient(
        110deg,
        color-mix(in srgb, var(--accent) 16%, transparent),
        transparent 45%
      );
    border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    border-radius: 8px;
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--accent) 10%, transparent),
      0 0 1.2rem color-mix(in srgb, var(--accent) 9%, transparent);
  }

  .module-glyph-frame {
    display: grid;
    place-items: center;
    align-self: start;
    inline-size: 4.4rem;
    block-size: 4.4rem;
    padding: 0.54rem;
    background:
      radial-gradient(
        circle,
        color-mix(in srgb, var(--accent) 24%, transparent),
        transparent 68%
      ),
      rgba(0, 0, 0, 0.24);
    border: 2px solid color-mix(in srgb, var(--accent) 58%, white);
    border-radius: 8px;
  }

  .module-copy {
    display: grid;
    gap: 0.58rem;
    min-inline-size: 0;
    min-block-size: 100%;
  }

  .module-copy > div {
    display: flex;
    flex-wrap: wrap;
    gap: 0.18rem 0.5rem;
    align-items: baseline;
    justify-content: space-between;
  }

  .module-copy strong {
    font-size: 0.95rem;
    line-height: 1.1;
    overflow-wrap: anywhere;
  }

  .module-copy small {
    flex: none;
    font-size: 0.62rem;
    font-weight: 900;
    color: color-mix(in srgb, var(--rarity) 82%, white);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  p {
    margin: 0;
    font-size: 0.76rem;
    line-height: 1.35;
    color: rgba(203, 214, 210, 0.72);
  }

  .tag-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.2rem), 1fr));
    gap: 0.34rem;
    align-self: end;
  }

  .tag-row span {
    min-inline-size: 0;
    padding: 0.16rem 0.42rem;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.62rem;
    font-weight: 900;
    color: color-mix(in srgb, var(--accent) 78%, white);
    background: color-mix(in srgb, var(--accent) 13%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
    border-radius: 4px;
  }

  @media (max-width: 540px) {
    .module-card {
      gap: 0.7rem;
      padding: 0.78rem;
    }

    .module-glyph-frame {
      inline-size: 3.6rem;
      block-size: 3.6rem;
      padding: 0.45rem;
    }
  }
</style>
