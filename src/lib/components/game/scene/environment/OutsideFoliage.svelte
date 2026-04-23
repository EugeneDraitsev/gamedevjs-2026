<script lang="ts">
  import { T } from "@threlte/core";
  import {
    BufferAttribute,
    Color,
    CylinderGeometry,
    IcosahedronGeometry,
    InstancedMesh,
    MeshStandardMaterial,
    Object3D,
  } from "three";
  import {
    DEFAULT_CHUNK,
    createOutsideChunkSampler,
    type OutsideChunkParams,
  } from "$lib/game/outside-terrain-noise";

  interface Props {
    chunk?: Partial<OutsideChunkParams>;
    treeTarget?: number;
    bushTarget?: number;
  }

  let { chunk = {}, treeTarget = 70, bushTarget = 140 }: Props = $props();
  const c = { ...DEFAULT_CHUNK, ...chunk };
  const sampler = createOutsideChunkSampler(c);

  // --- Trees: trunks are cylinders, foliage is jittered icosahedron
  const trunkGeo = new CylinderGeometry(0.22, 0.3, 1.6, 7);
  trunkGeo.translate(0, 0.8, 0);
  const trunkMat = new MeshStandardMaterial({
    color: new Color("#3a2a1a"),
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });

  const foliageGeo = new IcosahedronGeometry(1.2, 1);
  const fp = foliageGeo.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i);
    const y = fp.getY(i);
    const z = fp.getZ(i);
    const n = Math.sin(x * 7 + y * 3) * 0.18 + Math.cos(z * 5 - x * 2) * 0.14;
    fp.setXYZ(i, x + n * 0.15, y + n * 0.15, z + n * 0.15);
  }
  foliageGeo.computeVertexNormals();
  const foliageMat = new MeshStandardMaterial({
    color: new Color("#2c4a24"),
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  });

  // Seed per-vertex foliage colour variation (darker base, pops at tips)
  const colorBuf = new Float32Array(fp.count * 3);
  for (let i = 0; i < fp.count; i++) {
    const y = fp.getY(i);
    const t = Math.max(0, Math.min(1, (y + 1.2) / 2.4));
    const base = [0.12, 0.22, 0.11];
    const tip = [0.32, 0.48, 0.18];
    for (let k = 0; k < 3; k++) {
      colorBuf[i * 3 + k] = base[k] * (1 - t) + tip[k] * t;
    }
  }
  foliageGeo.setAttribute("color", new BufferAttribute(colorBuf, 3));

  const trunkMesh = new InstancedMesh(trunkGeo, trunkMat, Math.max(1, treeTarget));
  trunkMesh.count = 0;
  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  const foliageMesh = new InstancedMesh(
    foliageGeo,
    foliageMat,
    Math.max(1, treeTarget)
  );
  foliageMesh.count = 0;
  foliageMesh.castShadow = true;

  const treeSamples = sampler.scatter({
    target: treeTarget,
    seedOffset: 101,
    innerBounds: 6,
    margin: 2.6,
    predicate: (s) =>
      s.y > c.waterLevel + 0.25 && // stay on dry land
      s.y < c.mountainPeakHeight * 0.38 && // below tree line
      s.slope < 0.85,
  });

  {
    const dummy = new Object3D();
    treeSamples.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(0, s.angle, 0);
      const tScale = s.scale * 1.2;
      dummy.scale.set(tScale, tScale * (0.85 + s.rand * 0.3), tScale);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);
      // foliage sits a bit above the trunk top
      dummy.position.set(s.x, s.y + 1.8 * tScale, s.z);
      dummy.scale.set(
        tScale * (0.95 + s.rand * 0.1),
        tScale * (0.95 + s.rand * 0.2),
        tScale * (0.95 + s.rand * 0.1)
      );
      dummy.updateMatrix();
      foliageMesh.setMatrixAt(i, dummy.matrix);
    });
    trunkMesh.count = treeSamples.length;
    foliageMesh.count = treeSamples.length;
    trunkMesh.instanceMatrix.needsUpdate = true;
    foliageMesh.instanceMatrix.needsUpdate = true;
  }

  // --- Bushes: small jittered icosahedra
  const bushGeo = new IcosahedronGeometry(0.5, 1);
  const bp = bushGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i);
    const y = bp.getY(i);
    const z = bp.getZ(i);
    const n = Math.sin(x * 9 + y * 4) * 0.22 + Math.cos(z * 7 - x * 3) * 0.18;
    bp.setXYZ(i, x + n * 0.08, y + n * 0.08, z + n * 0.08);
  }
  bushGeo.computeVertexNormals();
  const bushMat = new MeshStandardMaterial({
    color: new Color("#3a5423"),
    roughness: 0.93,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  });
  {
    const colors = new Float32Array(bp.count * 3);
    const base = [0.17, 0.28, 0.13];
    const tip = [0.4, 0.52, 0.2];
    const bloom = [0.88, 0.72, 0.24];
    for (let i = 0; i < bp.count; i++) {
      const y = bp.getY(i);
      const t = Math.max(0, Math.min(1, (y + 0.55) / 1.1));
      const isBloom =
        Math.sin(i * 12.9898) * 43758.5453 -
          Math.floor(Math.sin(i * 12.9898) * 43758.5453) >
        0.88
          ? 1
          : 0;
      for (let k = 0; k < 3; k++) {
        let v = base[k] * (1 - t) + tip[k] * t;
        if (isBloom) v = v * 0.35 + bloom[k] * 0.7;
        colors[i * 3 + k] = v;
      }
    }
    bushGeo.setAttribute("color", new BufferAttribute(colors, 3));
  }

  const bushMesh = new InstancedMesh(
    bushGeo,
    bushMat,
    Math.max(1, bushTarget)
  );
  bushMesh.count = 0;
  bushMesh.castShadow = true;
  bushMesh.receiveShadow = true;

  const bushSamples = sampler.scatter({
    target: bushTarget,
    seedOffset: 202,
    innerBounds: 3,
    margin: 1.6,
    predicate: (s) =>
      s.y > c.waterLevel + 0.05 &&
      s.y < c.mountainPeakHeight * 0.3 &&
      s.slope < 1.1,
  });

  {
    const dummy = new Object3D();
    bushSamples.forEach((s, i) => {
      dummy.position.set(s.x, s.y + 0.2, s.z);
      dummy.rotation.set(0, s.angle, 0);
      const bs = s.scale * (0.85 + s.rand * 0.5);
      dummy.scale.set(bs, bs * (0.75 + s.rand * 0.25), bs * (0.9 + s.rand * 0.2));
      dummy.updateMatrix();
      bushMesh.setMatrixAt(i, dummy.matrix);
    });
    bushMesh.count = bushSamples.length;
    bushMesh.instanceMatrix.needsUpdate = true;
  }
</script>

<T is={trunkMesh} />
<T is={foliageMesh} />
<T is={bushMesh} />
