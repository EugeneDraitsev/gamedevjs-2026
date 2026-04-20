<script lang="ts">
  import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d-compat";
  import { T, useTask } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { onMount } from "svelte";
  import { MathUtils, Vector3 } from "three";
  import { getDamageAtDistance } from "$lib/config/weapon-graph";
  import type { Vec3 } from "$lib/types/game";
  import type { ProjectileProps } from "$lib/types/game-components";

  const projectileVelocity = new Vector3();
  const fallbackImpulse = new Vector3();
  const currentPosition = new Vector3();
  const spawnPosition = new Vector3();
  const lateralDirection = new Vector3();
  const desiredDirection = new Vector3();
  const homingTarget = new Vector3();

  let rigidBody = $state<RapierRigidBody>();
  let hasExpired = false;
  let flightTime = 0;
  let ttlTimer = 0;
  let armed = false;
  let visualYaw = $state(0);
  let trailOpacity = $state(0.7);
  let trailStretch = $state(1.5);

  let { data, enemyTargets = [], onExpire, onMove }: ProjectileProps = $props();

  const expireProjectile = () => {
    if (hasExpired) {
      return;
    }

    hasExpired = true;
    onExpire?.(data.id);
  };

  onMount(() => {
    visualYaw = Math.atan2(data.velocity[0], data.velocity[2]);
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

  const applyHomingVelocity = (delta: number) => {
    if (data.build.homingTurn <= 0) {
      return;
    }

    if (enemyTargets.length === 0) {
      expireProjectile();
      return;
    }

    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const target of enemyTargets) {
      const distance = Math.hypot(
        target[0] - currentPosition.x,
        target[2] - currentPosition.z
      );

      if (distance >= nearestDistance) {
        continue;
      }

      nearestDistance = distance;
      homingTarget.set(target[0], target[1], target[2]);
    }

    if (nearestDistance === Number.POSITIVE_INFINITY) {
      return;
    }

    desiredDirection.set(
      homingTarget.x - currentPosition.x,
      0,
      homingTarget.z - currentPosition.z
    );

    if (desiredDirection.lengthSq() === 0) {
      return;
    }

    const turn = Math.min(1, delta * data.build.homingTurn * 4.2);
    const speed = Math.max(data.build.speed, 1);

    desiredDirection.normalize().multiplyScalar(speed);
    projectileVelocity.x += (desiredDirection.x - projectileVelocity.x) * turn;
    projectileVelocity.z += (desiredDirection.z - projectileVelocity.z) * turn;
  };

  useTask((delta) => {
    const body = rigidBody;

    if (!body || hasExpired) {
      return;
    }

    flightTime += delta;
    armed ||= flightTime > 0.06;

    const velocity = body.linvel();
    projectileVelocity.set(velocity.x, velocity.y, velocity.z);
    const translation = body.translation();
    currentPosition.set(translation.x, translation.y, translation.z);
    visualYaw = Math.atan2(projectileVelocity.x, projectileVelocity.z);
    const speed = Math.hypot(projectileVelocity.x, projectileVelocity.z);

    trailStretch = MathUtils.lerp(
      trailStretch,
      Math.min(3.1, 1.35 + speed / 15),
      Math.min(1, delta * 16)
    );
    trailOpacity =
      0.42 +
      (0.24 + Math.min(0.16, speed * 0.008)) *
        (0.5 + 0.5 * Math.sin(flightTime * 42));

    onMove?.(data.id, [translation.x, translation.y, translation.z]);

    const dragFactor =
      data.build.homingTurn > 0
        ? 1
        : Math.max(0.82, 1 - data.build.drag * delta);
    projectileVelocity.x *= dragFactor;
    projectileVelocity.z *= dragFactor;

    applyHomingVelocity(delta);

    if (hasExpired) {
      return;
    }

    if (data.build.curve > 0.01) {
      lateralDirection.set(-projectileVelocity.z, 0, projectileVelocity.x);

      if (lateralDirection.lengthSq() > 0) {
        const curveSide =
          data.id.charCodeAt(data.id.length - 1) % 2 === 0 ? -1 : 1;
        const waveFrequency = 7.6 + data.build.curve * 1.25;
        const waveStrength =
          data.build.curve * delta * (8.4 + data.build.curve * 0.9);

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

    if (data.build.homingTurn > 0) {
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
      sensor={data.build.homingTurn > 0}
    />

    {#if data.build.homingTurn > 0}
      <T.Group
        rotation={[
          0,
          visualYaw,
          0,
        ]}
      >
        <T.Mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <T.CylinderGeometry
            args={[data.build.radius * 0.42, data.build.radius * 0.58, data.build.radius * 3.2, 12]}
          />
          <T.MeshStandardMaterial
            color="#ff9a54"
            emissive="#ff6b3d"
            emissiveIntensity={0.9}
            metalness={0.22}
            roughness={0.18}
          />
        </T.Mesh>

        <T.Mesh
          castShadow
          position={[0, 0, data.build.radius * 1.8]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <T.ConeGeometry
            args={[data.build.radius * 0.62, data.build.radius * 1.4, 12]}
          />
          <T.MeshStandardMaterial
            color="#ffe1a8"
            emissive="#ffb36b"
            emissiveIntensity={0.45}
            metalness={0.12}
            roughness={0.18}
          />
        </T.Mesh>

        <T.Mesh
          position={[0, 0, -data.build.radius * 1.9]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <T.ConeGeometry
            args={[data.build.radius * 0.44, data.build.radius * 1.1, 10]}
          />
          <T.MeshStandardMaterial
            color="#ffde94"
            emissive="#ff6b3d"
            emissiveIntensity={1.1}
            metalness={0.04}
            roughness={0.1}
          />
        </T.Mesh>
      </T.Group>
    {:else}
      <T.Group rotation={[0, visualYaw, 0]}>
        <T.Mesh
          position={[0, 0, -data.build.radius * (1.2 + trailStretch * 0.52)]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1, 1, trailStretch]}
        >
          <T.CylinderGeometry
            args={[data.build.radius * 0.74, data.build.radius * 0.18, data.build.radius * 3.8, 12]}
          />
          <T.MeshStandardMaterial
            color={data.build.colors.shell}
            emissive={data.build.colors.glow}
            emissiveIntensity={1.45}
            metalness={0.02}
            opacity={trailOpacity}
            roughness={0.16}
            transparent
          />
        </T.Mesh>

        <T.Mesh
          castShadow
          position={[0, 0, data.build.radius * 1.1]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <T.CylinderGeometry
            args={[data.build.radius * 0.2, data.build.radius * 0.34, data.build.radius * 2.7, 12]}
          />
          <T.MeshStandardMaterial
            color={data.build.colors.core}
            emissive={data.build.colors.shell}
            emissiveIntensity={1.2}
            metalness={0.08}
            roughness={0.14}
          />
        </T.Mesh>

        <T.Mesh
          castShadow
          position={[0, 0, data.build.radius * 2.2]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <T.ConeGeometry
            args={[data.build.radius * 0.4, data.build.radius * 1.05, 12]}
          />
          <T.MeshStandardMaterial
            color="#fff2c4"
            emissive={data.build.colors.core}
            emissiveIntensity={0.78}
            metalness={0.04}
            roughness={0.16}
          />
        </T.Mesh>
      </T.Group>
    {/if}
  </RigidBody>
</T.Group>
