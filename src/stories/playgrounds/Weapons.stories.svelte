<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { weaponPlaygroundPresets } from "../_helpers/playground-scene";
  import WeaponPlayground from "../_helpers/WeaponPlayground.svelte";

  const weaponLabels: Record<string, string> = Object.fromEntries(
    weaponPlaygroundPresets.map((preset) => [preset.id, preset.label])
  );

  const { Story } = defineMeta({
    title: "Weapons/Playground",
    component: WeaponPlayground,
    parameters: {
      layout: "fullscreen",
    },
    argTypes: {
      initialWeaponId: {
        control: { labels: weaponLabels, type: "select" },
        options: weaponPlaygroundPresets.map((preset) => preset.id),
      },
    },
  });
</script>

<Story args={{ initialWeaponId: "default" }} name="Default Rivet" />

<Story args={{ initialWeaponId: "split" }} name="Split Arc" />

<Story args={{ initialWeaponId: "wave" }} name="Wave" />

<Story args={{ initialWeaponId: "lob" }} name="Lob" />

<Story args={{ initialWeaponId: "laser" }} name="Laser" />

<Story args={{ initialWeaponId: "rocket" }} name="Rocket Support" />
