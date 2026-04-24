<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import MachineBayShowcase from "../_helpers/MachineBayShowcase.svelte";

  const { Story } = defineMeta({
    title: "UI/Machine Bay",
    component: MachineBayShowcase,
    parameters: {
      layout: "fullscreen",
    },
    argTypes: {
      gearCount: { control: { type: "range", min: 0, max: 99, step: 1 } },
      variant: {
        control: "select",
        options: ["starter", "inventory", "five-installed"],
      },
    },
  });
</script>

<Story
  args={{ gearCount: 2, variant: "starter" }}
  name="Starter Empty Inventory"
/>

<Story args={{ gearCount: 8, variant: "inventory" }} name="Recovered Modules" />

<Story
  args={{ gearCount: 14, variant: "five-installed" }}
  name="Five Installed"
/>
