<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import enemyTemplateData from "$lib/config/enemy-templates.json";
  import type { EnemyTemplate } from "$lib/config/room-templates";
  import EnemyGallery from "../_helpers/EnemyGallery.svelte";
  import EnemyModelShowcase from "../_helpers/EnemyModelShowcase.svelte";

  const allTemplates = enemyTemplateData as EnemyTemplate[];
  const bossIds = new Set(["iron-warden", "mine-herald"]);
  const bosses = allTemplates.filter((template) => bossIds.has(template.id));
  const byId = (id: string): EnemyTemplate => {
    const template = bosses.find((entry) => entry.id === id);

    if (!template) {
      throw new Error(`Unknown boss template: ${id}`);
    }

    return template;
  };

  const { Story } = defineMeta({
    title: "Models/Bosses",
    component: EnemyModelShowcase,
    parameters: {
      layout: "fullscreen",
    },
    argTypes: {
      autoRotate: { control: "boolean" },
      height: { control: "text" },
      template: { control: false },
    },
  });
</script>

<Story asChild name="All Bosses">
  <EnemyGallery columns={2} templates={bosses} title="Bosses" />
</Story>

<Story
  args={{ height: "520px", template: byId("iron-warden") }}
  name="Iron Warden"
/>

<Story
  args={{
    height: "520px",
    template: byId("mine-herald"),
  }}
  name="Mine Herald"
/>
