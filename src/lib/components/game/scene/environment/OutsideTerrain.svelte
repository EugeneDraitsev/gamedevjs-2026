<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { AutoColliders, RigidBody } from "@threlte/rapier";
  import { BufferAttribute, BufferGeometry, type Texture } from "three";
  import { createOutsideGroundMaterial } from "$lib/components/overworld/materials/outside-ground-material";
  import { outsidePlan } from "$lib/game/outside-chunk-context";

  interface Props {
    texture?: Texture | null;
  }

  let { texture = null }: Props = $props();

  // Build the visible terrain mesh directly from the plan's grid so
  // the heightmap seen on screen is exactly the one the sampler /
  // roads / biome / physics are using.
  const plan = outsidePlan();
  const { size, grids } = plan;

  const buildGeometry = (height: Float32Array) => {
    const stride = size.cols + 1;
    const rows = size.rows;
    const cols = size.cols;
    const verts: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const tileSize = 9;
    const halfW = size.width * 0.5;
    const halfD = size.depth * 0.5;
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const x = -halfW + (c / cols) * size.width;
        const z = -halfD + (r / rows) * size.depth;
        const y = height[r * stride + c];
        verts.push(x, y, z);
        uvs.push((x + halfW) / tileSize, (z + halfD) / tileSize);
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = r * stride + c;
        const b = a + 1;
        const cc = a + stride;
        const d = cc + 1;
        indices.push(a, cc, b, b, cc, d);
      }
    }
    const g = new BufferGeometry();
    g.setIndex(indices);
    g.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
    g.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    g.computeVertexNormals();
    return g;
  };

  const geometry = buildGeometry(grids.height);

  // Physics collider uses a half-resolution copy of the same heightmap
  // so trimesh generation stays cheap.
  const buildColliderGeometry = (): BufferGeometry => {
    const srcStride = size.cols + 1;
    const dstCols = Math.max(16, Math.floor(size.cols / 2));
    const dstRows = Math.max(16, Math.floor(size.rows / 2));
    const verts: number[] = [];
    const indices: number[] = [];
    const halfW = size.width * 0.5;
    const halfD = size.depth * 0.5;
    for (let r = 0; r <= dstRows; r++) {
      const srcRow = Math.round((r / dstRows) * size.rows);
      for (let c = 0; c <= dstCols; c++) {
        const srcCol = Math.round((c / dstCols) * size.cols);
        const x = -halfW + (c / dstCols) * size.width;
        const z = -halfD + (r / dstRows) * size.depth;
        const y = grids.height[srcRow * srcStride + srcCol];
        verts.push(x, y, z);
      }
    }
    const dstStride = dstCols + 1;
    for (let r = 0; r < dstRows; r++) {
      for (let c = 0; c < dstCols; c++) {
        const a = r * dstStride + c;
        const b = a + 1;
        const cc = a + dstStride;
        const d = cc + 1;
        indices.push(a, cc, b, b, cc, d);
      }
    }
    const g = new BufferGeometry();
    g.setIndex(indices);
    g.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
    g.computeVertexNormals();
    return g;
  };
  const colliderGeometry = buildColliderGeometry();

  const createGround = () =>
    createOutsideGroundMaterial({
      map: texture,
      color: "#beb58f",
      snowLine: 10,
    });

  const { material, uniforms } = createGround();

  $effect(() => {
    material.map = texture ?? null;
    material.needsUpdate = true;
  });

  useTask((delta) => {
    uniforms.uTime.value += delta;
  });
</script>

<T.Mesh {geometry} {material} receiveShadow castShadow />

<RigidBody type="fixed">
  <AutoColliders shape="trimesh">
    <T.Mesh geometry={colliderGeometry} visible={false} />
  </AutoColliders>
</RigidBody>
