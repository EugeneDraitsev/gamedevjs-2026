<script module lang="ts">
  import {
    InstancedMesh,
    MeshBasicMaterial,
    Object3D,
    PlaneGeometry,
  } from "three";
  import type { StaticWall } from "$lib/types/game";

  interface ShadowLayer {
    depth: number;
    geometry: PlaneGeometry;
    material: MeshBasicMaterial;
    renderOrder: number;
    spanPadding: number;
    wallOverlap: number;
    y: number;
  }

  const wallShadowDummy = new Object3D();
  const innerWallShadowGeometry = new PlaneGeometry(1, 1);
  const outerWallShadowGeometry = new PlaneGeometry(1, 1);
  const innerWallShadowMaterial = new MeshBasicMaterial({
    color: "#080503",
    depthWrite: false,
    opacity: 0.07,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    toneMapped: false,
    transparent: true,
  });
  const outerWallShadowMaterial = new MeshBasicMaterial({
    color: "#170d06",
    depthWrite: false,
    opacity: 0.032,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
    toneMapped: false,
    transparent: true,
  });

  const shadowLayers: ShadowLayer[] = [
    {
      depth: 1.18,
      geometry: outerWallShadowGeometry,
      material: outerWallShadowMaterial,
      renderOrder: 1,
      spanPadding: 0.9,
      wallOverlap: 0.1,
      y: 0.052,
    },
    {
      depth: 0.48,
      geometry: innerWallShadowGeometry,
      material: innerWallShadowMaterial,
      renderOrder: 2,
      spanPadding: 0.55,
      wallOverlap: 0.08,
      y: 0.056,
    },
  ];

  const isOpaqueWall = (wall: StaticWall) => (wall.opacity ?? 1) >= 1;
  const isHorizontalWall = (wall: StaticWall) => wall.args[0] > wall.args[2];
  const wallFaceSign = (wall: StaticWall) =>
    wall.facing === "south" || wall.facing === "east" ? 1 : -1;

  const buildWallShadowMesh = (
    roomWalls: StaticWall[],
    layer: ShadowLayer
  ): InstancedMesh | null => {
    const walls = roomWalls.filter(isOpaqueWall);

    if (walls.length === 0) {
      return null;
    }

    const mesh = new InstancedMesh(
      layer.geometry,
      layer.material,
      walls.length
    );

    mesh.castShadow = false;
    mesh.count = walls.length;
    mesh.frustumCulled = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = layer.renderOrder;

    walls.forEach((wall, index) => {
      const horizontal = isHorizontalWall(wall);
      const sign = wallFaceSign(wall);
      const span = (horizontal ? wall.args[0] : wall.args[2]) * 2;
      const wallDepth = horizontal ? wall.args[2] : wall.args[0];
      const faceOffset = wallDepth + layer.depth * 0.5 - layer.wallOverlap;

      wallShadowDummy.position.set(
        horizontal ? wall.position[0] : wall.position[0] + sign * faceOffset,
        layer.y,
        horizontal ? wall.position[2] + sign * faceOffset : wall.position[2]
      );
      wallShadowDummy.rotation.set(-Math.PI / 2, 0, 0);
      wallShadowDummy.scale.set(
        horizontal ? span + layer.spanPadding : layer.depth,
        horizontal ? layer.depth : span + layer.spanPadding,
        1
      );
      wallShadowDummy.updateMatrix();
      mesh.setMatrixAt(index, wallShadowDummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();

    return mesh;
  };
</script>

<script lang="ts">
  import { T } from "@threlte/core";

  let { roomWalls }: { roomWalls: StaticWall[] } = $props();

  const wallShadowMeshes = $derived.by(() => {
    const meshes: InstancedMesh[] = [];

    for (const layer of shadowLayers) {
      const mesh = buildWallShadowMesh(roomWalls, layer);

      if (mesh) {
        meshes.push(mesh);
      }
    }

    return meshes;
  });
</script>

{#each wallShadowMeshes as mesh (mesh.uuid)}
  <T is={mesh} />
{/each}
