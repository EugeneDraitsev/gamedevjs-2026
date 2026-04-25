<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import SoundboardPlayground from "../_helpers/SoundboardPlayground.svelte";

  const { Story } = defineMeta({
    title: "Playgrounds/Soundboard",
    component: SoundboardPlayground,
    parameters: {
      layout: "fullscreen",
    },
  });
</script>

<Story name="All Sounds" />
