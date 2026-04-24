<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import {
    BufferAttribute,
    BufferGeometry,
    Color,
    IcosahedronGeometry,
    InstancedMesh,
    MeshStandardMaterial,
    Object3D,
  } from "three";
  import { createGrassMaterial } from "./materials/grass-material";

  interface Props {
    avoid?: [number, number, number][];
    avoidRadius?: number;
    count?: number;
    playableRadius?: number;
    radius?: number;
    seed?: number;
  }

  let {
    count = 6000,
    radius = 58,
    playableRadius = 58,
    seed = 137,
    avoid = [],
    avoidRadius = 2.4,
  }: Props = $props();

  // Procedural tapered grass blade: triangle strip with 5 segments (~12 verts)
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
      const w = halfWidth * (1 - t * 0.85); // taper toward tip
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
  const { material: grassMat, uniforms: grassUniforms } = createGrassMaterial();

  const grassMesh = new InstancedMesh(bladeGeo, grassMat, count);
  grassMesh.count = 0;
  grassMesh.receiveShadow = true;
  grassMesh.frustumCulled = false;

  // seeded RNG
  const createRng = (s: number) => {
    let state = s;
    return () => {
      // biome-ignore lint/suspicious/noBitwiseOperators: deterministic unsigned seed hashing.
      state = (state * 1_664_525 + 1_013_904_223) >>> 0;
      return state / 0x1_00_00_00_00;
    };
  };

  const setupInstances = (mesh: InstancedMesh) => {
    const rng = createRng(seed);
    const dummy = new Object3D();
    let placed = 0;
    const maxAttempts = count * 3;
    let attempts = 0;
    const avoidR2 = avoidRadius * avoidRadius;
    while (placed < count && attempts < maxAttempts) {
      attempts++;
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * (playableRadius - 1);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // simple noise-based density filter (patchy grass areas)
      const density =
        0.6 +
        0.4 * Math.sin(x * 0.12 + z * 0.17) * Math.cos(x * 0.21 - z * 0.13);
      if (rng() > density) {
        continue;
      }
      // Check avoid list
      let skip = false;
      for (const av of avoid) {
        const dx = x - av[0];
        const dz = z - av[2];
        if (dx * dx + dz * dz < avoidR2) {
          skip = true;
          break;
        }
      }
      if (skip) {
        continue;
      }
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      const s = 0.9 + rng() * 0.6;
      dummy.scale.set(s * 0.9, s * (1.6 + rng() * 0.7), s * 0.9);
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
  };

  setupInstances(grassMesh);

  useTask((delta) => {
    grassUniforms.uTime.value += delta;
  });

  // ------- Bushes (plump foliage clusters) -------
  const bushGeo = new IcosahedronGeometry(0.55, 1);
  // Jitter vertices for organic shape
  {
    const pos = bushGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const n = Math.sin(x * 8 + y * 5) * 0.25 + Math.cos(z * 7 - x * 3) * 0.18;
      pos.setXYZ(i, x + n * 0.08, y + n * 0.08, z + n * 0.08);
    }
    bushGeo.computeVertexNormals();
  }

  const bushMat = new MeshStandardMaterial({
    color: new Color("#3a5423"),
    roughness: 0.93,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  });
  // Vertex-color the bushes with a green-to-tip gradient + sparse bloom
  const applyBushColors = (geo: typeof bushGeo) => {
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const base = [0.17, 0.28, 0.13];
    const tip = [0.54, 0.64, 0.24];
    const bloom = [0.88, 0.72, 0.24];
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = Math.max(0, Math.min(1, (y + 0.55) / 1.1));
      const bloomNoise = Math.sin(i * 12.9898) * 43_758.5453;
      const isBloom = bloomNoise - Math.floor(bloomNoise) > 0.85 ? 1 : 0;
      for (let c = 0; c < 3; c++) {
        let v = base[c] * (1 - t) + tip[c] * t;
        if (isBloom) {
          v = v * 0.3 + bloom[c] * 0.8;
        }
        colors[i * 3 + c] = v;
      }
    }
    geo.setAttribute("color", new BufferAttribute(colors, 3));
  };
  applyBushColors(bushGeo);

  // Simple wind sway via onBeforeCompile
  bushMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = grassUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
             vec4 iw = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
             float seed = fract(sin(dot(iw.xz, vec2(12.9898, 78.233))) * 43758.5453);
             float heightT = clamp(position.y + 0.5, 0.0, 1.0);
             float sway = sin(uTime * 0.9 + seed * 6.28) * 0.09;
             transformed.x += sway * heightT;
             transformed.z += cos(uTime * 0.7 + seed * 6.28) * 0.06 * heightT;`
      );
  };
  bushMat.customProgramCacheKey = () => "overworld-bush-v2";

  const bushMesh = new InstancedMesh(bushGeo, bushMat, 200);
  bushMesh.count = 0;
  bushMesh.castShadow = true;
  bushMesh.receiveShadow = true;

  const setupBushes = (mesh: InstancedMesh) => {
    const rng = createRng(seed + 991);
    const dummy = new Object3D();
    const avoidR2 = avoidRadius * avoidRadius;
    let placed = 0;
    const target = 130;
    let attempts = 0;
    while (placed < target && attempts < target * 5) {
      attempts++;
      const a = rng() * Math.PI * 2;
      const r = 3 + Math.sqrt(rng()) * (playableRadius - 3);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      let skip = false;
      for (const av of avoid) {
        const dx = x - av[0];
        const dz = z - av[2];
        if (dx * dx + dz * dz < avoidR2 * 1.5) {
          skip = true;
          break;
        }
      }
      if (skip) {
        continue;
      }
      dummy.position.set(x, 0.25, z);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      const sx = 0.9 + rng() * 1.1;
      dummy.scale.set(sx, sx * (0.7 + rng() * 0.3), sx * (0.9 + rng() * 0.2));
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
  };

  setupBushes(bushMesh);
</script>

<T is={grassMesh} />
<T is={bushMesh} />
