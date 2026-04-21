<script lang="ts">
  import type { EnemyTemplate } from "$lib/config/room-templates";
  import EnemyTurntableActor from "./EnemyTurntableActor.svelte";
  import ModelTurntable from "./ModelTurntable.svelte";

  interface Props {
    autoRotate?: boolean;
    height?: string;
    template: EnemyTemplate;
  }

  let { autoRotate = false, height = "260px", template }: Props = $props();

  const groundY = -1;
  const cameraTargetY = $derived(groundY + template.radius);
</script>

<ModelTurntable
  {autoRotate}
  {cameraTargetY}
  {groundY}
  {height}
  label={template.label}
>
  <EnemyTurntableActor {groundY} {template} />
</ModelTurntable>
