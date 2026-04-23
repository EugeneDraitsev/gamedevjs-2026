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
  import { outsidePlan } from "$lib/game/outside-chunk-context";

  const plan = outsidePlan();

  // --- Trees: cylinder trunk + jittered icosahedron crown ---
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
  const foliageColors = new Float32Array(fp.count * 3);
  for (let i = 0; i < fp.count; i++) {
    const y = fp.getY(i);
    const t = Math.max(0, Math.min(1, (y + 1.2) / 2.4));
    const base = [0.12, 0.22, 0.11];
    const tip = [0.32, 0.48, 0.18];
    for (let k = 0; k < 3; k++) {
      foliageColors[i * 3 + k] = base[k] * (1 - t) + tip[k] * t;
    }
  }
  foliageGeo.setAttribute("color", new BufferAttribute(foliageColors, 3));
  const foliageMat = new MeshStandardMaterial({
    color: new Color("#2c4a24"),
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  });

  const trunkMesh = new InstancedMesh(
    trunkGeo,
    trunkMat,
    Math.max(1, plan.trees.length)
  );
  const foliageMesh = new InstancedMesh(
    foliageGeo,
    foliageMat,
    Math.max(1, plan.trees.length)
  );
  trunkMesh.count = plan.trees.length;
  foliageMesh.count = plan.trees.length;
  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  foliageMesh.castShadow = true;

  {
    const dummy = new Object3D();
    plan.trees.forEach((t, i) => {
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, t.rotationY, 0);
      const ts = t.scale * 1.2;
      dummy.scale.set(ts, ts * (0.9 + (t.variant / 4)), ts);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);
      dummy.position.set(t.x, t.y + 1.8 * ts, t.z);
      dummy.scale.set(ts, ts, ts);
      dummy.updateMatrix();
      foliageMesh.setMatrixAt(i, dummy.matrix);
    });
    trunkMesh.instanceMatrix.needsUpdate = true;
    foliageMesh.instanceMatrix.needsUpdate = true;
  }

  // --- Bushes ---
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
  const bushColors = new Float32Array(bp.count * 3);
  {
    const base = [0.17, 0.28, 0.13];
    const tip = [0.4, 0.52, 0.2];
    const bloom = [0.88, 0.72, 0.24];
    for (let i = 0; i < bp.count; i++) {
      const y = bp.getY(i);
      const t = Math.max(0, Math.min(1, (y + 0.55) / 1.1));
      const bloomMix =
        Math.sin(i * 12.9898) * 43758.5453 -
          Math.floor(Math.sin(i * 12.9898) * 43758.5453) >
        0.88
          ? 1
          : 0;
      for (let k = 0; k < 3; k++) {
        let v = base[k] * (1 - t) + tip[k] * t;
        if (bloomMix) v = v * 0.35 + bloom[k] * 0.7;
        bushColors[i * 3 + k] = v;
      }
    }
  }
  bushGeo.setAttribute("color", new BufferAttribute(bushColors, 3));
  const bushMat = new MeshStandardMaterial({
    color: new Color("#3a5423"),
    roughness: 0.93,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  });

  const bushMesh = new InstancedMesh(
    bushGeo,
    bushMat,
    Math.max(1, plan.bushes.length)
  );
  bushMesh.count = plan.bushes.length;
  bushMesh.castShadow = true;
  bushMesh.receiveShadow = true;
  {
    const dummy = new Object3D();
    plan.bushes.forEach((b, i) => {
      dummy.position.set(b.x, b.y + 0.2, b.z);
      dummy.rotation.set(0, b.rotationY, 0);
      const bs = b.scale * (0.85 + b.variant * 0.25);
      dummy.scale.set(bs, bs * 0.75, bs * 0.95);
      dummy.updateMatrix();
      bushMesh.setMatrixAt(i, dummy.matrix);
    });
    bushMesh.instanceMatrix.needsUpdate = true;
  }

  // --- Rocks ---
  const rockGeo = new IcosahedronGeometry(0.6, 0);
  const rockMat = new MeshStandardMaterial({
    color: new Color("#6b685c"),
    roughness: 0.94,
    metalness: 0.02,
    flatShading: true,
  });
  const rockMesh = new InstancedMesh(
    rockGeo,
    rockMat,
    Math.max(1, plan.rocks.length)
  );
  rockMesh.count = plan.rocks.length;
  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;
  {
    const dummy = new Object3D();
    plan.rocks.forEach((r, i) => {
      dummy.position.set(r.x, r.y + r.scale * 0.35, r.z);
      dummy.rotation.set(0, r.rotationY, 0);
      dummy.scale.set(r.scale, r.scale * 0.78, r.scale * 1.05);
      dummy.updateMatrix();
      rockMesh.setMatrixAt(i, dummy.matrix);
    });
    rockMesh.instanceMatrix.needsUpdate = true;
  }
</script>

<T is={trunkMesh} />
<T is={foliageMesh} />
<T is={bushMesh} />
<T is={rockMesh} />
