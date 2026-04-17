<script lang="ts">
  import type { WeaponNodeIcon } from "$lib/config/weapon-graph";

  interface WeaponModIconProps {
    icon: WeaponNodeIcon;
    tint?: string;
  }

  let { icon, tint = "#7dd3fc" }: WeaponModIconProps = $props();
</script>

<svg viewBox="0 0 36 36" aria-hidden="true" style:--tint={tint}>
  <rect x="4" y="4" width="28" height="28" rx="8" class="shell" />

  {#if icon === "wave"}
    <path d="M8 21c3-8 7-8 10 0s7 8 10 0" class="line" />
    <circle cx="10" cy="23" r="2" class="bolt" />
    <circle cx="26" cy="13" r="2" class="bolt" />
  {:else if icon === "split"}
    <path d="M11 18h6" class="line" />
    <path d="M17 18l7-6M17 18h9M17 18l7 6" class="line" />
    <circle cx="10" cy="18" r="3" class="core" />
    <circle cx="26" cy="12" r="2" class="bolt" />
    <circle cx="27" cy="18" r="2" class="bolt" />
    <circle cx="26" cy="24" r="2" class="bolt" />
  {:else if icon === "weight"}
    <rect x="9" y="10" width="18" height="16" rx="3" class="plate" />
    <path d="M13 10v-2h10v2M13 26v2h10v-2" class="line" />
    <circle cx="14" cy="18" r="1.8" class="bolt" />
    <circle cx="22" cy="18" r="1.8" class="bolt" />
  {:else if icon === "rush"}
    <path d="M9 18h12" class="line" />
    <path d="M18 12l8 6-8 6" class="line" />
    <path d="M11 12l3 3M11 24l3-3" class="line faint" />
  {:else if icon === "pinpoint"}
    <circle cx="18" cy="18" r="7" class="ring" />
    <circle cx="18" cy="18" r="2.4" class="core" />
    <path d="M18 8v4M18 24v4M8 18h4M24 18h4" class="line" />
  {:else if icon === "profile"}
    <path d="M9 24h6l4-8 4 4h4" class="line" />
    <path d="M9 10v16h18" class="frame" />
    <circle cx="19" cy="16" r="2" class="bolt" />
  {:else if icon === "lob"}
    <path d="M10 24c4-11 10-14 16-10" class="line" />
    <path d="M24 14l2 6" class="line" />
    <circle cx="27" cy="24" r="3.2" class="core" />
    <circle cx="10" cy="24" r="2" class="bolt" />
  {/if}
</svg>

<style>
  svg {
    flex: none;
    inline-size: 2rem;
    block-size: 2rem;
  }

  .shell,
  .plate,
  .core,
  .ring,
  .line,
  .frame,
  .bolt {
    vector-effect: non-scaling-stroke;
  }

  .shell {
    fill: rgba(7, 16, 29, 0.92);
    stroke: color-mix(in srgb, var(--tint) 30%, rgba(255, 255, 255, 0.08));
  }

  .plate,
  .core {
    fill: color-mix(in srgb, var(--tint) 24%, rgba(255, 255, 255, 0.06));
    stroke: color-mix(in srgb, var(--tint) 72%, white);
    stroke-width: 1.6;
  }

  .ring,
  .line,
  .frame {
    fill: none;
    stroke: color-mix(in srgb, var(--tint) 78%, white);
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .frame {
    opacity: 0.72;
  }

  .faint {
    opacity: 0.56;
  }

  .bolt {
    fill: #f3f7fb;
    stroke: color-mix(in srgb, var(--tint) 65%, white);
    stroke-width: 1.2;
  }
</style>
