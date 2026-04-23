<script lang="ts">
  import { T } from "@threlte/core";
  import { Color, ConeGeometry, MeshStandardMaterial } from "three";
  import {
    DEFAULT_CHUNK,
    type OutsideChunkParams,
  } from "$lib/game/outside-terrain-noise";

  interface Props {
    chunk?: Partial<OutsideChunkParams>;
    ringCount?: number;
    innerRow?: number;
    outerRow?: number;
  }

  let {
    chunk = {},
    ringCount = 42,
    innerRow = 95,
    outerRow = 175,
  }: Props = $props();
  const c = { ...DEFAULT_CHUNK, ...chunk };

  // Unit-height cone — we scale it per instance so the shader's
  // vLocalY (which ranges from -0.5 to 0.5 on a unit cone) is a clean
  // 0..1 tip ratio for snow-capping.
  const unitCone = new ConeGeometry(1, 1, 6);

  const seedHash = (() => {
    let h = 2166136261;
    const s = c.seed;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  })();

  const createRng = (seed: number) => {
    let st = seed || 1;
    return () => {
      st = (st * 1_664_525 + 1_013_904_223) >>> 0;
      return st / 0x100000000;
    };
  };

  const rng = createRng(seedHash ^ 0xbadf00d);
  const buildRing = (count: number, radius: number, heightBase: number) =>
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.08;
      const r = radius + rng() * 14;
      const h = heightBase + rng() * 28;
      const baseR = 18 + rng() * 14;
      return {
        id: `peak-${heightBase}-${i}`,
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        h,
        baseR,
      };
    });

  const innerPeaks = buildRing(ringCount, innerRow, 58);
  const outerPeaks = buildRing(Math.floor(ringCount * 0.7), outerRow, 88);

  const snowMat = new MeshStandardMaterial({
    color: new Color("#c9cedb"),
    roughness: 0.92,
    flatShading: true,
  });
  snowMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vPeakT;"
      )
      .replace(
        "#include <begin_vertex>",
        // Unit cone position.y runs -0.5 (base ring) → 0.5 (tip).
        // Shift into 0..1 so shader can shade rock-to-snow cleanly.
        "#include <begin_vertex>\nvPeakT = position.y + 0.5;"
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vPeakT;"
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `
        #include <color_fragment>
        float rockLo = smoothstep(0.0, 0.25, vPeakT);
        float rockHi = smoothstep(0.25, 0.55, vPeakT);
        float snow = smoothstep(0.55, 0.85, vPeakT);
        vec3 dark = vec3(0.26, 0.26, 0.28);
        vec3 midRock = vec3(0.48, 0.49, 0.52);
        vec3 lightRock = vec3(0.72, 0.74, 0.78);
        vec3 snowC = vec3(0.97, 0.98, 1.0);
        vec3 col = mix(dark, midRock, rockLo);
        col = mix(col, lightRock, rockHi);
        col = mix(col, snowC, snow);
        diffuseColor.rgb = col;
        `
      );
  };
  snowMat.customProgramCacheKey = () => "outside-distant-peak-v3";
</script>

{#each innerPeaks as p (p.id)}
  <T.Mesh
    geometry={unitCone}
    position={[p.x, p.h / 2 - 6, p.z]}
    scale={[p.baseR, p.h, p.baseR]}
    renderOrder={-5}
  >
    <T is={snowMat} attach="material" />
  </T.Mesh>
{/each}

{#each outerPeaks as p (p.id)}
  <T.Mesh
    geometry={unitCone}
    position={[p.x, p.h / 2 - 8, p.z]}
    scale={[p.baseR * 1.1, p.h, p.baseR * 1.1]}
    renderOrder={-6}
  >
    <T is={snowMat} attach="material" />
  </T.Mesh>
{/each}
