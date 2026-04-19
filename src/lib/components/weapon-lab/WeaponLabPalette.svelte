<script lang="ts">
  import {
    groupTemplatesByRarity,
    modifierLimit,
  } from "$lib/components/weapon-lab/helpers";
  import WeaponModIcon from "$lib/components/weapon-lab/WeaponModIcon.svelte";
  import {
    type WeaponNodeType,
    weaponRarityColors,
  } from "$lib/config/weapon-graph";

  interface WeaponLabPaletteProps {
    availableModules: WeaponNodeType[];
    modifierCount: number;
    onAddModule: (type: WeaponNodeType) => void;
  }

  let { availableModules, modifierCount, onAddModule }: WeaponLabPaletteProps =
    $props();

  const groupedTemplates = $derived(groupTemplatesByRarity(availableModules));
</script>

<aside class="palette">
  {#if groupedTemplates.length === 0}
    <div class="palette-empty">
      <strong>No loose modules</strong>
      <span>Find treasure rooms and salvage new parts.</span>
    </div>
  {:else}
    {#each groupedTemplates as group (group.rarity)}
      <section class="rarity-group">
        <p
          class="rarity-title"
          style:--rarity={weaponRarityColors[group.rarity]}
        >
          <span></span>
          {group.rarity}
        </p>

        {#each group.items as item (item.id)}
          <button
            type="button"
            disabled={modifierCount >= modifierLimit}
            onclick={() => onAddModule(item.type)}
            style:--accent={item.template.accent}
            style:--rarity={weaponRarityColors[item.template.rarity]}
          >
            <div class="palette-head">
              <WeaponModIcon
                icon={item.template.icon}
                tint={item.template.accent}
              />
              <div class="palette-copy">
                <strong>{item.template.label}</strong>
                <small>{item.template.rarity}</small>
              </div>
            </div>
            <span>{item.template.effect}</span>
          </button>
        {/each}
      </section>
    {/each}
  {/if}
</aside>
