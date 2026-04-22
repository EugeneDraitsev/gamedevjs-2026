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
    onReady,
    preloadTextures = [],
    showEnvironmentMap = false,
  }: {
    environmentMap?: Texture | null;
    exposure: number;
    onReady?: () => void;
    preloadTextures?: Array<Texture | null>;
    showEnvironmentMap?: boolean;
  } = $props();

  const { camera, invalidate, renderer, scene } = useThrelte();
  const background = new Color("#050403");

  $effect(() => {
    scene.background =
      environmentMap && showEnvironmentMap ? environmentMap : background;
    scene.environment =
      environmentMap && showEnvironmentMap ? environmentMap : null;
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

  $effect(() => {
    let frame = 0;
    let ticks = 0;
    let done = false;
    let canceled = false;
    const ready = () => {
      if (!(done || canceled)) {
        done = true;
        onReady?.();
      }
    };

    const preload = () => {
      for (const texture of preloadTextures) {
        if (texture?.image) {
          renderer.initTexture(texture);
        }
      }

      if (
        camera.current &&
        preloadTextures.some(Boolean) &&
        preloadTextures.every((texture) => !texture || texture.image)
      ) {
        renderer
          .compileAsync(scene, camera.current)
          .catch(() => undefined)
          .finally(() =>
            requestAnimationFrame(() => requestAnimationFrame(ready))
          );
        return;
      }

      ticks += 1;

      if (ticks < 240) {
        frame = requestAnimationFrame(preload);
      } else {
        ready();
      }
    };

    frame = requestAnimationFrame(preload);

    return () => {
      canceled = true;
      cancelAnimationFrame(frame);
    };
  });
</script>
