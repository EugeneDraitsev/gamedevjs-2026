<script lang="ts">
  import { T } from "@threlte/core";
  import type { Texture } from "three";
  import type { Vec3 } from "$lib/types/game";

  let {
    args,
    color = "#ffffff",
    opacity = 0.75,
    position,
    rotation = 0,
    texture = null,
  }: {
    args: Vec3;
    color?: string;
    opacity?: number;
    position: Vec3;
    rotation?: number;
    texture?: Texture | null;
  } = $props();
</script>

{#if texture}
  <T.Group {position} rotation={[0, rotation, 0]}>
    <T.Mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <T.PlaneGeometry args={[args[0] * 2, args[2] * 2]} />
      <T.MeshBasicMaterial
        alphaTest={0.04}
        {color}
        depthWrite={false}
        map={texture}
        {opacity}
        polygonOffset
        polygonOffsetFactor={-3}
        transparent
      />
    </T.Mesh>
  </T.Group>
{/if}
