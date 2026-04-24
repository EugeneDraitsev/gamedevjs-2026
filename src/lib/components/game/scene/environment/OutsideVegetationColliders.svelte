<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import type {
    VegetationColliderSpec,
    VegetationInstance,
  } from "$lib/game/outside-chunk/types";
  import { outsidePlan } from "$lib/game/outside-chunk-context";

  interface SolidVegetationInstance extends VegetationInstance {
    collider: VegetationColliderSpec;
    colliderOffset: number;
  }

  // Physical colliders for every vegetation instance that declared one
  // in the registry. Trees get narrow cylinders at their trunk, big
  // rocks get spheres. Small bushes / ferns are collider-less so the
  // player can roll straight through them.
  const plan = outsidePlan();
  const solid = plan.vegetation.instances.flatMap((inst) => {
    if (!inst.collider) {
      return [];
    }
    return [
      {
        ...inst,
        collider: inst.collider,
        colliderOffset: (inst.collider.yOffset ?? 0) * inst.scale,
      },
    ] satisfies SolidVegetationInstance[];
  });
</script>

{#each solid as inst (inst.id)}
  <T.Group
    position={[inst.x, inst.y + inst.colliderOffset, inst.z]}
    rotation={[0, inst.rotationY, 0]}
  >
    <RigidBody type="fixed">
      {#if inst.collider.shape === "cylinder"}
        <Collider
          shape="cylinder"
          args={[
            (inst.collider.height ?? 1) * 0.5 * inst.scale,
            inst.collider.radius * inst.scale,
          ]}
          friction={0.8}
        />
      {:else}
        <Collider
          shape="ball"
          args={[inst.collider.radius * inst.scale]}
          friction={0.9}
        />
      {/if}
    </RigidBody>
  </T.Group>
{/each}
