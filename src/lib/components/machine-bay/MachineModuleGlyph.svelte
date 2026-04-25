<script lang="ts">
  import { getMachineModuleIconUrl } from "$lib/config/machine-module-icons";
  import type { MachineModuleId } from "$lib/config/machine-modules";

  interface MachineModuleGlyphProps {
    accent?: string;
    moduleId: MachineModuleId;
  }

  let { accent = "#fbbf24", moduleId }: MachineModuleGlyphProps = $props();

  const iconUrl = $derived(getMachineModuleIconUrl(moduleId));
</script>

<img
  class="module-glyph-img"
  style:--accent={accent}
  src={iconUrl}
  alt=""
  aria-hidden="true"
  draggable="false"
>

<style>
  .module-glyph-img {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    pointer-events: none;
    user-select: none;
    object-fit: contain;
    filter: drop-shadow(0 0.16rem 0.32rem rgba(0, 0, 0, 0.48))
      drop-shadow(
        0 0 0.46rem color-mix(in srgb, var(--accent) 28%, transparent)
      );
  }
</style>
