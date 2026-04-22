<script lang="ts">
  import { useThrelte } from "@threlte/core";
  import {
    ACESFilmicToneMapping,
    Color,
    SRGBColorSpace,
    type Texture,
  } from "three";

  let {
    environmentMap = null,
    exposure,
    showEnvironmentMap = false,
  }: {
    environmentMap?: Texture | null;
    exposure: number;
    showEnvironmentMap?: boolean;
  } = $props();

  const { invalidate, renderer, scene } = useThrelte();
  const background = new Color("#050403");

  $effect(() => {
    scene.background =
      environmentMap && showEnvironmentMap ? environmentMap : background;
    scene.environment = environmentMap;
    renderer.autoClear = true;
    renderer.autoClearColor = true;
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setClearColor(background, 1);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = exposure;
    invalidate();

    return () => {
      if (
        scene.background === background ||
        scene.background === environmentMap
      ) {
        scene.background = null;
      }

      if (scene.environment === environmentMap) {
        scene.environment = null;
      }
    };
  });
</script>
