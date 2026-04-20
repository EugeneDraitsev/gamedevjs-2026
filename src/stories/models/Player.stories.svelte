<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import PlayerModelShowcase from "../_helpers/PlayerModelShowcase.svelte";

  const { Story } = defineMeta({
    title: "Models/Player",
    component: PlayerModelShowcase,
    parameters: {
      layout: "padded",
    },
    argTypes: {
      autoRotate: { control: "boolean" },
      hitFlash: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
      label: { control: "text" },
      scale: { control: { type: "range", min: 0.4, max: 2, step: 0.05 } },
    },
  });
</script>

<Story args={{ scale: 0.9 }} name="Orb Knight" />

<Story args={{ scale: 0.9, hitFlash: 0.8 }} name="Orb Knight (Hit Flash)" />

<Story
  args={{ scale: 1.6, autoRotate: true, label: "Orb Knight (Hero Pose)" }}
  name="Hero Pose"
/>
