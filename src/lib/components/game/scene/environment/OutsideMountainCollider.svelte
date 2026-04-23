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

  let { chunk = {}, segments = 64 }: Props = $props();
  const c = { ...DEFAULT_CHUNK, ...chunk };
  const halfW = c.width * 0.5;
  const halfD = c.depth * 0.5;
  const innerF = c.mountainInnerFactor + 0.02; // collider slightly inside the rising ring

  // Generate rectangular-perimeter collider bricks so the chunk feels
  // walled in by the mountain mass. Each brick is positioned along the
  // rectangle at `innerF` fraction of the half-extents.
  const bricks = $derived.by(() => {
    const out: {
      id: string;
      x: number;
      z: number;
      rotY: number;
      length: number;
    }[] = [];
    const perimeter = 2 * (halfW + halfD) * innerF * 2;
    const brickLen = perimeter / segments;
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      // Walk the rectangle perimeter
      const full = 2 * (halfW + halfD) * innerF * 2;
      let p = t * full;
      let x = 0;
      let z = 0;
      let rotY = 0;
      const top = halfD * innerF;
      const bottom = -halfD * innerF;
      const left = -halfW * innerF;
      const right = halfW * innerF;
      const W = halfW * innerF * 2;
      const D = halfD * innerF * 2;
      if (p < W) {
        // top edge (+Z)
        x = left + p;
        z = top;
        rotY = 0;
      } else if (p < W + D) {
        // right edge
        x = right;
        z = top - (p - W);
        rotY = Math.PI / 2;
      } else if (p < 2 * W + D) {
        // bottom edge (-Z)
        x = right - (p - (W + D));
        z = bottom;
        rotY = 0;
      } else {
        // left edge
        x = left;
        z = bottom + (p - (2 * W + D));
        rotY = Math.PI / 2;
      }
      out.push({ id: `mt-${i}`, x, z, rotY, length: brickLen });
    }
    return out;
  });

  const wallHeight = c.mountainPeakHeight * 0.8;
</script>

{#each bricks as brick (brick.id)}
  <T.Group position={[brick.x, wallHeight / 2, brick.z]} rotation={[0, brick.rotY, 0]}>
    <RigidBody type="fixed">
      <Collider
        shape="cuboid"
        args={[brick.length * 0.6, wallHeight / 2, 0.5]}
      />
    </RigidBody>
  </T.Group>
{/each}
