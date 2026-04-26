<script module lang="ts">
  import {
    type BufferGeometry,
    DoubleSide,
    ExtrudeGeometry,
    InstancedMesh,
    type Material,
    Matrix4,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Object3D,
    Path,
    PlaneGeometry,
    RingGeometry,
    Shape,
    type Texture,
  } from "three";
  import {
    cachedBox,
    cachedCylinder,
    cachedTorus,
  } from "$lib/game/cached-geometries";
  import {
    foundryWallKitModuleCount,
    foundryWallKitModuleMatrix,
    foundryWallKitModuleVariant,
    foundryWallKitModuleWidth,
    foundryWallKitShowsDecor,
    foundryWallKitShowsGears,
    isFoundryWallKitWall,
  } from "$lib/game/foundry-wall-kit-layout";
  import type { StaticWall, Vec3, WallFacing } from "$lib/types/game";

  interface InstanceGroup {
    animated?: AnimatedInstance[];
    castShadow: boolean;
    geometry: BufferGeometry;
    material: Material;
    matrices: Matrix4[];
  }

  interface AnimatedInstance {
    base: Matrix4;
    index: number;
    phase: number;
    scale: Vec3;
    speed: number;
  }

  interface BuiltWallKitMesh {
    animated?: AnimatedInstance[];
    mesh: InstancedMesh;
  }

  interface BuildInput {
    decoratedWallFacings: WallFacing[] | null;
    gearlessWallFacings: WallFacing[] | null;
    limit: number;
    roomWalls: StaticWall[];
    wallDecalTexture: Texture | null;
    wallTexture: Texture | null;
  }

  const dummy = new Object3D();
  const animatedLocalMatrix = new Matrix4();

  const unitBox = cachedBox(1, 1, 1);
  const unitCylinder8 = cachedCylinder(1, 1, 1, 8);
  const unitCylinder10 = cachedCylinder(1, 1, 1, 10);
  const unitCylinder14 = cachedCylinder(1, 1, 1, 14);
  const valveTorus = cachedTorus(0.42, 0.055, 8, 32);
  const gearDepth = 0.16;
  const makeGearShape = () => {
    const shape = new Shape();
    const teeth = 14;

    for (let index = 0; index < teeth; index += 1) {
      const pitch = (Math.PI * 2) / teeth;
      const angle = index * pitch;
      const points = [
        [angle - pitch * 0.5, 0.72],
        [angle - pitch * 0.23, 0.72],
        [angle - pitch * 0.14, 1],
        [angle + pitch * 0.14, 1],
        [angle + pitch * 0.23, 0.72],
        [angle + pitch * 0.5, 0.72],
      ];

      for (const [pointAngle, radius] of points) {
        const x = Math.cos(pointAngle) * radius;
        const y = Math.sin(pointAngle) * radius;

        if (index === 0 && pointAngle === points[0][0]) {
          shape.moveTo(x, y);
        } else {
          shape.lineTo(x, y);
        }
      }
    }

    const hole = new Path();

    hole.absellipse(0, 0, 0.24, 0.24, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    shape.closePath();
    return shape;
  };
  const gearBody = new ExtrudeGeometry(makeGearShape(), {
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.02,
    bevelThickness: 0.025,
    depth: gearDepth,
    steps: 1,
  });
  const gearOuterRing = new RingGeometry(0.45, 0.64, 48);
  const gearInnerRing = new RingGeometry(0.25, 0.38, 48);

  gearBody.computeVertexNormals();

  const makeDecalGeometry = (
    width: number,
    height: number,
    u: number,
    v: number,
    uSize: number,
    vSize: number
  ) => {
    const geometry = new PlaneGeometry(width, height);
    const uv = geometry.attributes.uv;

    uv.setXY(0, u, v);
    uv.setXY(1, u + uSize, v);
    uv.setXY(2, u, v + vSize);
    uv.setXY(3, u + uSize, v + vSize);
    uv.needsUpdate = true;

    return geometry;
  };

  const wallDecalSources = [
    makeDecalGeometry(0.86, 0.3, 0.76, 0.04, 0.2, 0.1),
    makeDecalGeometry(0.72, 0.26, 0.78, 0.36, 0.2, 0.16),
    makeDecalGeometry(0.68, 0.32, 0.72, 0.78, 0.22, 0.18),
  ];

  const standardMaterials = new Map<string, MeshStandardMaterial>();
  const panelMaterials = new WeakMap<Texture, MeshStandardMaterial>();
  const decalMaterials = new WeakMap<Texture, MeshBasicMaterial>();
  const fallbackPanelMaterial = new MeshStandardMaterial({
    color: "#8d7c6a",
    metalness: 0.12,
    roughness: 0.86,
  });

  const getStandardMaterial = (
    key: string,
    color: string,
    metalness: number,
    roughness: number,
    emissive?: string,
    emissiveIntensity = 0
  ) => {
    const cacheKey = [
      key,
      color,
      metalness,
      roughness,
      emissive ?? "",
      emissiveIntensity,
    ].join("|");
    const cached = standardMaterials.get(cacheKey);

    if (cached) {
      return cached;
    }

    const material = new MeshStandardMaterial({
      color,
      metalness,
      roughness,
      ...(emissive ? { emissive, emissiveIntensity } : {}),
    });

    standardMaterials.set(cacheKey, material);
    return material;
  };

  const getPanelMaterial = (texture: Texture | null) => {
    if (!texture) {
      return fallbackPanelMaterial;
    }

    const cached = panelMaterials.get(texture);

    if (cached) {
      return cached;
    }

    const material = new MeshStandardMaterial({
      color: "#8d7c6a",
      map: texture,
      metalness: 0.12,
      roughness: 0.86,
    });

    panelMaterials.set(texture, material);
    return material;
  };

  const getDecalMaterial = (texture: Texture) => {
    const cached = decalMaterials.get(texture);

    if (cached) {
      return cached;
    }

    const material = new MeshBasicMaterial({
      alphaTest: 0.06,
      color: "#c27535",
      depthWrite: false,
      map: texture,
      opacity: 0.28,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      side: DoubleSide,
      transparent: true,
    });

    decalMaterials.set(texture, material);
    return material;
  };

  const darkMetal = getStandardMaterial("dark", "#2a2923", 0.54, 0.48);
  const blackMetal = getStandardMaterial("black", "#17110c", 0.84, 0.34);
  const ventBack = getStandardMaterial("vent", "#14100c", 0.64, 0.42);
  const lampBack = getStandardMaterial("lamp-back", "#1b1510", 0.72, 0.36);
  const lampGlow = new MeshBasicMaterial({ color: "#ffb257" });
  const gearDark = getStandardMaterial("gear-dark", "#20160d", 0.5, 0.4);

  const trimMaterial = (color: string) =>
    getStandardMaterial("trim", color, 0.72, 0.34);

  const materialCastsShadow = (material: Material) =>
    material instanceof MeshStandardMaterial;

  const groupKey = (
    geometry: BufferGeometry,
    material: Material,
    castShadow: boolean
  ) => `${geometry.uuid}|${material.uuid}|${castShadow ? "shadow" : "lit"}`;

  const addInstance = (
    groups: Map<string, InstanceGroup>,
    base: Matrix4,
    geometry: BufferGeometry,
    material: Material,
    position: Vec3,
    rotation: Vec3 = [0, 0, 0],
    scale: Vec3 = [1, 1, 1],
    castShadow = materialCastsShadow(material)
  ) => {
    const key = groupKey(geometry, material, castShadow);
    let group = groups.get(key);

    if (!group) {
      group = { castShadow, geometry, material, matrices: [] };
      groups.set(key, group);
    }

    dummy.position.set(position[0], position[1], position[2]);
    dummy.rotation.set(rotation[0], rotation[1], rotation[2]);
    dummy.scale.set(scale[0], scale[1], scale[2]);
    dummy.updateMatrix();
    group.matrices.push(base.clone().multiply(dummy.matrix));
  };

  const composeAnimatedMatrix = (
    instance: AnimatedInstance,
    animationNow: number,
    target: Matrix4
  ) => {
    const angle = instance.phase + animationNow * 0.000_18 * instance.speed;

    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, angle);
    dummy.scale.set(instance.scale[0], instance.scale[1], instance.scale[2]);
    dummy.updateMatrix();
    animatedLocalMatrix.copy(dummy.matrix);
    return target.copy(instance.base).multiply(animatedLocalMatrix);
  };

  const addAnimatedInstance = (
    groups: Map<string, InstanceGroup>,
    base: Matrix4,
    geometry: BufferGeometry,
    material: Material,
    position: Vec3,
    scale: Vec3,
    phase: number,
    speed: number,
    castShadow = materialCastsShadow(material)
  ) => {
    const key = groupKey(geometry, material, castShadow);
    let group = groups.get(key);

    if (!group) {
      group = { animated: [], castShadow, geometry, material, matrices: [] };
      groups.set(key, group);
    }

    dummy.position.set(position[0], position[1], position[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();

    const index = group.matrices.length;
    const instance = {
      base: base.clone().multiply(dummy.matrix),
      index,
      phase,
      scale,
      speed,
    };

    group.animated ??= [];
    group.animated.push(instance);
    group.matrices.push(composeAnimatedMatrix(instance, 0, new Matrix4()));
  };

  const addBox = (
    groups: Map<string, InstanceGroup>,
    base: Matrix4,
    material: Material,
    position: Vec3,
    scale: Vec3,
    rotation: Vec3 = [0, 0, 0]
  ) => addInstance(groups, base, unitBox, material, position, rotation, scale);

  const cylinderGeometry = (radialSegments: number) => {
    if (radialSegments === 14) {
      return unitCylinder14;
    }

    if (radialSegments === 10) {
      return unitCylinder10;
    }

    return unitCylinder8;
  };

  const addCylinder = (
    groups: Map<string, InstanceGroup>,
    base: Matrix4,
    material: Material,
    position: Vec3,
    scale: Vec3,
    radialSegments = 8,
    rotation: Vec3 = [0, 0, 0]
  ) =>
    addInstance(
      groups,
      base,
      cylinderGeometry(radialSegments),
      material,
      position,
      rotation,
      scale
    );

  const wallSeed = (wall: StaticWall) =>
    wall.id.split("").reduce((hash, char) => hash + char.charCodeAt(0), 0);
  const wallNoise = (seed: number, salt: number) => {
    const value = Math.sin((seed + salt) * 12.9898) * 43_758.5453;

    return value - Math.floor(value);
  };

  const addFrame = (
    groups: Map<string, InstanceGroup>,
    base: Matrix4,
    width: number,
    trimColor: string,
    seed: number,
    wallDecalTexture: Texture | null,
    wallTexture: Texture | null
  ) => {
    const height = 3.95;
    const postX = width / 2 - 0.16;
    const railY = height / 2 - 0.17;
    const trim = trimMaterial(trimColor);

    addBox(
      groups,
      base,
      getPanelMaterial(wallTexture),
      [0, 0, 0.02],
      [width, height, 0.1]
    );

    if (wallDecalTexture) {
      const material = getDecalMaterial(wallDecalTexture);

      for (let index = 0; index < 2; index += 1) {
        addInstance(
          groups,
          base,
          wallDecalSources[(seed + index) % wallDecalSources.length],
          material,
          [
            (wallNoise(seed, index * 13 + 3) - 0.5) * width * 0.42,
            (wallNoise(seed, index * 17 + 5) - 0.5) * 2.3,
            0.11,
          ],
          [0, 0, (wallNoise(seed, index * 11) - 0.5) * 0.5]
        );
      }
    }

    for (const side of [-1, 1]) {
      addBox(
        groups,
        base,
        darkMetal,
        [side * postX, 0, 0.17],
        [0.28, height + 0.04, 0.3]
      );

      for (const capY of [-1, 1]) {
        addBox(
          groups,
          base,
          trim,
          [side * postX, capY * railY, 0.3],
          [0.42, 0.28, 0.3]
        );
      }
    }

    for (const side of [-1, 1]) {
      addBox(
        groups,
        base,
        trim,
        [0, side * railY, 0.24],
        [width + 0.08, 0.18, 0.24]
      );
    }
  };

  const addVent = (
    groups: Map<string, InstanceGroup>,
    base: Matrix4,
    trim: Material,
    width: number,
    x: number,
    y: number
  ) => {
    addBox(groups, base, ventBack, [x, y, 0.34], [width, 0.66, 0.1]);

    for (const slat of [-0.22, -0.11, 0, 0.11, 0.22]) {
      addBox(
        groups,
        base,
        trim,
        [x, y + slat, 0.42],
        [width * 0.84, 0.045, 0.1]
      );
    }
  };

  const addLamp = (
    groups: Map<string, InstanceGroup>,
    base: Matrix4,
    trim: Material,
    y: number
  ) => {
    addBox(groups, base, lampBack, [0, y, 0.31], [0.44, 0.72, 0.12]);
    addCylinder(groups, base, lampGlow, [0, y, 0.34], [0.13, 0.52, 0.13], 10);

    for (const bar of [-0.15, 0, 0.15]) {
      addBox(groups, base, trim, [bar, y, 0.48], [0.035, 0.62, 0.04]);
    }

    for (const row of [-0.3, 0.3]) {
      addBox(groups, base, trim, [0, y + row, 0.48], [0.38, 0.045, 0.05]);
    }
  };

  const addValve = (
    groups: Map<string, InstanceGroup>,
    base: Matrix4,
    trim: Material,
    x: number,
    y: number,
    scale: number
  ) => {
    const addWheel = (cx: number, cy: number, localScale: number) => {
      const wheelScale = scale * localScale;

      addInstance(
        groups,
        base,
        valveTorus,
        trim,
        [x + cx, y + cy, 0.5],
        [0, 0, 0],
        [wheelScale, wheelScale, wheelScale]
      );

      for (const spoke of [0, Math.PI / 3, (Math.PI * 2) / 3]) {
        addBox(
          groups,
          base,
          trim,
          [x + cx, y + cy, 0.5],
          [0.72 * wheelScale, 0.045 * wheelScale, 0.08 * wheelScale],
          [0, 0, spoke]
        );
      }
    };

    addWheel(0, 0, 1);
    addWheel(0.42 * scale, -0.42 * scale, 0.52);
    addCylinder(
      groups,
      base,
      gearDark,
      [x, y, 0.5],
      [0.13 * scale, 0.12 * scale, 0.13 * scale],
      14,
      [Math.PI / 2, 0, 0]
    );
  };

  const addGear = (
    groups: Map<string, InstanceGroup>,
    base: Matrix4,
    trim: Material,
    x: number,
    y: number,
    scale: number,
    seed: number
  ) => {
    const phase = (seed % 17) * 0.18;

    addAnimatedInstance(
      groups,
      base,
      gearBody,
      trim,
      [x, y, 0.54],
      [scale, scale, scale],
      phase,
      1.35
    );
    addAnimatedInstance(
      groups,
      base,
      gearOuterRing,
      gearDark,
      [x, y, 0.54 + gearDepth * scale + 0.01],
      [scale, scale, scale],
      phase,
      1.35
    );
    addAnimatedInstance(
      groups,
      base,
      gearInnerRing,
      trim,
      [x, y, 0.54 + gearDepth * scale + 0.02],
      [scale, scale, scale],
      phase,
      1.35
    );
  };

  const addPipes = (
    groups: Map<string, InstanceGroup>,
    base: Matrix4,
    trim: Material,
    x: number,
    y: number
  ) => {
    for (const pipe of [-0.18, 0.18]) {
      addCylinder(
        groups,
        base,
        blackMetal,
        [x + pipe, y, 0.35],
        [0.06, 1.24, 0.06]
      );
      addCylinder(
        groups,
        base,
        trim,
        [x + pipe, y - 0.7, 0.35],
        [0.11, 0.11, 0.11]
      );
    }

    addCylinder(
      groups,
      base,
      blackMetal,
      [x, y + 0.63, 0.35],
      [0.06, 0.36, 0.06],
      8,
      [0, 0, Math.PI / 2]
    );
  };

  const addDecorVariant = (
    groups: Map<string, InstanceGroup>,
    moduleMatrix: Matrix4,
    trim: Material,
    moduleWidth: number,
    moduleSeed: number,
    decorVariant: string
  ) => {
    if (decorVariant === "gear") {
      addGear(
        groups,
        moduleMatrix,
        trim,
        -moduleWidth * 0.16,
        0.66,
        0.68,
        moduleSeed
      );
      addVent(
        groups,
        moduleMatrix,
        trim,
        moduleWidth * 0.28,
        moduleWidth * 0.23,
        0.2
      );
      return;
    }

    if (decorVariant === "valve") {
      addValve(groups, moduleMatrix, trim, -moduleWidth * 0.18, 0.45, 0.82);
      addVent(
        groups,
        moduleMatrix,
        trim,
        moduleWidth * 0.28,
        moduleWidth * 0.25,
        0
      );
      return;
    }

    if (decorVariant === "pipe") {
      addPipes(groups, moduleMatrix, trim, -moduleWidth * 0.22, 0.12);
      addVent(
        groups,
        moduleMatrix,
        trim,
        moduleWidth * 0.3,
        moduleWidth * 0.25,
        0.54
      );
      return;
    }

    addVent(
      groups,
      moduleMatrix,
      trim,
      moduleWidth * 0.34,
      moduleWidth * 0.24,
      -0.8
    );
  };

  const createInstancedMeshes = (
    groups: Map<string, InstanceGroup>
  ): BuiltWallKitMesh[] =>
    Array.from(groups.values()).map((group) => {
      const mesh = new InstancedMesh(
        group.geometry,
        group.material,
        group.matrices.length
      );

      for (let index = 0; index < group.matrices.length; index += 1) {
        mesh.setMatrixAt(index, group.matrices[index]);
      }
      mesh.castShadow = group.castShadow;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();

      if (group.animated) {
        return { animated: group.animated, mesh };
      }

      return { mesh };
    });

  const updateAnimatedWallKitMeshes = (
    meshes: BuiltWallKitMesh[],
    animationNow: number
  ) => {
    for (const { animated, mesh } of meshes) {
      if (!animated) {
        continue;
      }

      for (const instance of animated) {
        mesh.setMatrixAt(
          instance.index,
          composeAnimatedMatrix(instance, animationNow, dummy.matrix)
        );
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  };

  const buildWallKitMeshes = ({
    decoratedWallFacings,
    gearlessWallFacings,
    limit,
    roomWalls,
    wallDecalTexture,
    wallTexture,
  }: BuildInput) => {
    if (limit <= 0) {
      return [] as BuiltWallKitMesh[];
    }

    const groups = new Map<string, InstanceGroup>();
    const walls = roomWalls.filter(isFoundryWallKitWall).slice(0, limit);

    for (const wall of walls) {
      const trimColor = wall.trimColor ?? "#7b4b22";
      const trim = trimMaterial(trimColor);
      const seed = wallSeed(wall);
      const moduleCount = foundryWallKitModuleCount(wall);
      const moduleWidth = foundryWallKitModuleWidth(wall);
      const showDecor = foundryWallKitShowsDecor(wall, decoratedWallFacings);
      const showGears = foundryWallKitShowsGears(wall, gearlessWallFacings);

      for (let index = 0; index < moduleCount; index += 1) {
        const moduleMatrix = foundryWallKitModuleMatrix(wall, index);
        const moduleSeed = seed + index * 19;
        const lamp = Boolean(
          showDecor && wall.lamp && index === Math.floor(moduleCount / 2)
        );
        const variant = foundryWallKitModuleVariant(index, moduleCount);
        const decorVariant =
          showGears || variant !== "gear" ? variant : "plain";

        addFrame(
          groups,
          moduleMatrix,
          moduleWidth,
          trimColor,
          moduleSeed,
          wallDecalTexture,
          wallTexture
        );

        if (!showDecor) {
          continue;
        }

        addDecorVariant(
          groups,
          moduleMatrix,
          trim,
          moduleWidth,
          moduleSeed,
          decorVariant
        );

        if (lamp) {
          addLamp(groups, moduleMatrix, trim, -0.78);
        }
      }
    }

    return createInstancedMeshes(groups);
  };
</script>

<script lang="ts">
  import { T } from "@threlte/core";

  let {
    animationNow = 0,
    decoratedWallFacings = null,
    gearlessWallFacings = null,
    limit = 0,
    roomWalls,
    wallDecalTexture = null,
    wallTexture = null,
  }: {
    animationNow?: number;
    decoratedWallFacings?: WallFacing[] | null;
    gearlessWallFacings?: WallFacing[] | null;
    limit?: number;
    roomWalls: StaticWall[];
    wallDecalTexture?: Texture | null;
    wallTexture?: Texture | null;
  } = $props();

  const meshes = $derived.by(() =>
    buildWallKitMeshes({
      decoratedWallFacings,
      gearlessWallFacings,
      limit,
      roomWalls,
      wallDecalTexture,
      wallTexture,
    })
  );

  $effect(() => {
    animationNow;
    updateAnimatedWallKitMeshes(meshes, animationNow);
  });
</script>

{#each meshes as item (item.mesh.uuid)}
  <T is={item.mesh} />
{/each}
