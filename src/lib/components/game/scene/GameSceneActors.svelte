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
  import { getGameSceneContext } from "$lib/stores/scene-context";
  import type {
    ActiveBomb,
    ActiveEnemy,
    ActiveEnemyShot,
    ActiveGateLaser,
    ActivePickup,
  } from "$lib/types/game";

  const scene = getGameSceneContext();
  const { combat, pickups, player, timing } = scene;
  const outsideFinaleResolved = $derived(
    scene.currentRoomTemplate.id === "outside-start" &&
      scene.room.clearedSet.has(scene.currentRoom.id)
  );
  const combatActorsVisible = $derived(!outsideFinaleResolved);
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

  let actorWarmupVisible = $state(true);

  onMount(() => {
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
</script>

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
</T.Group>

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
      {#each Array.from({ length: 6 }, (__unused, index) => index) as index}
        <T.Mesh
          position={[
            Math.sin(((index + 0.5) / 6) * Math.PI * (1.7 + beam.curve * 0.08)) *
              beam.curve *
              0.32,
            0,
            ((index + 0.5) / 6) * beam.length,
          ]}
        >
          <T.BoxGeometry args={[beam.width, 0.08, beam.length / 6]} />
          <T.MeshBasicMaterial
            color="#dffcff"
            depthFunc={GreaterDepth}
            depthWrite={false}
            opacity={0.28}
            transparent
          />
        </T.Mesh>

        <T.Mesh
          position={[
            Math.sin(((index + 0.5) / 6) * Math.PI * (1.7 + beam.curve * 0.08)) *
              beam.curve *
              0.32,
            0,
            ((index + 0.5) / 6) * beam.length,
          ]}
        >
          <T.BoxGeometry args={[beam.width, 0.08, beam.length / 6]} />
          <T.MeshStandardMaterial
            color={beam.color}
            emissive={beam.color}
            emissiveIntensity={0.84}
            metalness={0.08}
            opacity={0.82}
            roughness={0.14}
            transparent
          />
        </T.Mesh>
      {/each}
    {:else}
      <T.Mesh position={[0, 0, beam.length * 0.5]}>
        <T.BoxGeometry args={[beam.width, 0.08, beam.length]} />
        <T.MeshBasicMaterial
          color="#dffcff"
          depthFunc={GreaterDepth}
          depthWrite={false}
          opacity={0.28}
          transparent
        />
      </T.Mesh>

      <T.Mesh position={[0, 0, beam.length * 0.5]}>
        <T.BoxGeometry args={[beam.width, 0.08, beam.length]} />
        <T.MeshStandardMaterial
          color={beam.color}
          emissive={beam.color}
          emissiveIntensity={0.84}
          metalness={0.08}
          opacity={0.82}
          roughness={0.14}
          transparent
        />
      </T.Mesh>
    {/if}

    <T.Mesh position={[0, 0, beam.length]}>
      <T.SphereGeometry args={[beam.width * 0.45, 12, 12]} />
      <T.MeshBasicMaterial
        color="#dffcff"
        depthFunc={GreaterDepth}
        depthWrite={false}
        opacity={0.3}
        transparent
      />
    </T.Mesh>

    <T.Mesh position={[0, 0, beam.length]}>
      <T.SphereGeometry args={[beam.width * 0.28, 12, 12]} />
      <T.MeshStandardMaterial
        color={beam.core}
        emissive={beam.core}
        emissiveIntensity={1}
        metalness={0.04}
        roughness={0.12}
      />
    </T.Mesh>
  </T.Group>
{/each}
