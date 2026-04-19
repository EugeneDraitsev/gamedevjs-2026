<script lang="ts">
  import { T } from "@threlte/core";
  import type { PlayerDebugMarkersProps } from "$lib/types/game-components";

  let {
    cameraTarget,
    groundProbeLength,
    groundProbePosition,
    isGrounded,
    lookTarget,
    showDebugGeometry,
  }: PlayerDebugMarkersProps = $props();
</script>

{#if showDebugGeometry}
  <T.Group position={lookTarget}>
    <T.Mesh>
      <T.SphereGeometry args={[0.12, 16, 16]} />
      <T.MeshBasicMaterial color="#8ac6ff" />
    </T.Mesh>
  </T.Group>

  <T.Group position={cameraTarget}>
    <T.Mesh>
      <T.SphereGeometry args={[0.16, 16, 16]} />
      <T.MeshBasicMaterial color="#f72585" />
    </T.Mesh>
  </T.Group>

  <T.Group position={groundProbePosition}>
    <T.Mesh>
      <T.CylinderGeometry args={[0.035, 0.035, groundProbeLength, 10]} />
      <T.MeshBasicMaterial color={isGrounded ? "#78f0a4" : "#ffd166"} />
    </T.Mesh>
  </T.Group>
{/if}
