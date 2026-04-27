<script lang="ts">
  import { useThrelte } from "@threlte/core";
  import { onDestroy, onMount, tick } from "svelte";
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
  import {
    type BossShaderWarmupTextures,
    createBossShaderWarmupBundle,
  } from "$lib/game/renderer-shader-warmup";
  import {
    createWarmupStabilityTracker,
    type WarmupView,
  } from "$lib/game/renderer-warmup";

  interface WarmupRenderResult {
    duration: number;
    newPrograms: number;
  }

  let {
    backgroundColor = "#050403",
    compileBeforeReady = true,
    compileViews = [],
    environmentMap = null,
    exposure,
    onProgress,
    onReady,
    onWarmupStart,
    preloadTextures = [],
    shadowsEnabled = true,
    shaderWarmupTextures = {},
    showEnvironmentMap = false,
    warmupCatalogRenderPasses = 6,
    warmupCleanRenderCycles = 1,
    warmupMaxRenderPasses = 30,
    warmupMinRenderPasses = 6,
    warmupReady = true,
    warmupTextures = [],
    warmupStableFrameMs = 20,
    warmupStableRenderPasses = 3,
    warmupViews = [],
  }: {
    backgroundColor?: string;
    compileBeforeReady?: boolean;
    compileViews?: WarmupView[];
    environmentMap?: Texture | null;
    exposure: number;
    onProgress?: (progress: {
      detail?: string;
      label: string;
      progress: number;
    }) => void;
    onReady?: () => void;
    onWarmupStart?: () => void;
    preloadTextures?: Array<Texture | null>;
    shadowsEnabled?: boolean;
    shaderWarmupTextures?: BossShaderWarmupTextures;
    showEnvironmentMap?: boolean;
    warmupCatalogRenderPasses?: number;
    warmupCleanRenderCycles?: number;
    warmupMaxRenderPasses?: number;
    warmupMinRenderPasses?: number;
    warmupReady?: boolean;
    warmupStableFrameMs?: number;
    warmupStableRenderPasses?: number;
    warmupTextures?: Array<Texture | null>;
    warmupViews?: WarmupView[];
  } = $props();

  const { camera, invalidate, renderer, scene } = useThrelte();
  const background = $derived(new Color(backgroundColor));
  const uploadedTextures = new WeakSet<Texture>();

  const rendererProgramKeys = () =>
    new Set(
      renderer.info.programs?.map(
        (program) =>
          (program as unknown as { cacheKey?: string }).cacheKey ??
          `${program.name}:${program.id}`
      ) ?? []
    );

  const countNewProgramKeys = (before: Set<string>, after: Set<string>) => {
    let count = 0;

    for (const key of after) {
      if (!before.has(key)) {
        count += 1;
      }
    }

    return count;
  };

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
  const blockingTexturesReady = (textures: Texture[], total: number) =>
    total === 0 ||
    (textures.length === total &&
      textures.every(
        (texture) => texture.image && uploadedTextures.has(texture)
      ));
  const emitTextureProgress = (progress: {
    imageReady: number;
    total: number;
    uploaded: number;
  }) => {
    if (progress.total === 0) {
      emitProgress("Preparing Scene", 0.72, "Preparing renderer");
      return;
    }

    const imageRatio = progress.imageReady / progress.total;
    const uploadRatio = progress.uploaded / progress.total;

    if (progress.imageReady < progress.total) {
      emitProgress(
        "Loading Textures",
        0.08 + imageRatio * 0.46,
        `Textures ${progress.imageReady}/${progress.total}`
      );
      return;
    }

    emitProgress(
      "Uploading Textures",
      0.54 + uploadRatio * 0.34,
      `GPU upload ${progress.uploaded}/${progress.total}`
    );
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
    let readyWarmupStarted = false;
    let warmupTicks = 0;
    let bossShaderWarmup = null as ReturnType<
      typeof createBossShaderWarmupBundle
    > | null;
    let bossShaderWarmupDone = false;
    let readyWarmupTracker = null as ReturnType<
      typeof createWarmupStabilityTracker
    > | null;

    const ready = () => {
      if (!(done || canceled)) {
        done = true;
        emitProgress("Ready", 1, "Ready");
        onReady?.();
        frame = requestAnimationFrame(warmup);
      }
    };

    const warmupRender = (
      view: WarmupView | null = null
    ): WarmupRenderResult => {
      if (!camera.current) {
        return { duration: 0, newPrograms: 0 };
      }

      const startedAt = performance.now();
      const activeCamera = camera.current;
      const originalPosition = view ? activeCamera.position.clone() : null;
      const originalQuaternion = view ? activeCamera.quaternion.clone() : null;
      const beforePrograms = rendererProgramKeys();

      try {
        if (view) {
          activeCamera.position.set(...view.position);
          activeCamera.lookAt(...view.target);
          activeCamera.updateMatrixWorld();
        }

        renderer.shadowMap.needsUpdate = renderer.shadowMap.enabled;
        renderer.render(scene, activeCamera);
      } catch {
        // If the browser drops this one-off warmup render, the normal
        // Threlte frame loop will still render the scene.
      } finally {
        if (originalPosition && originalQuaternion) {
          activeCamera.position.copy(originalPosition);
          activeCamera.quaternion.copy(originalQuaternion);
          activeCamera.updateMatrixWorld();
        }
      }

      const duration = performance.now() - startedAt;
      const newPrograms = countNewProgramKeys(
        beforePrograms,
        rendererProgramKeys()
      );

      return { duration, newPrograms };
    };
    const compileWarmupView = (view: WarmupView) => {
      if (!camera.current) {
        return 0;
      }

      const startedAt = performance.now();
      const activeCamera = camera.current;
      const originalPosition = activeCamera.position.clone();
      const originalQuaternion = activeCamera.quaternion.clone();

      try {
        activeCamera.position.set(...view.position);
        activeCamera.lookAt(...view.target);
        activeCamera.updateMatrixWorld();
        renderer.compile(scene, activeCamera);
      } catch {
        // Best effort only. The normal warmup render path still runs after this.
      } finally {
        activeCamera.position.copy(originalPosition);
        activeCamera.quaternion.copy(originalQuaternion);
        activeCamera.updateMatrixWorld();
      }

      return performance.now() - startedAt;
    };
    const warmupBossShaderRig = () => {
      if (bossShaderWarmupDone || !shadowsEnabled) {
        return 0;
      }

      bossShaderWarmupDone = true;
      bossShaderWarmup ??= createBossShaderWarmupBundle(
        shaderWarmupTextures,
        backgroundColor
      );

      return bossShaderWarmup.render(renderer);
    };

    const maxWarmupPasses = () =>
      Math.max(1, Math.floor(warmupMaxRenderPasses));
    const minWarmupPasses = () =>
      Math.min(
        maxWarmupPasses(),
        Math.max(1, Math.floor(warmupMinRenderPasses))
      );
    const stableWarmupPasses = () =>
      Math.max(1, Math.floor(warmupStableRenderPasses));
    const warmupProgress = (pass: number) =>
      0.92 + Math.min(0.075, (pass / maxWarmupPasses()) * 0.075);
    const catalogWarmupPasses = () =>
      Math.max(0, Math.floor(warmupCatalogRenderPasses));
    const catalogWarmupProgress = (pass: number) =>
      0.88 + Math.min(0.04, (pass / Math.max(1, catalogWarmupPasses())) * 0.04);
    const compileWarmupProgress = (pass: number) =>
      0.86 + Math.min(0.02, (pass / Math.max(1, compileViews.length)) * 0.02);
    const warmupViewCount = () => Math.max(1, warmupViews.length);
    const getWarmupViewIndex = (pass: number) =>
      warmupViews.length > 0 ? pass % warmupViews.length : 0;
    const getWarmupView = (pass: number) =>
      warmupViews.length > 0 ? warmupViews[getWarmupViewIndex(pass)] : null;
    const createReadyWarmupTracker = () =>
      createWarmupStabilityTracker({
        maxPasses: maxWarmupPasses(),
        minPasses: minWarmupPasses(),
        stableFrameMs: warmupStableFrameMs,
        stablePasses: stableWarmupPasses(),
        viewCount: warmupViewCount(),
        cleanCycles: warmupCleanRenderCycles,
      });

    const runReadyWarmupRenderPass = () => {
      if (canceled) {
        return;
      }

      const tracker = readyWarmupTracker ?? createReadyWarmupTracker();
      readyWarmupTracker = tracker;
      const pass = tracker.pass;
      const viewIndex = getWarmupViewIndex(pass);
      const rigDuration = warmupBossShaderRig();
      const result = warmupRender(getWarmupView(pass));
      const duration = rigDuration + result.duration;
      const decision = tracker.record({
        duration,
        newPrograms: result.newPrograms,
        viewIndex,
      });

      emitProgress(
        "Warming Renderer",
        warmupProgress(decision.pass),
        result.newPrograms > 0
          ? `GPU warmup ${decision.pass}/${maxWarmupPasses()} - +${result.newPrograms} shaders`
          : `GPU warmup ${decision.pass}/${maxWarmupPasses()} - ${decision.cleanViewCount}/${warmupViewCount()} views clean`
      );

      if (!decision.done) {
        frame = requestAnimationFrame(runReadyWarmupRenderPass);
        return;
      }

      frame = requestAnimationFrame(ready);
    };

    const runCatalogWarmupRenderPass = (pass = 0) => {
      if (canceled) {
        return;
      }

      if (pass >= catalogWarmupPasses()) {
        beginReadyWarmup();
        return;
      }

      const result = warmupRender(getWarmupView(pass));
      const nextPass = pass + 1;

      emitProgress(
        "Warming Renderer",
        catalogWarmupProgress(nextPass),
        result.newPrograms > 0
          ? `Shader catalog ${nextPass}/${catalogWarmupPasses()} - +${result.newPrograms} shaders`
          : `Shader catalog ${nextPass}/${catalogWarmupPasses()} - ${result.duration.toFixed(0)}ms`
      );
      frame = requestAnimationFrame(() => runCatalogWarmupRenderPass(nextPass));
    };

    const runCompileWarmupViewPass = (pass = 0) => {
      if (canceled) {
        return;
      }

      if (pass >= compileViews.length) {
        runCatalogWarmupRenderPass();
        return;
      }

      const duration = compileWarmupView(compileViews[pass]);
      const nextPass = pass + 1;

      emitProgress(
        "Compiling Scene",
        compileWarmupProgress(nextPass),
        `Shader view ${nextPass}/${compileViews.length} - ${duration.toFixed(0)}ms`
      );
      frame = requestAnimationFrame(() => runCompileWarmupViewPass(nextPass));
    };

    const beginReadyWarmup = () => {
      if (readyWarmupStarted || canceled) {
        return;
      }

      readyWarmupStarted = true;
      readyWarmupTracker = createReadyWarmupTracker();
      onWarmupStart?.();
      emitProgress("Warming Renderer", 0.92, "Preparing runtime scene");
      tick().finally(() => {
        if (!canceled) {
          frame = requestAnimationFrame(() => runReadyWarmupRenderPass());
        }
      });
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
      const blockingReady = blockingTexturesReady(
        blockingTextures,
        textureProgress.total
      );

      uploadTextureBatch(blockingTextures, 2);

      if (!warmupReady) {
        emitProgress("Preparing Scene", 0.9, "Preparing lights");
        frame = requestAnimationFrame(preload);
        return;
      }

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
            .finally(() => {
              frame = requestAnimationFrame(() => runCompileWarmupViewPass());
            });
        }

        return;
      }

      emitTextureProgress(textureProgress);

      ticks += 1;

      if (ticks < 240) {
        frame = requestAnimationFrame(preload);
      } else {
        ready();
      }
    };

    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(preload);
    });

    return () => {
      canceled = true;
      cancelAnimationFrame(frame);
      bossShaderWarmup?.dispose();
    };
  });
</script>
