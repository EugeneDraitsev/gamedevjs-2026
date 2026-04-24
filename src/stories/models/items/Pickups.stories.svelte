<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import PickupShowcase from "../../_helpers/PickupShowcase.svelte";

  const { Story } = defineMeta({
    title: "Models/Items/Pickups",
    component: PickupShowcase,
    parameters: {
      layout: "fullscreen",
    },
    argTypes: {
      height: { control: "text" },
    },
  });
</script>

<Story args={{ height: "420px", label: "All Pickups" }} name="All Pickups" />

<Story
  args={{ height: "420px", kind: "gear", label: "Gear Pickup" }}
  name="Gear"
/>

<Story
  args={{ height: "420px", kind: "heal", label: "Heal Pickup" }}
  name="Heal"
/>
