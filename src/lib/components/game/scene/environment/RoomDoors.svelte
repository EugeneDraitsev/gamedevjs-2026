<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import type { Texture } from "three";
  import type { DoorMarker, DoorSeal } from "$lib/types/game";

  let {
    bossDoorTexture = null,
    doorOpenAmount,
    roomDoors,
    roomDoorSeals,
  }: {
    bossDoorTexture?: Texture | null;
    doorOpenAmount: number;
    roomDoors: DoorMarker[];
    roomDoorSeals: DoorSeal[];
  } = $props();
</script>

{#each roomDoors as door (door.id)}
  <T.Group position={door.position}>
    <T.Mesh receiveShadow>
      <T.BoxGeometry args={door.args} />
      <T.MeshStandardMaterial
        color={door.color}
        emissive={door.color}
        emissiveIntensity={0.2}
        map={door.boss ? bossDoorTexture : null}
        metalness={0.28}
        roughness={door.boss ? 0.18 : 0.36}
      />
    </T.Mesh>
  </T.Group>
{/each}

{#if doorOpenAmount < 0.999}
  {#each roomDoorSeals as seal (seal.id)}
    <T.Group position={seal.position}>
      <RigidBody type="fixed">
        <Collider
          shape="cuboid"
          args={seal.args}
          friction={0.92}
          restitution={0.02}
        />
      </RigidBody>
    </T.Group>

    <T.Group
      position={[
        seal.position[0],
        seal.position[1] + doorOpenAmount * 3.4,
        seal.position[2],
      ]}
    >
      <T.Mesh castShadow receiveShadow>
        <T.BoxGeometry
          args={[
            seal.args[0] * 2,
            Math.max(0.18, seal.args[1] * (1 - doorOpenAmount)) * 2,
            seal.args[2] * 2,
          ]}
        />
        <T.MeshStandardMaterial
          color={seal.color}
          emissive={seal.color}
          emissiveIntensity={0.26}
          metalness={0.34}
          opacity={0.9 - doorOpenAmount * 0.35}
          roughness={0.28}
          transparent
        />
      </T.Mesh>
    </T.Group>
  {/each}
{/if}
