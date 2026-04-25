<script module lang="ts">
  import { BoxGeometry, SphereGeometry } from "three";

  const stealthBeamGeometry = new BoxGeometry(1, 1, 1);
  const stealthBeamHeadGeometry = new SphereGeometry(1, 16, 16);
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import { AdditiveBlending, GreaterDepth } from "three";
  import type { ActiveStealthBeam } from "$lib/types/game";

  let {
    animationNow,
    beam,
  }: {
    animationNow: number;
    beam: ActiveStealthBeam;
  } = $props();

  const age = $derived(animationNow - beam.createdAt);
  const telegraphing = $derived(age >= 0 && age < beam.telegraphMs);
  const firing = $derived(
    age >= beam.telegraphMs && age < beam.telegraphMs + beam.fireMs
  );
  const fading = $derived(
    age >= beam.telegraphMs + beam.fireMs &&
      age < beam.telegraphMs + beam.fireMs + beam.fadeMs
  );
  const fade = $derived.by(() => {
    if (firing) {
      return 1;
    }

    if (fading) {
      return Math.max(
        0,
        1 - (age - beam.telegraphMs - beam.fireMs) / beam.fadeMs
      );
    }

    return telegraphing ? 0.28 + Math.sin(animationNow * 0.018) * 0.06 : 0;
  });
  const beamWidth = $derived(telegraphing ? beam.width * 0.32 : beam.width);
  const beamHeight = $derived(telegraphing ? 0.035 : 0.085);
  const coreOpacity = $derived(telegraphing ? fade * 0.46 : fade * 0.86);
  const haloOpacity = $derived(telegraphing ? fade * 0.3 : fade * 0.5);
</script>

{#if fade > 0.01}
  <T.Group position={beam.position} rotation={[0, beam.rotationY, 0]}>
    <T.Mesh
      geometry={stealthBeamGeometry}
      position={[0, 0, beam.length * 0.5]}
      renderOrder={36}
      scale={[beamWidth * 3.2, beamHeight * 1.35, beam.length]}
    >
      <T.MeshBasicMaterial
        blending={AdditiveBlending}
        color={beam.color}
        depthFunc={GreaterDepth}
        depthWrite={false}
        opacity={haloOpacity}
        toneMapped={false}
        transparent
      />
    </T.Mesh>

    <T.Mesh
      geometry={stealthBeamGeometry}
      position={[0, 0.012, beam.length * 0.5]}
      renderOrder={37}
      scale={[beamWidth, beamHeight, beam.length]}
    >
      <T.MeshBasicMaterial
        blending={AdditiveBlending}
        color={telegraphing ? beam.color : beam.core}
        depthWrite={false}
        opacity={coreOpacity}
        toneMapped={false}
        transparent
      />
    </T.Mesh>

    {#if firing || fading}
      <T.Mesh
        geometry={stealthBeamHeadGeometry}
        position={[0, 0.02, beam.length]}
        renderOrder={38}
        scale={[beam.width * 1.28, beam.width * 1.28, beam.width * 1.28]}
      >
        <T.MeshBasicMaterial
          blending={AdditiveBlending}
          color={beam.core}
          depthWrite={false}
          opacity={fade * 0.74}
          toneMapped={false}
          transparent
        />
      </T.Mesh>
    {/if}
  </T.Group>
{/if}
