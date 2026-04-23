<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { outsidePlan } from "$lib/game/outside-chunk-context";

  // Physical colliders for every vegetation instance that declared one
  // in the registry. Trees get narrow cylinders at their trunk, big
  // rocks get spheres. Small bushes / ferns are collider-less so the
  // player can roll straight through them.
  const plan = outsidePlan();
  const solid = plan.vegetation.instances.filter((i) => !!i.collider);
</script>

{#each solid as inst (inst.id)}
  {@const collider = inst.collider!}
  {@const scale = inst.scale}
  {@const offset = (collider.yOffset ?? 0) * scale}
  <T.Group position={[inst.x, inst.y + offset, inst.z]} rotation={[0, inst.rotationY, 0]}>
    <RigidBody type="fixed">
      {#if collider.shape === "cylinder"}
        <Collider
          shape="cylinder"
          args={[(collider.height ?? 1) * 0.5 * scale, collider.radius * scale]}
          friction={0.8}
        />
      {:else}
        <Collider
          shape="ball"
          args={[collider.radius * scale]}
          friction={0.9}
        />
      {/if}
    </RigidBody>
  </T.Group>
{/each}
