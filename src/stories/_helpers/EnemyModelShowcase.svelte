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
  const tallBoss = $derived(template.id === "gate-keeper");
  const cameraPosition = $derived(
    tallBoss
      ? ([5.8, 4.6, 7.8] as [number, number, number])
      : ([3.4, 2.4, 4.6] as [number, number, number])
  );
  const cameraTargetY = $derived(
    groundY + template.radius * (tallBoss ? 1.9 : 1)
  );
</script>

<ModelTurntable
  {autoRotate}
  {cameraPosition}
  {cameraTargetY}
  {groundY}
  {height}
  label={template.label}
>
  <EnemyTurntableActor {groundY} {template} />
</ModelTurntable>
