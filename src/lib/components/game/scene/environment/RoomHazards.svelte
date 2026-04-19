<script lang="ts">
  import { T } from "@threlte/core";
  import type { Texture } from "three";
  import type { RoomHazard } from "$lib/types/game";

  let {
    lavaSurfaceTexture = null,
    roomHazards,
  }: {
    lavaSurfaceTexture?: Texture | null;
    roomHazards: RoomHazard[];
  } = $props();
</script>

{#each roomHazards as hazard (hazard.id)}
  <T.Group position={hazard.position}>
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
        position={[0, hazard.args[1] + 0.004, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <T.PlaneGeometry args={[hazard.args[0] * 2, hazard.args[2] * 2]} />
        <T.MeshStandardMaterial
          color={hazard.color}
          emissive={hazard.color}
          emissiveIntensity={0.7}
          map={lavaSurfaceTexture}
          metalness={0.08}
          roughness={0.18}
        />
      </T.Mesh>
    {/if}
  </T.Group>
{/each}

{#each roomHazards as hazard (hazard.id)}
  <T.Group position={hazard.position}>
    <T.Mesh
      position={[0, hazard.args[1] + 0.01, 0]}
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <T.RingGeometry
        args={[
          Math.max(0.2, Math.min(hazard.args[0], hazard.args[2]) * 0.18),
          Math.min(hazard.args[0], hazard.args[2]) * 0.42,
          24,
        ]}
      />
      <T.MeshBasicMaterial color="#ffd7a6" opacity={0.34} transparent />
    </T.Mesh>
  </T.Group>
{/each}
