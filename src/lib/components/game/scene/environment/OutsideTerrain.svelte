<script module lang="ts">
  import { BufferAttribute, BufferGeometry } from "three";

  const createTerrainGeometry = () => {
    const columns = 44;
    const depth = 196;
    const rows = 88;
    const tileSize = 9;
    const width = 112;
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const bumps = [
      [-30, -66, 1.4, 11],
      [29, -52, 1.1, 10],
      [-29, -18, 0.8, 9],
      [30, 27, 1.1, 11],
      [-29, 71, 1.2, 10],
      [24, 76, 0.75, 8],
      [-16, 42, 0.55, 12],
      [15, -29, 0.5, 12],
      [-11, -72, 0.42, 9],
      [9, 8, 0.34, 14],
    ];

    for (let zIndex = 0; zIndex <= rows; zIndex += 1) {
      const z = -depth * 0.5 + (zIndex / rows) * depth;

      for (let xIndex = 0; xIndex <= columns; xIndex += 1) {
        const x = -width * 0.5 + (xIndex / columns) * width;
        const edge = Math.max(
          Math.abs(x) / (width * 0.5),
          Math.abs(z) / (depth * 0.5)
        );
        const roadLow = Math.max(0, 1 - Math.abs(x) / 5) * 0.025;
        const rise = Math.max(0, edge - 0.58) ** 2 * 0.7;
        const bump = bumps.reduce((height, [bx, bz, power, radius]) => {
          const distance = Math.hypot(x - bx, z - bz) / radius;

          return height + Math.max(0, 1 - distance) ** 2 * power * 0.08;
        }, 0);
        const wave =
          Math.sin(x * 0.21 + z * 0.08) * 0.018 +
          Math.sin(z * 0.17 - x * 0.04) * 0.014;
        const y = Math.max(0.012, 0.024 + rise + bump + wave - roadLow);

        vertices.push(x, y, z);
        uvs.push((x + width * 0.5) / tileSize, (z + depth * 0.5) / tileSize);
      }
    }

    for (let zIndex = 0; zIndex < rows; zIndex += 1) {
      for (let xIndex = 0; xIndex < columns; xIndex += 1) {
        const a = zIndex * (columns + 1) + xIndex;
        const b = a + 1;
        const c = a + columns + 1;
        const d = c + 1;

        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new BufferGeometry();

    geometry.setIndex(indices);
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(vertices), 3)
    );
    geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    geometry.computeVertexNormals();

    return geometry;
  };

  const terrainGeometry = createTerrainGeometry();
</script>

<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import type { Texture } from "three";
  import { createOutsideGroundMaterial } from "$lib/components/overworld/materials/outside-ground-material";

  let {
    texture = null,
  }: {
    texture?: Texture | null;
  } = $props();

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

<T.Mesh geometry={terrainGeometry} {material} receiveShadow />
