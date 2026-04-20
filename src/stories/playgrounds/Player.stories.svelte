<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import PlayerPlayground from "../_helpers/PlayerPlayground.svelte";

  const { Story } = defineMeta({
    title: "Playgrounds/Player",
    component: PlayerPlayground,
    parameters: {
      layout: "fullscreen",
    },
  });
</script>

<Story name="Movement Sandbox" />
