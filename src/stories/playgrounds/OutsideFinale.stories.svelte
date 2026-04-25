<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import OutsideFinaleShowcase from "../_helpers/OutsideFinaleShowcase.svelte";

  const { Story } = defineMeta({
    title: "Playgrounds/Outside Finale",
    component: OutsideFinaleShowcase,
    parameters: {
      layout: "fullscreen",
    },
  });
</script>

<Story args={{ unlocked: false }} name="Locked Entrance" />

<Story args={{ unlocked: true }} name="Unlocked Entrance" />
