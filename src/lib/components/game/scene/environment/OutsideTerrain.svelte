<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { AutoColliders, RigidBody } from "@threlte/rapier";
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

  const buildGeometry = (cols: number, rows: number) => {
    const tileSize = 9;
    const { width, depth } = chunkParams;
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let zi = 0; zi <= rows; zi++) {
      const z = -depth * 0.5 + (zi / rows) * depth;
      for (let xi = 0; xi <= cols; xi++) {
        const x = -width * 0.5 + (xi / cols) * width;
        const y = sampler.heightAt(x, z);
        vertices.push(x, y, z);
        uvs.push((x + width * 0.5) / tileSize, (z + depth * 0.5) / tileSize);
      }
    }
    for (let zi = 0; zi < rows; zi++) {
      for (let xi = 0; xi < cols; xi++) {
        const a = zi * (cols + 1) + xi;
        const b = a + 1;
        const c = a + cols + 1;
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

  // Rendering mesh — high resolution for nice silhouette
  const geometry = buildGeometry(80, 140);
  // Physics mesh — lower resolution so rapier can trimesh it quickly
  const colliderGeometry = buildGeometry(48, 80);

  const { material, uniforms } = createOutsideGroundMaterial({
    map: texture,
    color: "#beb58f",
    snowLine: chunkParams.snowLineY,
  });

  $effect(() => {
    material.map = texture ?? null;
    material.needsUpdate = true;
  });

  useTask((delta) => {
    uniforms.uTime.value += delta;
  });
</script>

<T.Mesh {geometry} {material} receiveShadow castShadow />

<!-- Physics collider: a fixed trimesh matching a downsampled heightmap
     so the player actually sinks into valleys and can't walk through
     mountains. The collider is invisible (the visual mesh above renders
     the higher-res version). -->
<RigidBody type="fixed">
  <AutoColliders shape="trimesh">
    <T.Mesh geometry={colliderGeometry} visible={false} />
  </AutoColliders>
</RigidBody>
