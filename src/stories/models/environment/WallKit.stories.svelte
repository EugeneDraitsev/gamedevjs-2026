<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import WallKitShowcase from "../../_helpers/WallKitShowcase.svelte";

  const { Story } = defineMeta({
    title: "Models/Environment/Wall Kit",
    component: WallKitShowcase,
    parameters: {
      layout: "fullscreen",
    },
    argTypes: {
      height: { control: "text" },
      mode: {
        control: "select",
        options: ["assembled", "modules", "pieces"],
      },
    },
  });
</script>

<Story args={{ height: "620px", mode: "assembled" }} name="Assembled Wall" />

<Story args={{ height: "620px", mode: "modules" }} name="Modules" />

<Story args={{ height: "620px", mode: "pieces" }} name="Pieces" />
