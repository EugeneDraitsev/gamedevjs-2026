<script lang="ts">
  import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d-compat";
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { onDestroy } from "svelte";
  import { Vector3 } from "three";

  export interface ProjectileData {
    id: string;
    position: [number, number, number];
    velocity: [number, number, number];
  }

  interface ProjectileProps {
    data: ProjectileData;
    onExpire?: (id: string) => void;
  }

  const projectileVelocity = new Vector3();
  const fallbackImpulse = new Vector3();

  const projectileRadius = 0.16;
  const projectileMass = 0.28;
  const projectileImpulseStrength = 1.35;
  const projectileSpeedThreshold = 0.75;
  const projectileTtlMs = 1800;

  let rigidBody = $state<RapierRigidBody>();
  let hasExpired = false;

  let { data, onExpire }: ProjectileProps = $props();

  const expireProjectile = () => {
    if (hasExpired) {
      return;
    }

    hasExpired = true;
    onExpire?.(data.id);
  };

  const ttlTimer = setTimeout(() => {
    expireProjectile();
  }, projectileTtlMs);

  onDestroy(() => {
    clearTimeout(ttlTimer);
  });

  $effect(() => {
    const body = rigidBody;

    if (!body) {
      return;
    }

    body.setLinvel(
      {
        x: data.velocity[0],
        y: data.velocity[1],
        z: data.velocity[2],
      },
      true
    );
  });

  const handleCollisionEnter = ({
    targetRigidBody,
  }: {
    targetRigidBody: RapierRigidBody | null;
  }) => {
    if (hasExpired) {
      return;
    }

    projectileVelocity.set(
      data.velocity[0],
      data.velocity[1],
      data.velocity[2]
    );

    if (projectileVelocity.lengthSq() > 0) {
      projectileVelocity.normalize().multiplyScalar(projectileImpulseStrength);
    } else {
      fallbackImpulse.set(0, 0, -projectileImpulseStrength);
      projectileVelocity.copy(fallbackImpulse);
    }

    if (targetRigidBody) {
      const targetType = targetRigidBody.bodyType();

      if (targetType === 0 || targetType === 2) {
        targetRigidBody.applyImpulse(projectileVelocity, true);
      }
    }

    expireProjectile();
  };
</script>

<T.Group position={data.position}>
  <RigidBody
    bind:rigidBody
    ccd
    canSleep={false}
    gravityScale={0}
    linearDamping={0.05}
    angularDamping={0.4}
    oncollisionenter={handleCollisionEnter}
    type="dynamic"
  >
    <Collider
      shape="ball"
      args={[projectileRadius]}
      density={projectileMass}
      friction={0.08}
      restitution={0.18}
    />

    <T.Mesh castShadow>
      <T.SphereGeometry args={[projectileRadius, 20, 20]} />
      <T.MeshStandardMaterial
        color="#8ac6ff"
        emissive="#2a7ea8"
        emissiveIntensity={0.9}
        metalness={0.12}
        roughness={0.22}
      />
    </T.Mesh>
  </RigidBody>
</T.Group>
