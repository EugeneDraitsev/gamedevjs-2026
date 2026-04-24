<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import BossExitShowcase from "../../_helpers/BossExitShowcase.svelte";

  const { Story } = defineMeta({
    title: "Models/Environment/Boss Exit",
    component: BossExitShowcase,
    parameters: {
      layout: "fullscreen",
    },
    argTypes: {
      height: { control: "text" },
    },
  });
</script>

<Story args={{ height: "720px" }} name="Banner Portal Reveal" />
