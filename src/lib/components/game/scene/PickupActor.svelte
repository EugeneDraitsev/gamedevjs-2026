<script lang="ts">
  import { T } from "@threlte/core";
  import { pickupCollectDurationMs } from "$lib/game/pickups";
  import type { ActivePickup } from "$lib/types/game";
  import GearPickupActor from "./pickups/GearPickupActor.svelte";
  import HealPickupActor from "./pickups/HealPickupActor.svelte";
  import KeyPickupActor from "./pickups/KeyPickupActor.svelte";

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
  const collectFade = $derived(
    Math.max(0, Math.min(1, (collect - 0.68) / 0.32))
  );
  const collectFly = $derived(collect * collect * (3 - 2 * collect));
  const collectTarget = $derived(pickup.collectedTo ?? pickup.position);
  const actorOpacity = $derived(spawnEase * (1 - collectFade));
  const actorScale = $derived(spawnScale * (1 - collectEase * 0.72));
  const actorX = $derived(
    pickup.position[0] + (collectTarget[0] - pickup.position[0]) * collectFly
  );
  const actorY = $derived(
    (collectTarget[1] + 0.6 - pickup.position[1]) * collectFly +
      Math.sin(collect * Math.PI) * 0.14
  );
  const actorZ = $derived(
    pickup.position[2] + (collectTarget[2] - pickup.position[2]) * collectFly
  );
</script>

<T.Group position={[actorX, pickup.position[1] + actorY, actorZ]}>
  {#if pickup.kind === "gear"}
    <GearPickupActor
      {animationNow}
      {pickup}
      spawnEase={actorOpacity}
      spawnScale={actorScale}
    />
  {:else if pickup.kind === "heal"}
    <HealPickupActor
      {animationNow}
      {pickup}
      spawnEase={actorOpacity}
      spawnScale={actorScale}
    />
  {:else}
    <KeyPickupActor
      {animationNow}
      {pickup}
      spawnEase={actorOpacity}
      spawnScale={actorScale}
    />
  {/if}
</T.Group>
