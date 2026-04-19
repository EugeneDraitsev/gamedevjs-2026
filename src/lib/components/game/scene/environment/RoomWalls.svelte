<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import type { StaticWall } from "$lib/types/game";

  let { roomWalls }: { roomWalls: StaticWall[] } = $props();
</script>

{#each roomWalls as wall (wall.id)}
  <T.Group position={wall.position}>
    <RigidBody type="fixed">
      <Collider
        shape="cuboid"
        args={wall.args}
        friction={0.92}
        restitution={0.22}
      />

      <T.Mesh castShadow={!wall.opacity || wall.opacity >= 1} receiveShadow>
        <T.BoxGeometry
          args={[wall.args[0] * 2, wall.args[1] * 2, wall.args[2] * 2]}
        />
        <T.MeshStandardMaterial
          color={wall.color}
          metalness={0.08}
          opacity={wall.opacity ?? 1}
          roughness={0.9}
          transparent={Boolean(wall.opacity && wall.opacity < 1)}
          depthWrite={!wall.opacity || wall.opacity >= 1}
        />
      </T.Mesh>
    </RigidBody>
  </T.Group>
{/each}
