<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import SceneLoadingOverlay from "$lib/components/app/SceneLoadingOverlay.svelte";

  const { Story } = defineMeta({
    title: "UI/Loading Overlay",
    component: SceneLoadingOverlay,
    parameters: {
      layout: "fullscreen",
    },
    argTypes: {
      label: {
        control: "text",
      },
    },
  });
</script>

<Story args={{ active: true, label: "Loading" }} name="Default" />
