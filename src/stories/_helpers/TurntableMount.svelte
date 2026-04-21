<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import type { Snippet } from "svelte";
  import type { Group } from "three";

  interface Props {
    autoRotate?: boolean;
    children: Snippet;
    rotateSpeed?: number;
  }

  let { autoRotate = false, children, rotateSpeed = 0.4 }: Props = $props();

  let mount = $state<Group>();

  useTask((delta) => {
    if (autoRotate && mount) {
      mount.rotation.y += delta * rotateSpeed;
    }
  });
</script>

<T.Group bind:ref={mount}> {@render children()} </T.Group>
