<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import MachineModuleCatalog from "../../_helpers/MachineModuleCatalog.svelte";

  const { Story } = defineMeta({
    title: "Models/Items/Loadout Modules",
    component: MachineModuleCatalog,
    parameters: {
      layout: "fullscreen",
    },
  });
</script>

<Story name="Catalog By Type" />
