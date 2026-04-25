<script module lang="ts">
  import {
    AdditiveBlending as additiveBlending,
    BoxGeometry,
    ConeGeometry,
    CylinderGeometry,
    MeshBasicMaterial,
    RingGeometry,
    SphereGeometry,
  } from "three";

  const beamLaserHaloGeometry = new CylinderGeometry(0.82, 0.58, 1, 12);
  const beamLaserShellGeometry = new CylinderGeometry(0.48, 0.21, 1, 12);
  const beamLaserCoreGeometry = new CylinderGeometry(0.26, 0.32, 1, 12);
  const beamLaserHeadGeometry = new ConeGeometry(0.36, 0.92, 12);
  const beamLaserParticleGeometry = new SphereGeometry(0.12, 8, 6);
  const projectileImpactRingGeometry = new RingGeometry(0.34, 0.43, 36);
  const projectileImpactSparkGeometry = new BoxGeometry(1, 1, 1);
  const beamLaserHaloMaterial = new MeshBasicMaterial({
    blending: additiveBlending,
    color: "#ff1746",
    depthWrite: false,
    opacity: 0.3,
    toneMapped: false,
    transparent: true,
  });
  const beamLaserShellMaterial = new MeshBasicMaterial({
    blending: additiveBlending,
    color: "#ff365f",
    depthWrite: false,
    opacity: 0.66,
    toneMapped: false,
    transparent: true,
  });
  const beamLaserCoreMaterial = new MeshBasicMaterial({
    blending: additiveBlending,
    color: "#ffe1e8",
    depthWrite: false,
    opacity: 0.95,
    toneMapped: false,
    transparent: true,
  });
  const beamLaserHeadMaterial = new MeshBasicMaterial({
    blending: additiveBlending,
    color: "#ffd5dd",
    depthWrite: false,
    opacity: 0.98,
    toneMapped: false,
    transparent: true,
  });
  const beamLaserParticleMaterial = new MeshBasicMaterial({
    blending: additiveBlending,
    color: "#ff6b82",
    depthWrite: false,
    opacity: 0.5,
    toneMapped: false,
    transparent: true,
  });
  const projectileImpactRingMaterial = new MeshBasicMaterial({
    blending: additiveBlending,
    color: "#9be6ff",
    depthTest: false,
    depthWrite: false,
    opacity: 0.58,
    toneMapped: false,
    transparent: true,
  });
  const projectileImpactSparkMaterial = new MeshBasicMaterial({
    blending: additiveBlending,
    color: "#3aa7ff",
    depthTest: false,
    depthWrite: false,
    opacity: 0.6,
    toneMapped: false,
    transparent: true,
  });
  const projectileImpactCoreSparkMaterial = new MeshBasicMaterial({
    blending: additiveBlending,
    color: "#9be6ff",
    depthTest: false,
    depthWrite: false,
    opacity: 0.68,
    toneMapped: false,
    transparent: true,
  });
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import { onMount } from "svelte";
  import { GreaterDepth } from "three";
  import BombActor from "$lib/components/game/scene/BombActor.svelte";
  import EnemyActor from "$lib/components/game/scene/EnemyActor.svelte";
  import GateKeeperArcLaser from "$lib/components/game/scene/GateKeeperArcLaser.svelte";
  import PickupActor from "$lib/components/game/scene/PickupActor.svelte";
  import ShopkeeperActor from "$lib/components/game/scene/ShopkeeperActor.svelte";
  import ShopOfferActor from "$lib/components/game/scene/ShopOfferActor.svelte";
  import WaterWake from "$lib/components/game/scene/WaterWake.svelte";
  import { enemyTemplateById } from "$lib/config/room-templates";
  import { outsidePlan } from "$lib/game/outside-chunk-context";
  import { beamDurationMs } from "$lib/game/scene-layout";
  import { getGameSceneContext } from "$lib/stores/scene-context";
  import type {
    ActiveBeam,
    ActiveBomb,
    ActiveEnemy,
    ActiveEnemyShot,
    ActiveGateLaser,
    ActivePickup,
    Vec3,
  } from "$lib/types/game";

  let {
    activeActorsVisible = true,
    actorWarmupEnabled = true,
  }: {
    activeActorsVisible?: boolean;
    actorWarmupEnabled?: boolean;
  } = $props();

  const scene = getGameSceneContext();
  const { combat, pickups, player, timing } = scene;
  const outsideFinaleResolved = $derived(
    scene.currentRoomTemplate.id === "outside-start" &&
      scene.room.clearedSet.has(scene.currentRoom.id)
  );
  const combatActorsVisible = $derived(!outsideFinaleResolved);
  const beamSegmentCount = 6;
  const beamSegmentIndexes = Array.from(
    { length: beamSegmentCount },
    (_unused, index) => index
  );
  const beamParticleIndexes = [0, 1, 2];
  const beamLightIndexes = [0, 1];
  const enemyWarmups: ActiveEnemy[] = [
    "scrap-runner",
    "coil-sentry",
    "iron-warden",
    "mine-herald",
    "gate-keeper",
  ].map((templateId, index) => {
    const template = enemyTemplateById[templateId];

    return {
      behavior: template.behavior,
      bombArmMs: template.bombArmMs,
      bombColor: template.bombColor,
      bombCooldownMs: template.bombCooldownMs,
      bombCount: template.bombCount,
      bombDamage: template.bombDamage,
      bombExplosionRadius: template.bombExplosionRadius,
      bombHp: template.bombHp,
      bombMaxActive: template.bombMaxActive,
      bombRadius: template.bombRadius,
      bombSpeed: template.bombSpeed,
      bombTtlMs: template.bombTtlMs,
      color: template.color,
      hp: template.hp,
      id: `enemy-warmup-${templateId}`,
      knockbackVelocity: [0, 0, 0],
      lastBombAt: 0,
      lastHitAt: 0,
      lastShotAt: 0,
      maxHp: template.hp,
      moveSpeed: template.moveSpeed,
      position: [(index - 2) * 2, 0.62, 0],
      preferredRange: template.preferredRange,
      radius: template.radius,
      shotColor: template.shotColor,
      shotDamage: template.shotDamage,
      shotIntervalMs: template.shotIntervalMs,
      shotSpeed: template.shotSpeed,
      templateId: template.id,
      touchDamage: template.touchDamage,
      touchIntervalMs: template.touchIntervalMs,
    };
  });
  const bombWarmups: ActiveBomb[] = [
    {
      armAt: 1200,
      color: "#ff6f58",
      damage: 1,
      expiresAt: 5000,
      explosionRadius: 1.4,
      hp: 4,
      id: "bomb-warmup",
      lastHitAt: 0,
      maxHp: 4,
      originId: "enemy-warmup-mine-herald",
      position: [0, 0.34, 0],
      radius: 0.34,
      spawnedAt: 0,
      velocity: [0, 0, 0],
    },
  ];
  const enemyShotWarmups: ActiveEnemyShot[] = [
    {
      color: "#ffd6a0",
      damage: 1,
      id: "enemy-shot-warmup",
      position: [0, 0.62, 0],
      radius: 0.18,
      ttlMs: 1000,
      velocity: [0, 0, 1],
    },
  ];
  const gateLaserWarmups: ActiveGateLaser[] = [
    {
      arcSpan: 1.96,
      center: [0, 0, 0],
      color: "#ff8f38",
      core: "#ffe0a0",
      createdAt: 0,
      damage: 2,
      fadeMs: 420,
      id: "gate-laser-warmup",
      originId: "enemy-warmup-gate-keeper",
      radius: 8.5,
      startAngle: -0.98,
      sweepMs: 1320,
      telegraphMs: 720,
      width: 0.46,
    },
  ];
  const pickupWarmups: ActivePickup[] = [
    {
      createdAt: 0,
      id: "pickup-warmup-gear",
      kind: "gear",
      position: [0, 0.54, 0],
      radius: 0.38,
      value: 1,
    },
    {
      createdAt: 0,
      id: "pickup-warmup-key",
      kind: "key",
      position: [1.3, 0.54, 0],
      radius: 0.52,
      value: 1,
    },
    {
      createdAt: 0,
      id: "pickup-warmup-heal",
      kind: "heal",
      position: [-1.3, 0.54, 0],
      radius: 0.46,
      value: 1,
    },
  ];
  const projectileLightIndexes = Array.from({ length: 6 }, (_, index) => index);
  const projectileImpactLightIndexes = Array.from(
    { length: 8 },
    (_, index) => index
  );
  const lightParkingPosition: Vec3 = [0, -100, 0];
  const beamLaserPositionOffsetY = 0.03;

  const getBeamFade = (beam: ActiveBeam) => {
    const age = Math.max(0, (timing.now - beam.createdAt) / beamDurationMs);

    return Math.max(0, 1 - age);
  };
  const getBeamVisualScale = (beam: ActiveBeam) =>
    Math.max(0.16, beam.width * 0.95);
  const getBeamFadedScale = (beam: ActiveBeam) =>
    getBeamVisualScale(beam) * (0.35 + getBeamFade(beam) * 0.65);
  const getBeamHeadLength = (beam: ActiveBeam) =>
    Math.max(0.62, getBeamVisualScale(beam) * 3.8);
  const getBeamCurveX = (beam: ActiveBeam, normalizedDistance: number) =>
    beam.curve > 0.25
      ? Math.sin(normalizedDistance * Math.PI * (1.7 + beam.curve * 0.08)) *
        beam.curve *
        0.32
      : 0;
  const getBeamSegmentPosition = (beam: ActiveBeam, index: number): Vec3 => {
    const normalizedDistance = (index + 0.5) / beamSegmentCount;

    return [
      getBeamCurveX(beam, normalizedDistance),
      beamLaserPositionOffsetY,
      normalizedDistance * beam.length,
    ];
  };
  const getBeamParticlePosition = (beam: ActiveBeam, index: number): Vec3 => {
    const normalizedDistance = [0.28, 0.54, 0.78][index] ?? 0.5;
    const side = index % 2 === 0 ? 1 : -1;
    const radius = getBeamFadedScale(beam);

    return [
      getBeamCurveX(beam, normalizedDistance) + side * radius * 1.1,
      beamLaserPositionOffsetY + (index === 1 ? radius * 0.32 : -radius * 0.18),
      normalizedDistance * beam.length,
    ];
  };
  const getBeamParticleScale = (beam: ActiveBeam, index: number): Vec3 => {
    const scale =
      getBeamFadedScale(beam) *
      getBeamFade(beam) *
      ([0.92, 0.68, 0.52][index] ?? 0.52);

    return [scale, scale, scale];
  };

  let actorWarmupVisible = $state(true);

  onMount(() => {
    if (!actorWarmupEnabled) {
      actorWarmupVisible = false;
      return;
    }

    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        actorWarmupVisible = false;
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  });

  const playerHealPosition = $derived([
    player.lastPosition[0],
    player.lastPosition[1],
    player.lastPosition[2],
  ] as [number, number, number]);

  const outsideShopkeeper = $derived.by(() => {
    if (scene.currentRoomTemplate.layout !== "outside-yard") {
      return null;
    }
    return outsidePlan().shopkeeper;
  });
  const projectileLightSlots = $derived.by(() => {
    timing.now;
    const activeProjectiles = combat.projectiles.slice(-6);

    return projectileLightIndexes.map((index) => {
      const projectile = activeProjectiles[index];
      const position = projectile
        ? (combat.projectilePositions.get(projectile.id) ?? projectile.position)
        : lightParkingPosition;

      return {
        id: index,
        intensity: projectile ? 0.72 : 0,
        position,
      };
    });
  });
  $effect(() => {
    const beam = combat.beams.at(-1);
    const fade = beam ? getBeamFade(beam) : 0;
    const softFade = fade * fade;

    beamLaserHaloMaterial.opacity = softFade * 0.3;
    beamLaserShellMaterial.opacity = softFade * 0.66;
    beamLaserCoreMaterial.opacity = softFade * 0.95;
    beamLaserHeadMaterial.opacity = softFade * 0.98;
    beamLaserParticleMaterial.opacity = softFade * 0.5;
  });
  const beamLightSlots = $derived.by(() => {
    const beam = combat.beams.at(-1);

    return beamLightIndexes.map((index) => {
      if (!beam) {
        return {
          id: index,
          intensity: 0,
          position: lightParkingPosition,
        };
      }

      const slot = index % 2;
      const age = Math.min(1, (timing.now - beam.createdAt) / beamDurationMs);
      const fade = Math.max(0, 1 - age);
      const distanceAlong = slot === 0 ? 0.6 : beam.length * 0.58;

      return {
        id: index,
        intensity: fade * fade * (slot === 0 ? 6.4 : 3.8),
        position: [
          beam.position[0] + Math.sin(beam.rotationY) * distanceAlong,
          beam.position[1] + 0.48,
          beam.position[2] + Math.cos(beam.rotationY) * distanceAlong,
        ] as Vec3,
      };
    });
  });
  const projectileImpactLightSlots = $derived.by(() => {
    const activeImpacts = combat.projectileImpactBursts.slice(-8);

    return projectileImpactLightIndexes.map((index) => {
      const burst = activeImpacts[index];

      if (!burst) {
        return {
          id: index,
          intensity: 0,
          position: lightParkingPosition,
        };
      }

      const age = Math.min(1, (timing.now - burst.createdAt) / 320);
      const fade = 1 - age;

      return {
        id: index,
        intensity: fade * 1.1,
        position: [
          burst.position[0],
          burst.position[1] + burst.radius * 0.18,
          burst.position[2],
        ] as Vec3,
      };
    });
  });
</script>

{#if actorWarmupEnabled}
  <T.Group
    visible={actorWarmupVisible}
    position={[0, 0.02, 0]}
    scale={[0.001, 0.001, 0.001]}
  >
    {#each enemyWarmups as enemy (enemy.id)}
      <EnemyActor animationNow={0} {enemy} />
    {/each}

    {#each bombWarmups as bomb (bomb.id)}
      <BombActor animationNow={0} {bomb} />
    {/each}

    {#each pickupWarmups as pickup (pickup.id)}
      <PickupActor animationNow={0} {pickup} />
    {/each}

    {#each enemyShotWarmups as shot (shot.id)}
      <T.Group position={shot.position}>
        <T.Mesh renderOrder={28} scale={[1.35, 1.35, 1.35]}>
          <T.SphereGeometry args={[shot.radius, 16, 16]} />
          <T.MeshBasicMaterial
            color="#ff8068"
            depthFunc={GreaterDepth}
            depthWrite={false}
            opacity={0.36}
            transparent
          />
        </T.Mesh>

        <T.Mesh castShadow>
          <T.SphereGeometry args={[shot.radius, 16, 16]} />
          <T.MeshStandardMaterial
            color={shot.color}
            emissive={shot.color}
            emissiveIntensity={0.7}
            metalness={0.08}
            roughness={0.16}
          />
        </T.Mesh>
      </T.Group>
    {/each}

    {#each gateLaserWarmups as laser (laser.id)}
      <GateKeeperArcLaser animationNow={900} {laser} />
    {/each}

    <T.Mesh
      geometry={projectileImpactRingGeometry}
      material={projectileImpactRingMaterial}
    />
    <T.Mesh
      geometry={projectileImpactSparkGeometry}
      material={projectileImpactSparkMaterial}
    />
    <T.Mesh
      geometry={projectileImpactSparkGeometry}
      material={projectileImpactCoreSparkMaterial}
    />
    <T.Mesh
      geometry={beamLaserHaloGeometry}
      material={beamLaserHaloMaterial}
      rotation={[Math.PI / 2, 0, 0]}
    />
    <T.Mesh
      geometry={beamLaserShellGeometry}
      material={beamLaserShellMaterial}
      rotation={[Math.PI / 2, 0, 0]}
    />
    <T.Mesh
      geometry={beamLaserCoreGeometry}
      material={beamLaserCoreMaterial}
      rotation={[Math.PI / 2, 0, 0]}
    />
    <T.Mesh
      geometry={beamLaserHeadGeometry}
      material={beamLaserHeadMaterial}
      rotation={[Math.PI / 2, 0, 0]}
    />
    <T.Mesh
      geometry={beamLaserParticleGeometry}
      material={beamLaserParticleMaterial}
    />
  </T.Group>
{/if}

{#each projectileLightSlots as light (light.id)}
  <T.PointLight
    color="#3aa7ff"
    distance={2.8}
    intensity={light.intensity}
    position={light.position}
  />
{/each}

{#each beamLightSlots as light (light.id)}
  <T.PointLight
    color="#ff2d55"
    decay={1.4}
    distance={8.8}
    intensity={light.intensity}
    position={light.position}
  />
{/each}

{#each projectileImpactLightSlots as light (light.id)}
  <T.PointLight
    color="#9be6ff"
    distance={2.8}
    intensity={light.intensity}
    position={light.position}
  />
{/each}

{#if activeActorsVisible}
  {#each pickups.items as pickup (pickup.id)}
    <PickupActor animationNow={timing.now} {pickup} />
  {/each}

  {#if scene.currentRoom.kind === "shop"}
    <ShopkeeperActor animationNow={timing.now} />
  {/if}

  {#if outsideShopkeeper}
    <ShopkeeperActor
      animationNow={timing.now}
      position={[outsideShopkeeper.x, outsideShopkeeper.y, outsideShopkeeper.z]}
      rotationY={outsideShopkeeper.rotationY}
    />
  {/if}

  {#each scene.availableShopOffers as offer (offer.id)}
    <ShopOfferActor animationNow={timing.now} {offer} />
  {/each}

  <T.Group visible={combatActorsVisible}>
    {#each combat.enemies as enemy (enemy.id)}
      <EnemyActor animationNow={timing.now} {enemy} />
    {/each}

    {#if scene.currentRoomTemplate.layout === "outside-yard"}
      <WaterWake position={scene.player.lastPosition} radius={0.62} />

      {#each combat.enemies as enemy (enemy.id)}
        <WaterWake
          opacity={0.2}
          position={enemy.position}
          radius={enemy.radius}
        />
      {/each}
    {/if}

    {#each combat.bombs as bomb (bomb.id)}
      <BombActor animationNow={timing.now} {bomb} />
    {/each}

    {#each combat.enemyShots as shot (shot.id)}
      <T.Group position={shot.position}>
        <T.Mesh renderOrder={28} scale={[1.35, 1.35, 1.35]}>
          <T.SphereGeometry args={[shot.radius, 16, 16]} />
          <T.MeshBasicMaterial
            color="#ff8068"
            depthFunc={GreaterDepth}
            depthWrite={false}
            opacity={0.36}
            transparent
          />
        </T.Mesh>

        <T.Mesh castShadow>
          <T.SphereGeometry args={[shot.radius, 16, 16]} />
          <T.MeshStandardMaterial
            color={shot.color}
            emissive={shot.color}
            emissiveIntensity={0.7}
            metalness={0.08}
            roughness={0.16}
          />
        </T.Mesh>
      </T.Group>
    {/each}

    {#each combat.gateLasers as laser (laser.id)}
      <GateKeeperArcLaser animationNow={timing.now} {laser} />
    {/each}
  </T.Group>

  {#each scene.deflectBurstsRendered as burst (burst.id)}
    <T.Group position={burst.position}>
      {#each burst.shards as shard, shardIndex (shardIndex)}
        <T.Mesh
          position={shard.position}
          rotation={shard.rotation}
          scale={[shard.scale, shard.scale, shard.scale]}
        >
          <T.BoxGeometry
            args={[
            burst.radius * 0.55,
            burst.radius * 0.55,
            burst.radius * 0.55,
          ]}
          />
          <T.MeshBasicMaterial
            color={burst.color}
            depthWrite={false}
            opacity={burst.fade}
            transparent
          />
        </T.Mesh>
      {/each}
    </T.Group>
  {/each}

  {#each scene.projectileImpactBurstsRendered as burst (burst.id)}
    <T.Group
      position={[
      burst.position[0],
      burst.position[1] + burst.radius * 0.18,
      burst.position[2],
    ]}
    >
      <T.Mesh
        geometry={projectileImpactRingGeometry}
        material={projectileImpactRingMaterial}
        renderOrder={70}
        rotation={[-Math.PI / 2, 0, burst.age * 3.2]}
        scale={[burst.ringScale, burst.ringScale, 1]}
      />

      {#each burst.sparks as spark, index (index)}
        <T.Mesh
          geometry={projectileImpactSparkGeometry}
          material={spark.color === burst.core
          ? projectileImpactCoreSparkMaterial
          : projectileImpactSparkMaterial}
          position={spark.position}
          renderOrder={71}
          rotation={spark.rotation}
          scale={spark.scale}
        />
      {/each}
    </T.Group>
  {/each}

  {#each scene.healBurstsRendered as burst (burst.id)}
    <T.Group position={playerHealPosition}>
      <T.Mesh
        position={[0, 0.92 + burst.age * 0.52, 0]}
        rotation={[-Math.PI / 2, 0, burst.age * 4.8]}
        scale={[1 + burst.age * 0.55, 1 + burst.age * 0.55, 1]}
      >
        <T.TorusGeometry args={[0.44, 0.018, 8, 42]} />
        <T.MeshBasicMaterial
          color="#7dffd7"
          depthWrite={false}
          opacity={burst.fade * 0.46}
          toneMapped={false}
          transparent
        />
      </T.Mesh>
      {#each burst.particles as particle, index (index)}
        <T.Mesh
          position={particle.position}
          scale={[particle.scale, particle.scale, particle.scale]}
        >
          <T.SphereGeometry args={[1, 10, 10]} />
          <T.MeshBasicMaterial
            color={particle.color}
            depthWrite={false}
            opacity={particle.opacity}
            toneMapped={false}
            transparent
          />
        </T.Mesh>
      {/each}
    </T.Group>
  {/each}

  {#each combat.beams as beam (beam.id)}
    <T.Group position={beam.position} rotation={[0, beam.rotationY, 0]}>
      {#if beam.curve > 0.25}
        {#each beamSegmentIndexes as index}
          <T.Mesh
            geometry={beamLaserHaloGeometry}
            material={beamLaserHaloMaterial}
            position={getBeamSegmentPosition(beam, index)}
            renderOrder={44}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[
            getBeamFadedScale(beam),
            beam.length / beamSegmentCount,
            getBeamFadedScale(beam),
          ]}
          />

          <T.Mesh
            geometry={beamLaserShellGeometry}
            material={beamLaserShellMaterial}
            position={getBeamSegmentPosition(beam, index)}
            renderOrder={45}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[
            getBeamFadedScale(beam),
            beam.length / beamSegmentCount,
            getBeamFadedScale(beam),
          ]}
          />

          <T.Mesh
            geometry={beamLaserCoreGeometry}
            material={beamLaserCoreMaterial}
            position={getBeamSegmentPosition(beam, index)}
            renderOrder={46}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[
            getBeamFadedScale(beam),
            beam.length / beamSegmentCount,
            getBeamFadedScale(beam),
          ]}
          />
        {/each}
      {:else}
        <T.Mesh
          geometry={beamLaserHaloGeometry}
          material={beamLaserHaloMaterial}
          position={[0, beamLaserPositionOffsetY, beam.length * 0.5]}
          renderOrder={44}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[getBeamFadedScale(beam), beam.length, getBeamFadedScale(beam)]}
        />

        <T.Mesh
          geometry={beamLaserShellGeometry}
          material={beamLaserShellMaterial}
          position={[0, beamLaserPositionOffsetY, beam.length * 0.5]}
          renderOrder={45}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[getBeamFadedScale(beam), beam.length, getBeamFadedScale(beam)]}
        />

        <T.Mesh
          geometry={beamLaserCoreGeometry}
          material={beamLaserCoreMaterial}
          position={[0, beamLaserPositionOffsetY, beam.length * 0.5]}
          renderOrder={46}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[getBeamFadedScale(beam), beam.length, getBeamFadedScale(beam)]}
        />
      {/if}

      <T.Mesh
        geometry={beamLaserHeadGeometry}
        material={beamLaserHeadMaterial}
        position={[
        getBeamCurveX(beam, 1),
        beamLaserPositionOffsetY,
        beam.length + getBeamHeadLength(beam) * 0.18,
      ]}
        renderOrder={47}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[
        getBeamFadedScale(beam),
        getBeamHeadLength(beam),
        getBeamFadedScale(beam),
      ]}
      />

      {#each beamParticleIndexes as particleIndex}
        <T.Mesh
          geometry={beamLaserParticleGeometry}
          material={beamLaserParticleMaterial}
          position={getBeamParticlePosition(beam, particleIndex)}
          renderOrder={48}
          scale={getBeamParticleScale(beam, particleIndex)}
        />
      {/each}
    </T.Group>
  {/each}
{/if}
