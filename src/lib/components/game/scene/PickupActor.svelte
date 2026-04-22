<script lang="ts">
  import { T } from "@threlte/core";
  import { pickupCollectDurationMs } from "$lib/game/pickups";
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
  const collect = $derived(
    pickup.collectedAt === undefined
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            (animationNow - pickup.collectedAt) / pickupCollectDurationMs
          )
        )
  );
  const collectEase = $derived(1 - (1 - collect) ** 2);
  const actorOpacity = $derived(spawnEase * (1 - collectEase));
  const actorScale = $derived(spawnScale * (1 + collectEase * 0.22));
  const actorY = $derived(collectEase * 0.76);
</script>

<T.Group
  position={[pickup.position[0], pickup.position[1] + actorY, pickup.position[2]]}
>
  {#if pickup.kind === "gear"}
    <GearPickupActor
      {animationNow}
      {pickup}
      spawnEase={actorOpacity}
      spawnScale={actorScale}
    />
  {:else}
    <HealPickupActor
      {animationNow}
      {pickup}
      spawnEase={actorOpacity}
      spawnScale={actorScale}
    />
  {/if}
</T.Group>
