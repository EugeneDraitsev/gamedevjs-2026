<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import CombatPlayground from "../_helpers/CombatPlayground.svelte";
  import { combatPresets } from "../_helpers/playground-scene";

  const presetLabels: Record<string, string> = Object.fromEntries(
    combatPresets.map((preset) => [preset.id, preset.label])
  );

  const { Story } = defineMeta({
    title: "Playgrounds/Combat",
    component: CombatPlayground,
    parameters: {
      layout: "fullscreen",
    },
    argTypes: {
      initialPresetId: {
        control: { labels: presetLabels, type: "select" },
        options: combatPresets.map((preset) => preset.id),
      },
    },
  });
</script>

<Story args={{ initialPresetId: "scrap-runner" }} name="Scrap Runner — Line" />

<Story args={{ initialPresetId: "bolt-runner" }} name="Bolt Runner — Pincer" />

<Story
  args={{ initialPresetId: "coil-sentry" }}
  name="Coil Sentry — Crossfire"
/>

<Story
  args={{ initialPresetId: "ember-artillery" }}
  name="Ember Artillery — Arc"
/>

<Story args={{ initialPresetId: "slag-brute" }} name="Slag Brute — Foundry" />

<Story args={{ initialPresetId: "rail-hunter" }} name="Rail Hunter — Relay" />

<Story args={{ initialPresetId: "iron-warden" }} name="Boss — Iron Warden" />

<Story args={{ initialPresetId: "mine-herald" }} name="Boss — Mine Herald" />
