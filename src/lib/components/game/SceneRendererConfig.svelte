<script lang="ts">
  import { useThrelte } from "@threlte/core";
  import { ACESFilmicToneMapping, Color, SRGBColorSpace } from "three";

  let {
    backgroundColor = "#050403",
    exposure,
  }: { backgroundColor?: string; exposure: number } = $props();

  const { invalidate, renderer, scene } = useThrelte();
  const background = $derived(new Color(backgroundColor));

  $effect(() => {
    scene.background = background;
    renderer.autoClear = true;
    renderer.autoClearColor = true;
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setClearColor(background, 1);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = exposure;
    invalidate();

    return () => {
      if (scene.background === background) {
        scene.background = null;
      }
    };
  });
</script>
