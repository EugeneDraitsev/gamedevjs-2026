<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import WaterDebugRoom from "../_helpers/WaterDebugRoom.svelte";

  const { Story } = defineMeta({
    title: "Playgrounds/Water",
    component: WaterDebugRoom,
    parameters: {
      layout: "fullscreen",
    },
  });
</script>

<Story name="Dungeon Channel" />
