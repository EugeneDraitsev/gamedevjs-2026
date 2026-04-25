<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import EndDemoModalShowcase from "../_helpers/EndDemoModalShowcase.svelte";

  const { Story } = defineMeta({
    title: "UI/End Demo Modal",
    component: EndDemoModalShowcase,
    parameters: {
      layout: "fullscreen",
    },
    argTypes: {
      startIndex: {
        control: { max: 2, min: 0, step: 1, type: "range" },
      },
    },
  });
</script>

<Story
  args={{
    open: true,
    startIndex: 0,
  }}
  name="Comic Carousel"
/>
