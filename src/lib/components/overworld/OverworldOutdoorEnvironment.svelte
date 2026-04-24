<script lang="ts">
  import { useTask } from "@threlte/core";
  import { onMount } from "svelte";
  import {
    isInteractable,
    OVERWORLD_INTERACT_RADIUS,
    type OverworldLayout,
  } from "$lib/config/overworld-layout";
  import { enemyTemplateById } from "$lib/config/room-templates";
  import { overworldState } from "$lib/stores/overworld-state.svelte";
  import { getGameSceneContext } from "$lib/stores/scene-context";
  import type { ActiveEnemy } from "$lib/types/game";
  import OverworldChestEntity from "./OverworldChest.svelte";
  import OverworldHealthPickupEntity from "./OverworldHealthPickup.svelte";
  import OverworldPoi from "./OverworldPoi.svelte";
  import OverworldScenery from "./OverworldScenery.svelte";

  interface Props {
    layout: OverworldLayout;
  }

  let { layout }: Props = $props();

  const scene = getGameSceneContext();
  const interactablePois = $derived(
    layout.pois.filter((p) => isInteractable(p.kind))
  );

  let openedChestIds = $state<Set<string>>(new Set());
  let consumedPickupIds = $state<Set<string>>(new Set());
  let playerXYZ = $state<[number, number, number]>([0, 0, 0]);

  const spawnOverworldEnemies = () => {
    const now = performance.now();
    scene.combat.enemies = layout.encounters.map((encounter, index) => {
      const template = enemyTemplateById[encounter.templateId];
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
        id: encounter.id,
        knockbackVelocity: [0, 0, 0] as [number, number, number],
        lastBombAt: now - index * 180,
        lastHitAt: 0,
        lastShotAt: now - index * 180,
        maxHp: template.hp,
        moveSpeed: template.moveSpeed,
        position: [
          encounter.position[0],
          encounter.position[1],
          encounter.position[2],
        ] as [number, number, number],
        preferredRange: template.preferredRange,
        radius: template.radius,
        shotColor: template.shotColor,
        shotDamage: template.shotDamage,
        shotIntervalMs: template.shotIntervalMs,
        shotSpeed: template.shotSpeed,
        templateId: template.id,
        touchDamage: template.touchDamage,
        touchIntervalMs: template.touchIntervalMs,
      } satisfies ActiveEnemy;
    });
  };

  onMount(() => {
    scene.room.teleportTo(layout.spawn);
  });

  let lastSeenTeleportNonce = -1;
  $effect(() => {
    const nonce = scene.room.teleportNonce;
    if (nonce === lastSeenTeleportNonce) {
      return;
    }
    lastSeenTeleportNonce = nonce;
    queueMicrotask(spawnOverworldEnemies);
  });

  const handlePickupCollected = (id: string) => {
    if (consumedPickupIds.has(id)) {
      return;
    }
    consumedPickupIds = new Set([...consumedPickupIds, id]);
  };

  const handleChestOpened = (id: string) => {
    if (openedChestIds.has(id)) {
      return;
    }
    openedChestIds = new Set([...openedChestIds, id]);
  };

  useTask(() => {
    const pos = scene.player.lastPosition;
    playerXYZ = [pos[0], pos[1], pos[2]];
    if (typeof window !== "undefined") {
      (window as unknown as { __owPos?: typeof pos }).__owPos = pos;
    }
    let nearestId: string | null = null;
    let nearestSq = Number.POSITIVE_INFINITY;
    for (const poi of interactablePois) {
      const dx = poi.position[0] - pos[0];
      const dz = poi.position[2] - pos[2];
      const distSq = dx * dx + dz * dz;
      if (
        distSq < OVERWORLD_INTERACT_RADIUS * OVERWORLD_INTERACT_RADIUS &&
        distSq < nearestSq
      ) {
        nearestSq = distSq;
        nearestId = poi.id;
      }
    }
    if (overworldState.activePoiId !== nearestId) {
      overworldState.activePoiId = nearestId;
    }
  });

  const avoidList = $derived<[number, number, number][]>([
    ...layout.pois.map(
      (p) =>
        [p.position[0], p.position[1], p.position[2]] as [
          number,
          number,
          number,
        ]
    ),
    ...layout.chests.map(
      (c) =>
        [c.position[0], c.position[1], c.position[2]] as [
          number,
          number,
          number,
        ]
    ),
    ...layout.healthPickups.map(
      (p) =>
        [p.position[0], p.position[1], p.position[2]] as [
          number,
          number,
          number,
        ]
    ),
    ...layout.rivers.map(
      (r) =>
        [r.position[0], r.position[1], r.position[2]] as [
          number,
          number,
          number,
        ]
    ),
  ]);
</script>

<OverworldScenery
  {layout}
  playerPosition={playerXYZ}
  {avoidList}
  withColliders
/>

{#each layout.pois as poi (poi.id)}
  <OverworldPoi {poi} highlighted={poi.id === overworldState.activePoiId} />
{/each}

{#each layout.healthPickups as pickup (pickup.id)}
  {#if !consumedPickupIds.has(pickup.id)}
    <OverworldHealthPickupEntity
      data={pickup}
      onCollected={() => handlePickupCollected(pickup.id)}
    />
  {/if}
{/each}

{#each layout.chests as chest (chest.id)}
  <OverworldChestEntity
    data={chest}
    opened={openedChestIds.has(chest.id)}
    onOpened={() => handleChestOpened(chest.id)}
  />
{/each}
