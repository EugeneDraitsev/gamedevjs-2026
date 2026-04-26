<script module lang="ts">
  import {
    Color,
    MeshStandardMaterial,
    PlaneGeometry,
    type Texture,
  } from "three";
  import type { RoomHazard } from "$lib/types/game";

  const lavaTileSize = 2.1;
  const lavaGeometries = new Map<string, PlaneGeometry>();
  let sharedLavaMaterial: MeshStandardMaterial | null = null;

  const getLavaGeometry = (hazard: RoomHazard) => {
    const key = `${hazard.id}:${hazard.args[0]}:${hazard.args[2]}:${hazard.position[0]}:${hazard.position[2]}`;
    const cached = lavaGeometries.get(key);

    if (cached) {
      return cached;
    }

    const geometry = new PlaneGeometry(hazard.args[0] * 2, hazard.args[2] * 2);
    const uv = geometry.attributes.uv;
    const minX = (hazard.position[0] - hazard.args[0]) / lavaTileSize;
    const maxX = (hazard.position[0] + hazard.args[0]) / lavaTileSize;
    const minZ = (hazard.position[2] - hazard.args[2]) / lavaTileSize;
    const maxZ = (hazard.position[2] + hazard.args[2]) / lavaTileSize;

    uv.setXY(0, minX, minZ);
    uv.setXY(1, maxX, minZ);
    uv.setXY(2, minX, maxZ);
    uv.setXY(3, maxX, maxZ);
    uv.needsUpdate = true;
    lavaGeometries.set(key, geometry);

    return geometry;
  };

  const getLavaMaterial = (texture: Texture) => {
    if (sharedLavaMaterial) {
      if (sharedLavaMaterial.map !== texture) {
        sharedLavaMaterial.map = texture;
        sharedLavaMaterial.needsUpdate = true;
      }
      return sharedLavaMaterial;
    }

    sharedLavaMaterial = new MeshStandardMaterial({
      color: new Color().setHSL(20 / 360, 1, 0.22),
      emissive: new Color("#ff3200"),
      emissiveIntensity: 0.38,
      map: texture,
      metalness: 0.04,
      roughness: 0.28,
    });

    return sharedLavaMaterial;
  };
</script>

<script lang="ts">
  import { T } from "@threlte/core";

  let {
    animationNow = 0,
    lavaSurfaceTexture = null,
    roomHazards,
  }: {
    animationNow?: number;
    lavaSurfaceTexture?: Texture | null;
    roomHazards: RoomHazard[];
  } = $props();

  const lavaMaterial = $derived(
    lavaSurfaceTexture ? getLavaMaterial(lavaSurfaceTexture) : null
  );

  $effect(() => {
    if (!lavaMaterial) {
      return;
    }

    const pulse = 0.5 + Math.sin(animationNow * 0.003) * 0.5;

    lavaMaterial.color.setHSL(
      (20 + pulse * 8) / 360,
      1,
      (22 + pulse * 10) / 100
    );
    lavaMaterial.emissiveIntensity = 0.38 + pulse * 0.3;
  });
</script>

{#each roomHazards as hazard, index (hazard.id)}
  <T.Group position={hazard.position}>
    <T.Mesh receiveShadow>
      <T.BoxGeometry
        args={[hazard.args[0] * 2, hazard.args[1] * 2, hazard.args[2] * 2]}
      />
      <T.MeshStandardMaterial
        color="#090100"
        metalness={0.12}
        roughness={0.24}
      />
    </T.Mesh>

    {#if lavaMaterial}
      <T.Mesh
        geometry={getLavaGeometry(hazard)}
        material={lavaMaterial}
        position={[0, hazard.args[1] + 0.02 + index * 0.006, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      />
    {/if}
  </T.Group>
{/each}
