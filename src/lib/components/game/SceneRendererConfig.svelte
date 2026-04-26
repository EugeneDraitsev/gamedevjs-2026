<script lang="ts">
  import { useThrelte } from "@threlte/core";
  import { onDestroy, onMount } from "svelte";
  import {
    ACESFilmicToneMapping,
    Color,
    SRGBColorSpace,
    type Texture,
  } from "three";
  import {
    clearTransitionRefs,
    setTransitionRenderer,
    setTransitionScene,
  } from "$lib/debug/transition-perf";

  let {
    backgroundColor = "#050403",
    compileBeforeReady = true,
    environmentMap = null,
    exposure,
    onProgress,
    onReady,
    preloadTextures = [],
    shadowsEnabled = true,
    showEnvironmentMap = false,
    warmupTextures = [],
  }: {
    backgroundColor?: string;
    compileBeforeReady?: boolean;
    environmentMap?: Texture | null;
    exposure: number;
    onProgress?: (progress: {
      detail?: string;
      label: string;
      progress: number;
    }) => void;
    onReady?: () => void;
    preloadTextures?: Array<Texture | null>;
    shadowsEnabled?: boolean;
    showEnvironmentMap?: boolean;
    warmupTextures?: Array<Texture | null>;
  } = $props();

  const { camera, invalidate, renderer, scene } = useThrelte();
  const background = $derived(new Color(backgroundColor));
  const uploadedTextures = new WeakSet<Texture>();

  const existingTextures = (textures: Array<Texture | null>) =>
    textures.filter((texture): texture is Texture => Boolean(texture));

  const uploadTextureBatch = (
    textures: Array<Texture | null>,
    maxUploads: number
  ) => {
    let uploads = 0;

    for (const texture of textures) {
      if (!texture?.image || uploadedTextures.has(texture)) {
        continue;
      }

      renderer.initTexture(texture);
      uploadedTextures.add(texture);
      uploads += 1;

      if (uploads >= maxUploads) {
        break;
      }
    }
  };

  const hasPendingUpload = (textures: Array<Texture | null>) =>
    textures.some(
      (texture) => texture?.image && !uploadedTextures.has(texture)
    );
  const clampProgress = (value: number) => Math.max(0, Math.min(1, value));
  const emitProgress = (label: string, progress: number, detail?: string) => {
    onProgress?.({
      detail,
      label,
      progress: clampProgress(progress),
    });
  };
  const getTextureProgress = (textures: Array<Texture | null>) => {
    const total = textures.length;
    const imageReady = textures.filter((texture) => texture?.image).length;
    const uploaded = textures.filter(
      (texture) => texture && uploadedTextures.has(texture)
    ).length;

    return { imageReady, total, uploaded };
  };

  $effect(() => {
    scene.background =
      environmentMap && showEnvironmentMap ? environmentMap : background;
    scene.environment =
      environmentMap && showEnvironmentMap ? environmentMap : null;
    renderer.autoClear = true;
    renderer.autoClearColor = true;
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.shadowMap.enabled = shadowsEnabled;
    renderer.shadowMap.autoUpdate = shadowsEnabled;
    renderer.shadowMap.needsUpdate = shadowsEnabled;
    renderer.setClearColor(background, 1);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = exposure;
    setTransitionRenderer(renderer);
    setTransitionScene(scene);
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

  onDestroy(() => {
    clearTransitionRefs();
  });

  onMount(() => {
    let frame = 0;
    let ticks = 0;
    let done = false;
    let canceled = false;
    let compileStarted = false;
    let warmupTicks = 0;

    const ready = () => {
      if (!(done || canceled)) {
        done = true;
        emitProgress("Ready", 1, "Ready");
        onReady?.();
        frame = requestAnimationFrame(warmup);
      }
    };

    const warmupRender = () => {
      if (!camera.current) {
        return;
      }

      try {
        renderer.shadowMap.needsUpdate = renderer.shadowMap.enabled;
        renderer.render(scene, camera.current);
      } catch {
        // If the browser drops this one-off warmup render, the normal
        // Threlte frame loop will still render the scene.
      }
    };

    const warmup = () => {
      if (canceled) {
        return;
      }

      uploadTextureBatch(warmupTextures, 1);
      warmupTicks += 1;

      if (warmupTicks < 600 || hasPendingUpload(warmupTextures)) {
        frame = requestAnimationFrame(warmup);
      }
    };

    const preload = () => {
      const textureProgress = getTextureProgress(preloadTextures);
      const blockingTextures = existingTextures(preloadTextures);
      const blockingReady =
        textureProgress.total === 0 ||
        (blockingTextures.length === textureProgress.total &&
          blockingTextures.every(
            (texture) => texture.image && uploadedTextures.has(texture)
          ));

      uploadTextureBatch(blockingTextures, 2);

      if (camera.current && blockingReady) {
        if (!compileBeforeReady) {
          ready();
          return;
        }

        if (!compileStarted) {
          compileStarted = true;
          emitProgress("Compiling Scene", 0.92, "Compiling shaders");
          renderer
            .compileAsync(scene, camera.current)
            .catch(() => undefined)
            .finally(() =>
              requestAnimationFrame(() => {
                warmupRender();
                requestAnimationFrame(ready);
              })
            );
        }

        return;
      }

      if (textureProgress.total > 0) {
        const imageRatio = textureProgress.imageReady / textureProgress.total;
        const uploadRatio = textureProgress.uploaded / textureProgress.total;

        if (textureProgress.imageReady < textureProgress.total) {
          emitProgress(
            "Loading Textures",
            0.08 + imageRatio * 0.46,
            `Textures ${textureProgress.imageReady}/${textureProgress.total}`
          );
        } else {
          emitProgress(
            "Uploading Textures",
            0.54 + uploadRatio * 0.34,
            `GPU upload ${textureProgress.uploaded}/${textureProgress.total}`
          );
        }
      } else {
        emitProgress("Preparing Scene", 0.72, "Preparing renderer");
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
