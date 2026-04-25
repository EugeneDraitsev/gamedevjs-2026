<script module lang="ts">
  import {
    AdditiveBlending,
    ConeGeometry,
    CylinderGeometry,
    GreaterDepth,
    MeshBasicMaterial,
    SphereGeometry,
  } from "three";

  const laserCoreColor = "#9be6ff";
  const laserShellColor = "#66d9ff";
  const laserGlowColor = "#3aa7ff";

  const projectileHaloGeometry = new CylinderGeometry(0.82, 0.58, 3.84, 12);
  const projectileTrailGeometry = new CylinderGeometry(0.48, 0.21, 2.85, 12);
  const projectileCoreGeometry = new CylinderGeometry(0.26, 0.32, 2.64, 12);
  const projectileHeadGeometry = new ConeGeometry(0.36, 1.38, 12);
  const projectileParticleGeometry = new SphereGeometry(0.12, 8, 6);
  const rocketGlowGeometry = new CylinderGeometry(0.72, 0.84, 4.9, 12);
  const rocketBodyGeometry = new CylinderGeometry(0.42, 0.58, 3.2, 12);

  const laserHaloMaterial = new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: laserGlowColor,
    depthFunc: GreaterDepth,
    depthWrite: false,
    opacity: 0.34,
    toneMapped: false,
    transparent: true,
  });
  const laserTrailMaterial = new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: laserShellColor,
    depthWrite: false,
    opacity: 0.62,
    toneMapped: false,
    transparent: true,
  });
  const laserCoreMaterial = new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: laserCoreColor,
    depthWrite: false,
    opacity: 0.92,
    toneMapped: false,
    transparent: true,
  });
  const laserHeadMaterial = new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: "#dffcff",
    depthWrite: false,
    opacity: 0.96,
    toneMapped: false,
    transparent: true,
  });
  const laserParticleMaterial = new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: laserShellColor,
    depthWrite: false,
    opacity: 0.58,
    toneMapped: false,
    transparent: true,
  });
  const rocketGlowMaterial = new MeshBasicMaterial({
    color: "#dffcff",
    depthFunc: GreaterDepth,
    depthWrite: false,
    opacity: 0.34,
    transparent: true,
  });
</script>

<script lang="ts">
  import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d-compat";
  import { T, useTask } from "@threlte/core";
  import { Collider, RigidBody, type SensorEnterEvent } from "@threlte/rapier";
  import { onMount } from "svelte";
  import { MathUtils, Vector3 } from "three";
  import type { Vec3 } from "$lib/types/game";
  import type { ProjectileProps } from "$lib/types/game-components";

  type SensorEnterPayload = Parameters<NonNullable<SensorEnterEvent>>[0];

  const projectileVelocity = new Vector3();
  const currentPosition = new Vector3();
  const impactPosition = new Vector3();
  const lateralDirection = new Vector3();
  const desiredDirection = new Vector3();
  const homingTarget = new Vector3();

  let rigidBody = $state<RapierRigidBody>();
  let hasExpired = false;
  let flightTime = 0;
  let ttlTimer = 0;
  let armed = false;
  let visualYaw = $state(0);
  let trailBackOffset = $state(1.38);

  let {
    data,
    enemyTargets = [],
    onExpire,
    onImpact,
    onMove,
  }: ProjectileProps = $props();

  const expireProjectile = () => {
    if (hasExpired) {
      return;
    }

    hasExpired = true;
    onExpire?.(data.id);
  };

  const impactProjectile = () => {
    if (hasExpired) {
      return;
    }

    const translation = rigidBody?.translation();
    const velocity = rigidBody?.linvel();
    const impactVelocity: Vec3 = [
      velocity?.x ?? data.velocity[0],
      velocity?.y ?? data.velocity[1],
      velocity?.z ?? data.velocity[2],
    ];

    currentPosition.set(
      translation?.x ?? data.position[0],
      translation?.y ?? data.position[1],
      translation?.z ?? data.position[2]
    );
    projectileVelocity.set(
      impactVelocity[0],
      impactVelocity[1],
      impactVelocity[2]
    );
    impactPosition.copy(currentPosition);

    if (projectileVelocity.lengthSq() > 0) {
      impactPosition.addScaledVector(
        projectileVelocity.normalize(),
        -data.build.radius * 0.38
      );
    }

    onImpact?.({
      color: laserGlowColor,
      core: laserCoreColor,
      position: [impactPosition.x, impactPosition.y, impactPosition.z],
      radius: Math.max(0.26, data.build.radius * 1.35),
      velocity: impactVelocity,
    });
    expireProjectile();
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
    armed ||= flightTime > 0.05;

    const velocity = body.linvel();
    projectileVelocity.set(velocity.x, velocity.y, velocity.z);
    const translation = body.translation();
    currentPosition.set(translation.x, translation.y, translation.z);
    visualYaw = Math.atan2(projectileVelocity.x, projectileVelocity.z);

    trailBackOffset = MathUtils.lerp(
      trailBackOffset,
      1.5 + Math.sin(flightTime * 34) * 0.083,
      Math.min(1, delta * 16)
    );

    onMove?.(data.id, translation.x, translation.y, translation.z);

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

  const handleSensorEnter = ({ targetCollider }: SensorEnterPayload) => {
    if (hasExpired || !armed || data.build.homingTurn > 0) {
      return;
    }

    if (targetCollider.isSensor()) {
      return;
    }

    impactProjectile();
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
    type="dynamic"
  >
    <Collider
      shape="ball"
      args={[data.build.radius]}
      density={data.build.mass}
      friction={0.08}
      onsensorenter={handleSensorEnter}
      restitution={0}
      sensor
    />

    {#if data.build.homingTurn > 0}
      <T.Group
        rotation={[
          0,
          visualYaw,
          0,
        ]}
      >
        <T.Mesh
          geometry={rocketGlowGeometry}
          material={rocketGlowMaterial}
          renderOrder={28}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[
            data.build.radius,
            data.build.radius,
            data.build.radius,
          ]}
        />

        <T.Mesh
          geometry={rocketBodyGeometry}
          castShadow
          rotation={[Math.PI / 2, 0, 0]}
          scale={[
            data.build.radius,
            data.build.radius,
            data.build.radius,
          ]}
        >
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
          geometry={projectileHaloGeometry}
          material={laserHaloMaterial}
          renderOrder={28}
          position={[0, 0, data.build.radius * 0.24]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[
            data.build.radius,
            data.build.radius,
            data.build.radius,
          ]}
        />

        <T.Mesh
          geometry={projectileTrailGeometry}
          material={laserTrailMaterial}
          renderOrder={29}
          position={[0, 0, -data.build.radius * trailBackOffset]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[
            data.build.radius,
            data.build.radius,
            data.build.radius,
          ]}
        />

        <T.Mesh
          geometry={projectileCoreGeometry}
          material={laserCoreMaterial}
          renderOrder={30}
          position={[0, 0, data.build.radius * 0.84]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[
            data.build.radius,
            data.build.radius,
            data.build.radius,
          ]}
        />

        <T.Mesh
          geometry={projectileHeadGeometry}
          material={laserHeadMaterial}
          renderOrder={31}
          position={[0, 0, data.build.radius * 2.16]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[
            data.build.radius,
            data.build.radius,
            data.build.radius,
          ]}
        />

        <T.Mesh
          geometry={projectileParticleGeometry}
          material={laserParticleMaterial}
          renderOrder={32}
          position={[data.build.radius * 0.42, 0, -data.build.radius * 1.38]}
          scale={[
            data.build.radius * 0.72,
            data.build.radius * 0.72,
            data.build.radius * 0.72,
          ]}
        />

        <T.Mesh
          geometry={projectileParticleGeometry}
          material={laserParticleMaterial}
          renderOrder={32}
          position={[-data.build.radius * 0.34, 0, -data.build.radius * 1.89]}
          scale={[
            data.build.radius * 0.52,
            data.build.radius * 0.52,
            data.build.radius * 0.52,
          ]}
        />

        <T.Mesh
          geometry={projectileParticleGeometry}
          material={laserParticleMaterial}
          renderOrder={32}
          position={[data.build.radius * 0.14, 0, -data.build.radius * 2.43]}
          scale={[
            data.build.radius * 0.38,
            data.build.radius * 0.38,
            data.build.radius * 0.38,
          ]}
        />
      </T.Group>
    {/if}
  </RigidBody>
</T.Group>
