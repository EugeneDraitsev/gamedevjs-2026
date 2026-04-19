<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import type { RoomPlatform } from "$lib/types/game";

  let { roomPlatforms }: { roomPlatforms: RoomPlatform[] } = $props();
</script>

{#each roomPlatforms as platform (platform.id)}
  <T.Group position={platform.position}>
    <RigidBody type="fixed">
      <Collider
        shape="cuboid"
        args={platform.args}
        friction={0.94}
        restitution={0.04}
      />
      <T.Mesh castShadow receiveShadow>
        {#if platform.shape === "hex"}
          <T.CylinderGeometry
            args={[platform.args[0], platform.args[0], platform.args[1] * 2, 6]}
          />
        {:else}
          <T.BoxGeometry
            args={[
              platform.args[0] * 2,
              platform.args[1] * 2,
              platform.args[2] * 2,
            ]}
          />
        {/if}
        <T.MeshStandardMaterial
          color={platform.color}
          metalness={0.24}
          roughness={0.72}
        />
      </T.Mesh>
    </RigidBody>
  </T.Group>
{/each}
