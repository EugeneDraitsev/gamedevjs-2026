<script lang="ts">
  import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d-compat";
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";

  interface ShootingTargetProps {
    color?: string;
    height?: number;
    position: [number, number, number];
    width?: number;
  }

  let {
    color = "#e63946",
    height = 1.6,
    position,
    width = 0.35,
  }: ShootingTargetProps = $props();

  let rigidBody = $state<RapierRigidBody>();

  const halfWidth = $derived(width / 2);
  const halfHeight = $derived(height / 2);
</script>

<T.Group position={[position[0], position[1] + halfHeight, position[2]]}>
  <RigidBody
    bind:rigidBody
    ccd
    canSleep
    linearDamping={0.4}
    angularDamping={0.3}
    type="dynamic"
  >
    <Collider
      shape="cuboid"
      args={[halfWidth, halfHeight, halfWidth]}
      density={2.5}
      friction={0.8}
      restitution={0.05}
    />

    <T.Mesh castShadow receiveShadow>
      <T.BoxGeometry args={[width, height, width]} />
      <T.MeshStandardMaterial {color} metalness={0.1} roughness={0.55} />
    </T.Mesh>

    <T.Mesh castShadow receiveShadow position.y={halfHeight + 0.12}>
      <T.SphereGeometry args={[width * 0.7, 16, 16]} />
      <T.MeshStandardMaterial {color} metalness={0.15} roughness={0.45} />
    </T.Mesh>
  </RigidBody>
</T.Group>
