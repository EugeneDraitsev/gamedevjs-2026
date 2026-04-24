<script lang="ts">
  import { T } from "@threlte/core";
  import type { ActivePickup } from "$lib/types/game";
  import GearPickupActor from "./pickups/GearPickupActor.svelte";
  import HealPickupActor from "./pickups/HealPickupActor.svelte";

  let {
    animationNow,
    pickup,
  }: {
    animationNow: number;
    pickup: ActivePickup;
  } = $props();

  const spawn = $derived(
    Math.max(0, Math.min(1, (animationNow - pickup.createdAt) / 260))
  );
  const spawnEase = $derived(1 - (1 - spawn) ** 3);
  const spawnScale = $derived(0.62 + spawnEase * 0.38);
</script>

<T.Group position={pickup.position}>
  {#if pickup.kind === "gear"}
    <GearPickupActor {animationNow} {pickup} {spawnEase} {spawnScale} />
  {:else}
    <HealPickupActor {animationNow} {pickup} {spawnEase} {spawnScale} />
  {/if}
</T.Group>
