<script lang="ts">
  import {
    createPreviewPaths,
    getDistanceBandLabel,
  } from "$lib/components/weapon-lab/helpers";
  import type { WeaponBuild } from "$lib/config/weapon-graph";

  interface WeaponLabPreviewProps {
    preview: WeaponBuild;
  }

  let { preview }: WeaponLabPreviewProps = $props();

  const previewPaths = $derived.by(() => createPreviewPaths(preview));
</script>

<aside class="preview">
  <section class="preview-card">
    <div class="preview-head">
      <strong>Current Attack</strong>
      <span
        >{preview.supportLabel ? `${preview.patternLabel} - ${preview.supportLabel}` : preview.patternLabel}</span
      >
    </div>

    <svg viewBox="0 0 256 168" aria-label="Attack preview">
      <title>Attack preview</title>
      <rect x="0" y="0" width="256" height="168" rx="18" />

      {#each previewPaths as path}
        <polyline
          points={path.path}
          fill="none"
          stroke={preview.colors.shell}
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="4"
        />
        {#if preview.attackMode === "beam"}
          <rect
            x={path.endX - 4}
            y={path.endY - 6}
            width="8"
            height="12"
            rx="3"
            fill={preview.colors.core}
            opacity="0.9"
          />
        {:else}
          <circle
            cx={path.endX}
            cy={path.endY}
            r={6 + preview.massFactor * 1.8}
            fill={preview.colors.core}
            stroke={preview.colors.shell}
            stroke-width="2"
          />
        {/if}
      {/each}
    </svg>

    <div class="stat-grid">
      <div>
        <span>Damage</span><strong>x{preview.damageFactor.toFixed(2)}</strong>
      </div>
      <div>
        <span>Speed</span><strong>x{preview.speedFactor.toFixed(2)}</strong>
      </div>
      <div>
        <span>Mass</span><strong>x{preview.massFactor.toFixed(2)}</strong>
      </div>
      <div>
        <span>Range</span><strong>x{preview.rangeFactor.toFixed(2)}</strong>
      </div>
      <div><span>Balls</span><strong>{preview.pelletCount}</strong></div>
      <div>
        <span>Mods</span><strong>{preview.connectedModifierCount}</strong>
      </div>
    </div>

    <div class="damage-bands">
      {#each preview.damageProfile as band, index}
        <div>
          <span>{getDistanceBandLabel(index)}</span>
          <div class="bar">
            <div
              class="fill"
              style:width={`${Math.round((band / 2.4) * 100)}%`}
            ></div>
          </div>
        </div>
      {/each}
    </div>

    <div class="meta">
      <div class="gradient" style:background={preview.colors.gradient}></div>
      <span>{preview.damageProfileLabel}</span>
    </div>
  </section>
</aside>
