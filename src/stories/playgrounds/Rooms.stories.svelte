<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { roomTemplates } from "$lib/config/room-templates";
  import RoomPlayground from "../_helpers/RoomPlayground.svelte";

  const roomLabels: Record<string, string> = Object.fromEntries(
    roomTemplates.map((template) => [
      template.id,
      `${template.kind} / ${template.layout}`,
    ])
  );

  const { Story } = defineMeta({
    title: "Playgrounds/Rooms",
    component: RoomPlayground,
    parameters: {
      layout: "fullscreen",
    },
    argTypes: {
      initialTemplateId: {
        control: { labels: roomLabels, type: "select" },
        options: roomTemplates.map((template) => template.id),
      },
    },
  });
</script>

<Story args={{ initialTemplateId: "normal-furnace" }} name="Room Selector" />

<Story args={{ initialTemplateId: "polygon-training" }} name="Polygon" />

<Story args={{ initialTemplateId: "normal-line" }} name="Chamber" />

<Story args={{ initialTemplateId: "normal-lava-lane" }} name="Lava Lane" />

<Story args={{ initialTemplateId: "normal-catwalk" }} name="Catwalk" />

<Story args={{ initialTemplateId: "normal-blocks" }} name="Forgeyard" />

<Story args={{ initialTemplateId: "normal-hexes" }} name="Hex Relay" />

<Story args={{ initialTemplateId: "treasure-artifact" }} name="Treasure" />

<Story args={{ initialTemplateId: "boss-warden" }} name="Boss Foundry" />

<Story args={{ initialTemplateId: "boss-bomber" }} name="Mine Garden" />

<Story args={{ initialTemplateId: "shop-empty" }} name="Shop" />

<Story args={{ initialTemplateId: "secret-empty" }} name="Secret" />
