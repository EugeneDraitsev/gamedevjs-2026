<script lang="ts">
  import { T } from "@threlte/core";
  import BombActor from "$lib/components/game/scene/BombActor.svelte";
  import EnemyActor from "$lib/components/game/scene/EnemyActor.svelte";
  import { getGameSceneContext } from "$lib/stores/scene-context";

  const scene = getGameSceneContext();
  const { combat, timing } = scene;
</script>

{#each combat.enemies as enemy (enemy.id)}
  <EnemyActor animationNow={timing.now} {enemy} />
{/each}

{#each combat.bombs as bomb (bomb.id)}
  <BombActor animationNow={timing.now} {bomb} />
{/each}

{#each combat.enemyShots as shot (shot.id)}
  <T.Group position={shot.position}>
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
