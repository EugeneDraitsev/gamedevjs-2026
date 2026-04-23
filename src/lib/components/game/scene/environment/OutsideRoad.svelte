<script lang="ts">
  import { T } from "@threlte/core";
  import {
    BufferAttribute,
    BufferGeometry,
    Color,
    MeshStandardMaterial,
  } from "three";
  import {
    DEFAULT_CHUNK,
    createOutsideChunkSampler,
    type OutsideChunkParams,
  } from "$lib/game/outside-terrain-noise";

  interface Props {
    chunk?: Partial<OutsideChunkParams>;
    widthHalf?: number;
    samples?: number;
  }

  let { chunk = {}, widthHalf = 2.4, samples = 96 }: Props = $props();
  const c = { ...DEFAULT_CHUNK, ...chunk };
  const sampler = createOutsideChunkSampler(c);
  const halfD = c.depth * 0.5;

  // Build a ribbon mesh that follows the procedural road centerline at
  // each z sample, slightly above the terrain so it reads as a worn
  // earthen path rather than painted over grass.
  const geometry = (() => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const z = -halfD * 0.92 + t * halfD * 1.84;
      const cx = sampler.roadCenterX(z);
      const y = sampler.heightAt(cx, z) + 0.03;
      positions.push(cx - widthHalf, y, z);
      positions.push(cx + widthHalf, y, z);
      uvs.push(0, t * halfD);
      uvs.push(1, t * halfD);
      if (i < samples) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }

    const g = new BufferGeometry();
    g.setIndex(indices);
    g.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3)
    );
    g.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    g.computeVertexNormals();
    return g;
  })();

  const material = new MeshStandardMaterial({
    color: new Color("#6b543a"),
    roughness: 0.96,
    metalness: 0.01,
    flatShading: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vRoadUv;"
      )
      .replace(
        "#include <uv_vertex>",
        "#include <uv_vertex>\nvRoadUv = uv;"
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vRoadUv;"
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `
        #include <color_fragment>
        // Fade road edges softly + scatter stones as speckles
        float edge = 1.0 - smoothstep(0.35, 0.5, abs(vRoadUv.x - 0.5));
        float stones = step(0.88, fract(sin(dot(vRoadUv * vec2(380.0, 11.0), vec2(12.9898, 78.233))) * 43758.5453));
        vec3 rCol = diffuseColor.rgb;
        rCol = mix(rCol * 0.65, rCol, edge);
        rCol = mix(rCol, vec3(0.42, 0.4, 0.37), stones * 0.6);
        diffuseColor.rgb = rCol;
        diffuseColor.a = edge;
        `
      );
  };
  material.transparent = true;
  material.customProgramCacheKey = () => "outside-road-v1";
</script>

<T.Mesh {geometry} {material} receiveShadow />
