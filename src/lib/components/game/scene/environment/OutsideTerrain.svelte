<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { BufferAttribute, BufferGeometry, type Texture } from "three";
  import { createOutsideGroundMaterial } from "$lib/components/overworld/materials/outside-ground-material";
  import {
    DEFAULT_CHUNK,
    createOutsideChunkSampler,
    type OutsideChunkParams,
  } from "$lib/game/outside-terrain-noise";

  interface Props {
    texture?: Texture | null;
    chunk?: Partial<OutsideChunkParams>;
  }

  let { texture = null, chunk = {} }: Props = $props();

  const chunkParams = { ...DEFAULT_CHUNK, ...chunk };
  const sampler = createOutsideChunkSampler(chunkParams);

  const buildGeometry = () => {
    const columns = 80;
    const rows = 140;
    const tileSize = 9;
    const { width, depth } = chunkParams;
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let zi = 0; zi <= rows; zi++) {
      const z = -depth * 0.5 + (zi / rows) * depth;
      for (let xi = 0; xi <= columns; xi++) {
        const x = -width * 0.5 + (xi / columns) * width;
        const y = sampler.heightAt(x, z);
        vertices.push(x, y, z);
        uvs.push((x + width * 0.5) / tileSize, (z + depth * 0.5) / tileSize);
      }
    }
    for (let zi = 0; zi < rows; zi++) {
      for (let xi = 0; xi < columns; xi++) {
        const a = zi * (columns + 1) + xi;
        const b = a + 1;
        const c = a + columns + 1;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const g = new BufferGeometry();
    g.setIndex(indices);
    g.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(vertices), 3)
    );
    g.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    g.computeVertexNormals();
    return g;
  };

  const geometry = buildGeometry();

  const { material, uniforms } = createOutsideGroundMaterial({
    map: texture,
    color: "#beb58f",
  });

  $effect(() => {
    material.map = texture ?? null;
    material.needsUpdate = true;
  });

  useTask((delta) => {
    uniforms.uTime.value += delta;
  });
</script>

<T.Mesh {geometry} {material} receiveShadow />
