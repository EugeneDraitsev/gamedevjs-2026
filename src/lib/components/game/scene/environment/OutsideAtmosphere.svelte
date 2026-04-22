<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import {
    BufferAttribute,
    BufferGeometry,
    InstancedMesh,
    Object3D,
  } from "three";
  import { createGrassMaterial } from "$lib/components/overworld/materials/grass-material";

  interface Props {
    grassCount?: number;
    bounds?: { xMin: number; xMax: number; zMin: number; zMax: number };
    // positions that grass should avoid (roads, structures, water)
    avoid?: Array<{ x: number; z: number; r: number }>;
  }

  let {
    grassCount = 6000,
    bounds = { xMin: -36, xMax: 36, zMin: -88, zMax: 82 },
    avoid = [],
  }: Props = $props();

  // --- Distant silhouettes for background depth ---
  const farSilhouettes = Array.from({ length: 22 }, (_, i) => {
    const angle = (i / 22) * Math.PI * 2 + Math.sin(i * 7.1) * 0.08;
    const radius = 180 + Math.sin(i * 11.1) * 28;
    const height = 24 + ((i * 37) % 18);
    const base = 28 + ((i * 13) % 10);
    return {
      id: `far-sil-${i}`,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      height,
      base,
    };
  });

  const closerRuinRow = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2 + Math.sin(i * 3.7) * 0.12;
    const radius = 130 + Math.sin(i * 5.1) * 10;
    const h = 10 + ((i * 19) % 8);
    const w = 6 + ((i * 7) % 5);
    return {
      id: `close-sil-${i}`,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      h,
      w,
    };
  });

  // --- Procedural grass blade geometry ---
  const createBladeGeometry = () => {
    const geo = new BufferGeometry();
    const segments = 5;
    const positions: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const halfWidth = 0.07;
    const height = 1.0;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = t * height;
      const w = halfWidth * (1 - t * 0.85);
      positions.push(-w, y, 0, w, y, 0);
      uvs.push(0, t, 1, t);
      normals.push(0, 0, 1, 0, 0, 1);
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    geo.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3)
    );
    geo.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    geo.setAttribute(
      "normal",
      new BufferAttribute(new Float32Array(normals), 3)
    );
    geo.setIndex(indices);
    geo.computeBoundingSphere();
    return geo;
  };
  const bladeGeo = createBladeGeometry();
  const { material: grassMat, uniforms: grassUniforms } = createGrassMaterial({
    tipColor: "#aac24f",
    baseColor: "#2a4118",
    windStrength: 0.32,
  });

  // Seeded RNG for repeatable grass placement
  const createRng = (s: number) => {
    let state = s;
    return () => {
      state = (state * 1_664_525 + 1_013_904_223) >>> 0;
      return state / 0x100000000;
    };
  };

  const grassMesh = new InstancedMesh(bladeGeo, grassMat, grassCount);
  grassMesh.count = 0;
  grassMesh.receiveShadow = true;
  grassMesh.frustumCulled = false;

  const setupGrass = () => {
    const rng = createRng(13571);
    const dummy = new Object3D();
    let placed = 0;
    const maxAttempts = grassCount * 4;
    let attempts = 0;
    const w = bounds.xMax - bounds.xMin;
    const d = bounds.zMax - bounds.zMin;
    while (placed < grassCount && attempts < maxAttempts) {
      attempts++;
      const x = bounds.xMin + rng() * w;
      const z = bounds.zMin + rng() * d;
      // patchy density - favor some areas
      const density =
        0.55 +
        0.45 *
          Math.sin(x * 0.11 + z * 0.16) *
          Math.cos(x * 0.19 - z * 0.11);
      if (rng() > density) continue;
      // avoid roads, structures, water
      let skip = false;
      for (const a of avoid) {
        const dx = x - a.x;
        const dz = z - a.z;
        if (dx * dx + dz * dz < a.r * a.r) {
          skip = true;
          break;
        }
      }
      if (skip) continue;
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      const s = 0.9 + rng() * 0.6;
      dummy.scale.set(s * 0.9, s * (1.3 + rng() * 0.6), s * 0.9);
      dummy.updateMatrix();
      grassMesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    grassMesh.count = placed;
    grassMesh.instanceMatrix.needsUpdate = true;
  };
  setupGrass();

  useTask((delta) => {
    grassUniforms.uTime.value += delta;
  });
</script>

<!-- Distant silhouette peaks — sits inside fog, painting the horizon.
     We skip a full sky dome because the game camera is near-top-down and
     the dome introduced clipping artifacts; the fog + silhouettes already
     give the scene its background depth. -->
{#each farSilhouettes as sil (sil.id)}
  <T.Mesh position={[sil.x, sil.height / 2 - 4, sil.z]} renderOrder={-5}>
    <T.ConeGeometry args={[sil.base, sil.height, 7]} />
    <T.MeshBasicMaterial color="#1d2232" fog={true} />
  </T.Mesh>
{/each}

<!-- Closer broken-city silhouettes -->
{#each closerRuinRow as sil (sil.id)}
  <T.Mesh position={[sil.x, sil.h / 2 - 2, sil.z]} renderOrder={-4}>
    <T.BoxGeometry args={[sil.w, sil.h, 4]} />
    <T.MeshBasicMaterial color="#141826" fog={true} />
  </T.Mesh>
{/each}

<!-- Instanced swaying grass -->
<T is={grassMesh} />
