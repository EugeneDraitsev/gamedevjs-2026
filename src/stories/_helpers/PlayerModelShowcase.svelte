<script lang="ts">
  import { T } from "@threlte/core";
  import OrbKnight from "$lib/components/game/OrbKnight.svelte";
  import ModelTurntable from "./ModelTurntable.svelte";

  interface Props {
    autoRotate?: boolean;
    hitFlash?: number;
    label?: string;
    scale?: number;
  }

  let {
    autoRotate = true,
    hitFlash = 0,
    label = "Orb Knight (Player)",
    scale = 0.9,
  }: Props = $props();

  const groundY = -1;
  const mountY = $derived(groundY + scale);
  const cameraTargetY = $derived(mountY);
</script>

<ModelTurntable autoRotate={false} {cameraTargetY} {groundY} {label}>
  <T.Group position={[0, mountY, 0]}>
    <OrbKnight {autoRotate} {hitFlash} {scale} />
  </T.Group>
</ModelTurntable>
