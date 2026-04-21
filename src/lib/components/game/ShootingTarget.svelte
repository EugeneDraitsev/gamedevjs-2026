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
      <T.CylinderGeometry args={[width * 0.48, width * 0.62, height, 8]} />
      <T.MeshStandardMaterial
        {color}
        flatShading
        metalness={0.34}
        roughness={0.62}
      />
    </T.Mesh>

    <T.Mesh castShadow receiveShadow position.y={-halfHeight + 0.08}>
      <T.CylinderGeometry args={[width * 0.9, width * 1.08, 0.16, 8]} />
      <T.MeshStandardMaterial
        color="#7a5631"
        metalness={0.62}
        roughness={0.44}
      />
    </T.Mesh>

    <T.Mesh castShadow receiveShadow position.y={halfHeight + 0.08}>
      <T.CylinderGeometry args={[width * 0.66, width * 0.82, 0.16, 8]} />
      <T.MeshStandardMaterial
        color="#c18a4a"
        metalness={0.58}
        roughness={0.4}
      />
    </T.Mesh>
  </RigidBody>
</T.Group>
