<script lang="ts">
  import type { MachineModuleId } from "$lib/config/machine-modules";

  interface MachineModuleGlyphProps {
    accent?: string;
    moduleId: MachineModuleId;
  }

  let { accent = "#fbbf24", moduleId }: MachineModuleGlyphProps = $props();
</script>

<svg
  class="module-glyph-svg"
  style:--accent={accent}
  viewBox="0 0 64 64"
  aria-hidden="true"
>
  {#if moduleId === "rivet-press-core"}
    <circle class="soft" cx="32" cy="32" r="22" />
    <path class="line heavy" d="M18 32h28" />
    <path class="line" d="M42 23l8 9-8 9" />
    <circle class="fill" cx="22" cy="32" r="5" />
    <circle class="fill faint" cx="32" cy="24" r="2.5" />
    <circle class="fill faint" cx="32" cy="40" r="2.5" />
  {:else if moduleId === "arc-splitter-coil"}
    <path class="line heavy" d="M14 32h13" />
    <path class="line heavy" d="M27 32l15-15" />
    <path class="line heavy" d="M27 32h22" />
    <path class="line heavy" d="M27 32l15 15" />
    <circle class="fill" cx="46" cy="17" r="4" />
    <circle class="fill" cx="51" cy="32" r="4" />
    <circle class="fill" cx="46" cy="47" r="4" />
    <circle class="soft" cx="24" cy="32" r="9" />
  {:else if moduleId === "pressure-lance-nozzle"}
    <path class="soft stroke" d="M16 25h20l12 7-12 7H16z" />
    <path class="line heavy" d="M36 32h17" />
    <path class="line" d="M15 22v20" />
    <path class="line" d="M22 25v14" />
  {:else if moduleId === "boiler-plate-frame"}
    <path
      class="soft stroke"
      d="M32 11l18 8v12c0 11-7 18-18 22-11-4-18-11-18-22V19z"
    />
    <path class="line heavy" d="M20 27h24" />
    <path class="line heavy" d="M22 37h20" />
    <path class="line" d="M32 16v34" />
  {:else if moduleId === "gyro-servo-frame"}
    <circle class="soft stroke" cx="32" cy="32" r="20" />
    <circle class="fill" cx="32" cy="32" r="5" />
    <path class="line heavy" d="M32 12v9" />
    <path class="line heavy" d="M32 43v9" />
    <path class="line heavy" d="M12 32h9" />
    <path class="line heavy" d="M43 32h9" />
    <path class="line" d="M22 22l20 20" />
  {:else if moduleId === "ammo-hopper"}
    <path class="soft stroke" d="M18 14h28l-5 22H23z" />
    <path class="fill" d="M26 36h12v12H26z" />
    <path class="line" d="M24 21h16" />
    <path class="line" d="M23 28h18" />
  {:else if moduleId === "overclock-governor"}
    <circle class="soft stroke" cx="32" cy="34" r="19" />
    <path class="line" d="M20 34a12 12 0 0 1 24 0" />
    <path class="fill" d="M34 12 23 35h8l-2 17 12-25h-8z" />
  {:else if moduleId === "salvage-magnet"}
    <path class="line heavy" d="M19 18v17c0 8 5 13 13 13s13-5 13-13V18" />
    <path class="line heavy" d="M19 18h10" />
    <path class="line heavy" d="M35 18h10" />
    <path class="fill" d="M16 13h15v9H16z" />
    <path class="fill" d="M33 13h15v9H33z" />
  {:else if moduleId === "parry-reflector"}
    <path class="soft stroke" d="M38 10 48 20 28 43l-11 5 5-11z" />
    <path class="line heavy" d="M21 43 15 49" />
    <path class="line heavy" d="M15 38l11 11" />
    <path class="fill faint" d="M38 15 43 20 34 27 31 24z" />
  {:else if moduleId === "cleaver-axe-head"}
    <path class="line heavy" d="M23 50 41 18" />
    <path class="line" d="M20 45l10 6" />
    <path class="soft stroke" d="M35 13h12l6 9-7 13H34l5-11z" />
    <path class="line heavy" d="M33 28h18" />
    <path class="fill faint" d="M16 13h10l7 7-8 8-9-6z" />
  {/if}
</svg>

<style>
  .module-glyph-svg {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    overflow: visible;
    color: var(--accent);
    filter: drop-shadow(0 0.18rem 0.35rem rgba(0, 0, 0, 0.38));
  }

  .line,
  .stroke {
    fill: none;
    stroke: currentColor;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .line.heavy {
    stroke-width: 5;
  }

  .soft {
    fill: color-mix(in srgb, currentColor 18%, transparent);
  }

  .soft.stroke {
    fill: color-mix(in srgb, currentColor 13%, transparent);
  }

  .fill {
    fill: currentColor;
  }

  .faint {
    opacity: 0.72;
  }
</style>
