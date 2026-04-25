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
    // positions that grass should avoid (roads, structures, water)
    avoid?: Array<{ x: number; z: number; r: number }>;
    bounds?: { xMin: number; xMax: number; zMin: number; zMax: number };
    grassCount?: number;
  }

  let {
    grassCount = 6000,
    bounds = { xMin: -36, xMax: 36, zMin: -88, zMax: 82 },
    avoid = [],
  }: Props = $props();

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
      // biome-ignore lint/suspicious/noBitwiseOperators: deterministic unsigned seed hashing.
      state = (state * 1_664_525 + 1_013_904_223) >>> 0;
      return state / 0x1_00_00_00_00;
    };
  };

  const createGrassMesh = () => {
    const mesh = new InstancedMesh(bladeGeo, grassMat, grassCount);
    mesh.count = 0;
    mesh.receiveShadow = true;
    return mesh;
  };

  const grassMesh = createGrassMesh();

  const setupGrass = () => {
    const rng = createRng(13_571);
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
        0.45 * Math.sin(x * 0.11 + z * 0.16) * Math.cos(x * 0.19 - z * 0.11);
      if (rng() > density) {
        continue;
      }
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
      if (skip) {
        continue;
      }
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      const s = 0.45 + rng() * 0.35;
      dummy.scale.set(s * 0.9, s * (0.6 + rng() * 0.35), s * 0.9);
      dummy.updateMatrix();
      grassMesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    grassMesh.count = placed;
    grassMesh.instanceMatrix.needsUpdate = true;
    grassMesh.computeBoundingSphere();
  };
  setupGrass();

  useTask((delta) => {
    grassUniforms.uTime.value += delta;
  });
</script>

<!-- Instanced swaying grass -->
<T is={grassMesh} />
