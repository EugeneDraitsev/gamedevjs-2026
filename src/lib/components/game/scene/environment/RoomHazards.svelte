<script module lang="ts">
  import { PlaneGeometry } from "three";
  import type { RoomHazard } from "$lib/types/game";

  const lavaTileSize = 2.1;
  const lavaGeometries = new Map<string, PlaneGeometry>();

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
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import type { Texture } from "three";

  let {
    animationNow = 0,
    lavaSurfaceTexture = null,
    roomHazards,
  }: {
    animationNow?: number;
    lavaSurfaceTexture?: Texture | null;
    roomHazards: RoomHazard[];
  } = $props();

  const lavaPulse = $derived(0.5 + Math.sin(animationNow * 0.003) * 0.5);
</script>

{#each roomHazards as hazard, index (hazard.id)}
  <T.Group position={hazard.position}>
    <T.PointLight
      color="#ff6f2a"
      distance={Math.max(hazard.args[0], hazard.args[2]) * 3}
      intensity={0.65 + lavaPulse * 0.35}
      position={[0, hazard.args[1] + 0.35, 0]}
    />

    <T.Mesh receiveShadow>
      <T.BoxGeometry
        args={[hazard.args[0] * 2, hazard.args[1] * 2, hazard.args[2] * 2]}
      />
      <T.MeshStandardMaterial
        color="#351008"
        metalness={0.12}
        roughness={0.24}
      />
    </T.Mesh>

    {#if lavaSurfaceTexture}
      <T.Mesh
        geometry={getLavaGeometry(hazard)}
        position={[0, hazard.args[1] + 0.02 + index * 0.006, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <T.MeshStandardMaterial
          color={`hsl(${28 + lavaPulse * 4} 78% ${38 + lavaPulse * 6}%)`}
          emissive="#ff5a16"
          emissiveIntensity={0.1 + lavaPulse * 0.08}
          map={lavaSurfaceTexture}
          metalness={0.04}
          roughness={0.36}
        />
      </T.Mesh>
    {/if}
  </T.Group>
{/each}
