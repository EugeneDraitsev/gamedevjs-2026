<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import {
    DEFAULT_CHUNK,
    type OutsideChunkParams,
  } from "$lib/game/outside-terrain-noise";

  interface Props {
    chunk?: Partial<OutsideChunkParams>;
    segments?: number;
  }

  let { chunk = {}, segments = 24 }: Props = $props();
  const c = { ...DEFAULT_CHUNK, ...chunk };
  const halfW = c.width * 0.5;
  const halfD = c.depth * 0.5;

  // Canyon walls are only on the X-axis (east/west). North/south stay
  // open since the game-logic room wall already gates the player along Z.
  // Each wall is sliced into vertical bricks so the collider roughly
  // matches the jagged terrain silhouette rather than pretending to be
  // a perfect plane.
  const wallX = halfW * (c.mountainInnerFactor + 0.04);
  const brickLen = (halfD * 2) / segments;
  const wallHeight = c.mountainPeakHeight * 0.9;

  const bricks = Array.from({ length: segments }, (_, i) => {
    const t = (i + 0.5) / segments;
    const z = -halfD + t * halfD * 2;
    return { id: `brick-${i}`, z };
  });
</script>

{#each bricks as brick (brick.id)}
  <!-- East wall -->
  <T.Group position={[wallX, wallHeight / 2, brick.z]}>
    <RigidBody type="fixed">
      <Collider
        shape="cuboid"
        args={[0.6, wallHeight / 2, brickLen * 0.6]}
      />
    </RigidBody>
  </T.Group>
  <!-- West wall -->
  <T.Group position={[-wallX, wallHeight / 2, brick.z]}>
    <RigidBody type="fixed">
      <Collider
        shape="cuboid"
        args={[0.6, wallHeight / 2, brickLen * 0.6]}
      />
    </RigidBody>
  </T.Group>
{/each}
