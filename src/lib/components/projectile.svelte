<script lang="ts">
  import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d-compat";
  import { T, useTask } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { onMount } from "svelte";
  import { Vector3 } from "three";
  import {
    getDamageAtDistance,
    type WeaponBuild,
  } from "$lib/config/weapon-graph";

  export interface ProjectileData {
    build: WeaponBuild;
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
  const currentPosition = new Vector3();
  const spawnPosition = new Vector3();
  const lateralDirection = new Vector3();

  let rigidBody = $state<RapierRigidBody>();
  let hasExpired = false;
  let flightTime = 0;
  let ttlTimer = 0;
  let armed = false;

  let { data, onExpire }: ProjectileProps = $props();

  const expireProjectile = () => {
    if (hasExpired) {
      return;
    }

    hasExpired = true;
    onExpire?.(data.id);
  };

  onMount(() => {
    ttlTimer = window.setTimeout(() => {
      expireProjectile();
    }, data.build.ttlMs);

    return () => {
      clearTimeout(ttlTimer);
    };
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

    spawnPosition.set(data.position[0], data.position[1], data.position[2]);
  });

  useTask((delta) => {
    const body = rigidBody;

    if (!body || hasExpired) {
      return;
    }

    flightTime += delta;
    armed ||= flightTime > 0.06;

    const velocity = body.linvel();
    projectileVelocity.set(velocity.x, velocity.y, velocity.z);

    const dragFactor = Math.max(0.82, 1 - data.build.drag * delta);
    projectileVelocity.x *= dragFactor;
    projectileVelocity.z *= dragFactor;

    if (data.build.curve > 0.01) {
      lateralDirection.set(-projectileVelocity.z, 0, projectileVelocity.x);

      if (lateralDirection.lengthSq() > 0) {
        const curveSide =
          data.id.charCodeAt(data.id.length - 1) % 2 === 0 ? -1 : 1;
        const waveFrequency = 6 + data.build.curve * 0.9;
        const waveStrength =
          data.build.curve * delta * (4.8 + data.build.curve * 0.42);

        lateralDirection.normalize();
        projectileVelocity.addScaledVector(
          lateralDirection,
          Math.sin(flightTime * waveFrequency) * curveSide * waveStrength
        );
      }
    }

    body.setLinvel(
      {
        x: projectileVelocity.x,
        y: projectileVelocity.y,
        z: projectileVelocity.z,
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

    if (!armed) {
      return;
    }

    const velocity = rigidBody?.linvel();
    projectileVelocity.set(
      velocity?.x ?? data.velocity[0],
      velocity?.y ?? data.velocity[1],
      velocity?.z ?? data.velocity[2]
    );

    const translation = rigidBody?.translation();

    currentPosition.set(
      translation?.x ?? data.position[0],
      translation?.y ?? data.position[1],
      translation?.z ?? data.position[2]
    );

    const distanceMultiplier = getDamageAtDistance(
      data.build.damageProfile,
      currentPosition.distanceTo(spawnPosition)
    );
    const impulseStrength = data.build.knockback * distanceMultiplier;

    if (projectileVelocity.lengthSq() > 0) {
      projectileVelocity.normalize().multiplyScalar(impulseStrength);
    } else {
      fallbackImpulse.set(0, 0, -impulseStrength);
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
    gravityScale={data.build.gravity * 0.14}
    linearDamping={0}
    angularDamping={0.4}
    oncollisionenter={handleCollisionEnter}
    type="dynamic"
  >
    <Collider
      shape="ball"
      args={[data.build.radius]}
      density={data.build.mass}
      friction={0.08}
      restitution={0.18}
    />

    <T.Mesh castShadow>
      <T.SphereGeometry args={[data.build.radius, 20, 20]} />
      <T.MeshStandardMaterial
        color={data.build.colors.shell}
        emissive={data.build.colors.glow}
        emissiveIntensity={1.05}
        metalness={0.12}
        roughness={0.22}
      />
    </T.Mesh>

    <T.Mesh scale={0.62}>
      <T.SphereGeometry args={[data.build.radius, 16, 16]} />
      <T.MeshStandardMaterial
        color={data.build.colors.core}
        emissive={data.build.colors.shell}
        emissiveIntensity={0.45}
        metalness={0.05}
        roughness={0.3}
      />
    </T.Mesh>
  </RigidBody>
</T.Group>
