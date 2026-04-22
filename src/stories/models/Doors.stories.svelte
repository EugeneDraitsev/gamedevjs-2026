<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import DoorShowcase from "../_helpers/DoorShowcase.svelte";

  const { Story } = defineMeta({
    title: "Models/Doors",
    component: DoorShowcase,
    parameters: {
      layout: "fullscreen",
    },
    argTypes: {
      doorOpenAmount: {
        control: { max: 1, min: 0, step: 0.02, type: "range" },
      },
      height: { control: "text" },
    },
  });
</script>

<Story args={{ doorOpenAmount: 0, height: "520px" }} name="Closed" />

<Story args={{ doorOpenAmount: 0.5, height: "520px" }} name="Half Open" />

<Story args={{ doorOpenAmount: 1, height: "520px" }} name="Open" />
