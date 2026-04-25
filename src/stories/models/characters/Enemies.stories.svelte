<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import enemyTemplateData from "$lib/config/enemy-templates.json";
  import type { EnemyTemplate } from "$lib/config/room-templates";
  import EnemyGallery from "../../_helpers/EnemyGallery.svelte";
  import EnemyModelShowcase from "../../_helpers/EnemyModelShowcase.svelte";

  const allTemplates = enemyTemplateData as EnemyTemplate[];
  const bossIds = new Set(["iron-warden", "mine-herald", "gate-keeper"]);
  const grunts = allTemplates.filter((template) => !bossIds.has(template.id));
  const rushTemplates = grunts.filter(
    (template) => template.behavior === "rush"
  );
  const shooterTemplates = grunts.filter(
    (template) => template.behavior === "shooter"
  );
  const byId = (id: string): EnemyTemplate => {
    const template = grunts.find((entry) => entry.id === id);

    if (!template) {
      throw new Error(`Unknown enemy template: ${id}`);
    }

    return template;
  };

  const { Story } = defineMeta({
    title: "Models/Characters/Enemies",
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

<Story asChild name="All Enemies">
  <EnemyGallery columns={3} templates={grunts} title="All Enemies" />
</Story>

<Story asChild name="Rush Variants">
  <EnemyGallery columns={3} templates={rushTemplates} title="Rush Variants" />
</Story>

<Story asChild name="Shooter Variants">
  <EnemyGallery
    columns={3}
    templates={shooterTemplates}
    title="Shooter Variants"
  />
</Story>

<Story
  args={{ height: "420px", template: byId("scrap-runner") }}
  name="Scrap Runner"
/>

<Story
  args={{ height: "420px", template: byId("bolt-runner") }}
  name="Bolt Runner"
/>

<Story
  args={{
    height: "420px",
    template: byId("ember-artillery"),
  }}
  name="Ember Artillery"
/>

<Story
  args={{ height: "420px", template: byId("coil-sentry") }}
  name="Coil Sentry"
/>

<Story
  args={{ height: "420px", template: byId("slag-brute") }}
  name="Slag Brute"
/>

<Story
  args={{ height: "420px", template: byId("rail-hunter") }}
  name="Rail Hunter"
/>
