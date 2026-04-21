<script lang="ts">
  import { onMount } from "svelte";
  import PickupActor from "$lib/components/game/scene/PickupActor.svelte";
  import type { ActivePickup, PickupKind, Vec3 } from "$lib/types/game";
  import ModelTurntable from "./ModelTurntable.svelte";

  let {
    height = "360px",
    kind = "all",
    label = "Pickups",
  }: { height?: string; kind?: PickupKind | "all"; label?: string } = $props();

  let animationNow = $state(0);
  let startedAt = $state(0);

  const allPickups = $derived<ActivePickup[]>([
    {
      createdAt: startedAt,
      id: "gear",
      kind: "gear",
      position: [-0.72, 0.54, 0],
      radius: 0.38,
      value: 3,
    },
    {
      createdAt: startedAt + 90,
      id: "heal",
      kind: "heal",
      position: [0.72, 0.54, 0],
      radius: 0.46,
      value: 1,
    },
  ]);
  const pickups = $derived<ActivePickup[]>(
    kind === "all"
      ? allPickups
      : allPickups
          .filter((pickup) => pickup.kind === kind)
          .map((pickup) => ({
            ...pickup,
            position: [0, pickup.position[1], 0] as Vec3,
          }))
  );

  onMount(() => {
    startedAt = performance.now();

    let frameId = 0;
    const frame = (time: number) => {
      animationNow = time;
      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  });
</script>

<ModelTurntable
  autoRotate={false}
  cameraTargetY={0.08}
  groundY={0}
  {height}
  {label}
>
  {#each pickups as pickup (pickup.id)}
    <PickupActor {animationNow} {pickup} />
  {/each}
</ModelTurntable>
