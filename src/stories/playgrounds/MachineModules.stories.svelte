<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import MachineModulePlayground from "../_helpers/MachineModulePlayground.svelte";

  const { Story } = defineMeta({
    title: "Playgrounds/Loadout Modules",
    component: MachineModulePlayground,
    parameters: {
      layout: "fullscreen",
    },
  });
</script>

<Story name="Try-On Playground" />
