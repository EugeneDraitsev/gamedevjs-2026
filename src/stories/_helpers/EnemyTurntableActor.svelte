<script lang="ts">
  import { useTask } from "@threlte/core";
  import EnemyActor from "$lib/components/game/scene/EnemyActor.svelte";
  import type { EnemyTemplate } from "$lib/config/room-templates";
  import { enemyFromTemplate } from "./types";

  interface Props {
    groundY?: number;
    template: EnemyTemplate;
  }

  let { groundY = -1, template }: Props = $props();

  const enemy = $derived(
    enemyFromTemplate(template, [0, groundY + template.radius, 0], template.id)
  );
  let now = $state(performance.now());

  useTask(() => {
    now = performance.now();
  });
</script>

<EnemyActor animationNow={now} {enemy} />
