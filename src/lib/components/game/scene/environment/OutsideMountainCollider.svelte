<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { outsidePlan } from "$lib/game/outside-chunk-context";

  interface Props {
    segments?: number;
  }

  let { segments = 24 }: Props = $props();

  // Invisible safety-net walls on the east/west sides of the chunk so
  // the player can't slip past the canyon cliffs even if they gain
  // momentum up the trimesh terrain.
  const plan = outsidePlan();
  const halfW = plan.size.width * 0.5;
  const halfD = plan.size.depth * 0.5;
  const wallX = halfW * 0.6;
  const brickLen = (halfD * 2) / segments;
  const wallHeight = 38;

  const bricks = Array.from({ length: segments }, (_, i) => {
    const t = (i + 0.5) / segments;
    const z = -halfD + t * halfD * 2;
    return { id: `brick-${i}`, z };
  });
</script>

{#each bricks as brick (brick.id)}
  <T.Group position={[wallX, wallHeight / 2, brick.z]}>
    <RigidBody type="fixed">
      <Collider shape="cuboid" args={[0.6, wallHeight / 2, brickLen * 0.6]} />
    </RigidBody>
  </T.Group>
  <T.Group position={[-wallX, wallHeight / 2, brick.z]}>
    <RigidBody type="fixed">
      <Collider shape="cuboid" args={[0.6, wallHeight / 2, brickLen * 0.6]} />
    </RigidBody>
  </T.Group>
{/each}
