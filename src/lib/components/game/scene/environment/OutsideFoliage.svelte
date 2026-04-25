<script module lang="ts">
  import {
    BufferAttribute,
    type BufferGeometry,
    CircleGeometry,
    Color,
    ConeGeometry,
    CylinderGeometry,
    IcosahedronGeometry,
    MeshBasicMaterial,
    MeshStandardMaterial,
  } from "three";
  import type { VegetationKindId } from "$lib/game/outside-chunk/types";

  // A kind-renderer bundles all meshes needed to paint one instance
  // of a vegetation kind:
  //   • one or more "parts" each with a geometry + material + per-
  //     instance offset (so a tree = trunk + crown both instanced)
  //   • shadow flags
  //
  // The renderer below builds one InstancedMesh per part and pushes
  // matrices for every VegetationInstance of the matching kind.
  interface VegPart {
    castShadow: boolean;
    geometry: BufferGeometry;
    localOffsetY: number;
    localScaleXZ: number;
    localScaleY: number; // multiplied into the instance scale on Y
    material: MeshStandardMaterial;
    receiveShadow: boolean;
  }

  interface VegKindRenderer {
    id: VegetationKindId;
    parts: VegPart[];
  }

  const makeJittered = (geo: BufferGeometry, amp: number): BufferGeometry => {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const n =
        Math.sin(x * 8.1 + y * 3.2) * amp +
        Math.cos(z * 6.7 - x * 2.1) * amp * 0.7;
      pos.setXYZ(i, x + n * 0.6, y + n * 0.6, z + n * 0.6);
    }
    geo.computeVertexNormals();
    return geo;
  };

  const paintVertexGradient = (
    geo: BufferGeometry,
    base: [number, number, number],
    tip: [number, number, number],
    axisMin: number,
    axisMax: number,
    axis: "x" | "y" | "z" = "y"
  ) => {
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      let v = pos.getY(i);
      if (axis === "x") {
        v = pos.getX(i);
      } else if (axis === "z") {
        v = pos.getZ(i);
      }
      const t = Math.max(0, Math.min(1, (v - axisMin) / (axisMax - axisMin)));
      colors[i * 3] = base[0] * (1 - t) + tip[0] * t;
      colors[i * 3 + 1] = base[1] * (1 - t) + tip[1] * t;
      colors[i * 3 + 2] = base[2] * (1 - t) + tip[2] * t;
    }
    geo.setAttribute("color", new BufferAttribute(colors, 3));
  };

  // --- Materials ---
  const matBark = new MeshStandardMaterial({
    color: new Color("#3a2a1a"),
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
  });
  const matDeadBark = new MeshStandardMaterial({
    color: new Color("#5a4c3c"),
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });
  const matConiferFoliage = new MeshStandardMaterial({
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  });
  const matBroadleafFoliage = new MeshStandardMaterial({
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  });
  const matFern = new MeshStandardMaterial({
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  });
  const matBush = new MeshStandardMaterial({
    roughness: 0.93,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  });
  const matRock = new MeshStandardMaterial({
    color: new Color("#6b685c"),
    roughness: 0.94,
    metalness: 0.02,
    flatShading: true,
  });
  const matMossyRock = new MeshStandardMaterial({
    roughness: 0.95,
    metalness: 0.01,
    flatShading: true,
    vertexColors: true,
  });
  const fakeShadowGeometry = new CircleGeometry(1, 24);
  fakeShadowGeometry.rotateX(-Math.PI / 2);
  const fakeShadowMaterial = new MeshBasicMaterial({
    color: "#17200f",
    depthWrite: false,
    opacity: 0.18,
    polygonOffset: true,
    polygonOffsetFactor: -8,
    polygonOffsetUnits: -8,
    transparent: true,
  });
  const fakeShadowStyleByKind: Partial<
    Record<VegetationKindId, { length: number; width: number }>
  > = {
    conifer: { width: 0.78, length: 2.8 },
    broadleaf: { width: 1.1, length: 2.7 },
    deadwood: { width: 0.48, length: 2.0 },
    "bush-small": { width: 0.38, length: 0.86 },
    "bush-large": { width: 0.68, length: 1.25 },
    "rock-med": { width: 0.5, length: 0.78 },
    "rock-lg": { width: 0.86, length: 1.2 },
  };
  const fakeShadowDirection = {
    x: 0.72,
    z: 0.58,
  };
  const fakeShadowYaw = Math.atan2(
    fakeShadowDirection.x,
    fakeShadowDirection.z
  );

  // --- Kind geometries (cached) ---
  const coniferTrunk = new CylinderGeometry(0.18, 0.28, 1.8, 7);
  coniferTrunk.translate(0, 0.9, 0);

  const coniferCrownLo = (() => {
    const g = new ConeGeometry(1.05, 2.0, 7);
    paintVertexGradient(g, [0.1, 0.22, 0.13], [0.25, 0.38, 0.17], -1, 1);
    return g;
  })();
  const coniferCrownMid = (() => {
    const g = new ConeGeometry(0.8, 1.6, 7);
    paintVertexGradient(g, [0.12, 0.26, 0.14], [0.3, 0.45, 0.2], -0.8, 0.8);
    return g;
  })();
  const coniferCrownTop = (() => {
    const g = new ConeGeometry(0.55, 1.2, 7);
    paintVertexGradient(g, [0.14, 0.3, 0.16], [0.34, 0.5, 0.22], -0.6, 0.6);
    return g;
  })();

  const broadleafTrunk = new CylinderGeometry(0.22, 0.32, 1.6, 7);
  broadleafTrunk.translate(0, 0.8, 0);

  const broadleafCrown = (() => {
    const g = makeJittered(new IcosahedronGeometry(1.15, 1), 0.11);
    paintVertexGradient(g, [0.16, 0.3, 0.12], [0.44, 0.58, 0.22], -1.1, 1.1);
    return g;
  })();
  const broadleafCrownSide = (() => {
    const g = makeJittered(new IcosahedronGeometry(0.72, 1), 0.1);
    paintVertexGradient(g, [0.18, 0.32, 0.13], [0.46, 0.6, 0.25], -0.7, 0.7);
    return g;
  })();

  const deadwoodTrunk = new CylinderGeometry(0.15, 0.22, 2.4, 6);
  deadwoodTrunk.translate(0, 1.2, 0);

  const fernGeo = (() => {
    const g = makeJittered(new IcosahedronGeometry(0.38, 1), 0.14);
    paintVertexGradient(g, [0.2, 0.36, 0.12], [0.56, 0.68, 0.28], -0.4, 0.4);
    return g;
  })();

  const bushSmallGeo = (() => {
    const g = makeJittered(new IcosahedronGeometry(0.48, 1), 0.18);
    paintVertexGradient(g, [0.19, 0.3, 0.13], [0.52, 0.62, 0.24], -0.5, 0.5);
    return g;
  })();
  const bushLargeGeo = (() => {
    const g = makeJittered(new IcosahedronGeometry(0.82, 1), 0.2);
    paintVertexGradient(g, [0.17, 0.28, 0.13], [0.44, 0.56, 0.22], -0.9, 0.9);
    return g;
  })();

  const rockSmGeo = makeJittered(new IcosahedronGeometry(0.45, 0), 0.16);
  const rockMedGeo = (() => {
    const g = makeJittered(new IcosahedronGeometry(0.72, 0), 0.2);
    paintVertexGradient(g, [0.34, 0.33, 0.3], [0.52, 0.5, 0.46], -0.8, 0.8);
    return g;
  })();
  const rockLgGeo = (() => {
    const g = makeJittered(new IcosahedronGeometry(1.2, 0), 0.24);
    paintVertexGradient(g, [0.3, 0.3, 0.28], [0.5, 0.48, 0.44], -1.3, 1.3);
    return g;
  })();

  // --- Kind renderers ---
  export const KIND_RENDERERS: Record<VegetationKindId, VegKindRenderer> = {
    conifer: {
      id: "conifer",
      parts: [
        {
          geometry: coniferTrunk,
          material: matBark,
          localOffsetY: 0,
          localScaleY: 1,
          localScaleXZ: 1,
          castShadow: true,
          receiveShadow: true,
        },
        {
          geometry: coniferCrownLo,
          material: matConiferFoliage,
          localOffsetY: 1.9,
          localScaleY: 1,
          localScaleXZ: 1,
          castShadow: true,
          receiveShadow: false,
        },
        {
          geometry: coniferCrownMid,
          material: matConiferFoliage,
          localOffsetY: 3.0,
          localScaleY: 1,
          localScaleXZ: 1,
          castShadow: true,
          receiveShadow: false,
        },
        {
          geometry: coniferCrownTop,
          material: matConiferFoliage,
          localOffsetY: 3.9,
          localScaleY: 1,
          localScaleXZ: 1,
          castShadow: true,
          receiveShadow: false,
        },
      ],
    },
    broadleaf: {
      id: "broadleaf",
      parts: [
        {
          geometry: broadleafTrunk,
          material: matBark,
          localOffsetY: 0,
          localScaleY: 1,
          localScaleXZ: 1,
          castShadow: true,
          receiveShadow: true,
        },
        {
          geometry: broadleafCrown,
          material: matBroadleafFoliage,
          localOffsetY: 2.0,
          localScaleY: 1,
          localScaleXZ: 1,
          castShadow: true,
          receiveShadow: false,
        },
        {
          geometry: broadleafCrownSide,
          material: matBroadleafFoliage,
          localOffsetY: 2.35,
          localScaleY: 1,
          localScaleXZ: 0.9,
          castShadow: true,
          receiveShadow: false,
        },
      ],
    },
    deadwood: {
      id: "deadwood",
      parts: [
        {
          geometry: deadwoodTrunk,
          material: matDeadBark,
          localOffsetY: 0,
          localScaleY: 1,
          localScaleXZ: 1,
          castShadow: true,
          receiveShadow: true,
        },
      ],
    },
    fern: {
      id: "fern",
      parts: [
        {
          geometry: fernGeo,
          material: matFern,
          localOffsetY: 0.22,
          localScaleY: 0.55,
          localScaleXZ: 1.05,
          castShadow: false,
          receiveShadow: true,
        },
      ],
    },
    "bush-small": {
      id: "bush-small",
      parts: [
        {
          geometry: bushSmallGeo,
          material: matBush,
          localOffsetY: 0.26,
          localScaleY: 0.8,
          localScaleXZ: 1,
          castShadow: true,
          receiveShadow: true,
        },
      ],
    },
    "bush-large": {
      id: "bush-large",
      parts: [
        {
          geometry: bushLargeGeo,
          material: matBush,
          localOffsetY: 0.5,
          localScaleY: 0.85,
          localScaleXZ: 1.05,
          castShadow: true,
          receiveShadow: true,
        },
      ],
    },
    "rock-sm": {
      id: "rock-sm",
      parts: [
        {
          geometry: rockSmGeo,
          material: matRock,
          localOffsetY: 0.2,
          localScaleY: 0.7,
          localScaleXZ: 1,
          castShadow: true,
          receiveShadow: true,
        },
      ],
    },
    "rock-med": {
      id: "rock-med",
      parts: [
        {
          geometry: rockMedGeo,
          material: matMossyRock,
          localOffsetY: 0.3,
          localScaleY: 0.8,
          localScaleXZ: 1,
          castShadow: true,
          receiveShadow: true,
        },
      ],
    },
    "rock-lg": {
      id: "rock-lg",
      parts: [
        {
          geometry: rockLgGeo,
          material: matMossyRock,
          localOffsetY: 0.55,
          localScaleY: 0.88,
          localScaleXZ: 1,
          castShadow: true,
          receiveShadow: true,
        },
      ],
    },
  };
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import { InstancedMesh, Object3D } from "three";
  import { outsidePlan } from "$lib/game/outside-chunk-context";

  const plan = outsidePlan();

  const buildKindMeshes = (kind: VegetationKindId) => {
    const renderer = KIND_RENDERERS[kind];
    const instances = plan.vegetation.perKind[kind] ?? [];
    if (!instances.length) {
      return [] as InstancedMesh[];
    }

    return renderer.parts.map((part) => {
      const mesh = new InstancedMesh(
        part.geometry,
        part.material,
        instances.length
      );
      mesh.count = instances.length;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const dummy = new Object3D();
      instances.forEach((inst, i) => {
        const sXZ = inst.scale * part.localScaleXZ;
        const sY = inst.scale * part.localScaleY;
        dummy.position.set(
          inst.x,
          inst.y + part.localOffsetY * inst.scale,
          inst.z
        );
        dummy.rotation.set(0, inst.rotationY, 0);
        dummy.scale.set(sXZ, sY, sXZ);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      return mesh;
    });
  };

  const buildFakeShadowMesh = () => {
    const instances = plan.vegetation.instances.filter(
      (instance) => fakeShadowStyleByKind[instance.kind]
    );
    const mesh = new InstancedMesh(
      fakeShadowGeometry,
      fakeShadowMaterial,
      instances.length
    );
    const dummy = new Object3D();

    mesh.count = instances.length;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 1;

    instances.forEach((inst, i) => {
      const style = fakeShadowStyleByKind[inst.kind];

      if (!style) {
        return;
      }

      const length = style.length * inst.scale;

      dummy.position.set(
        inst.x + fakeShadowDirection.x * length * 0.34,
        inst.y + 0.055,
        inst.z + fakeShadowDirection.z * length * 0.34
      );
      dummy.rotation.set(0, fakeShadowYaw, 0);
      dummy.scale.set(style.width * inst.scale, 1, length);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  };

  const kindOrder: VegetationKindId[] = [
    "conifer",
    "broadleaf",
    "deadwood",
    "fern",
    "bush-small",
    "bush-large",
    "rock-sm",
    "rock-med",
    "rock-lg",
  ];
  const allMeshes = kindOrder.flatMap(buildKindMeshes);
  const fakeShadowMesh = buildFakeShadowMesh();
</script>

<T is={fakeShadowMesh} />

{#each allMeshes as mesh (mesh.uuid)}
  <T is={mesh} />
{/each}
