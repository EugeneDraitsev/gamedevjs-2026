<script lang="ts">
  import { useThrelte } from "@threlte/core";
  import { Color } from "three";

  const { invalidate, renderer, scene } = useThrelte();
  const background = new Color("#040816");

  $effect(() => {
    scene.background = background;
    renderer.autoClear = true;
    renderer.autoClearColor = true;
    renderer.setClearColor(background, 1);
    invalidate();

    return () => {
      if (scene.background === background) {
        scene.background = null;
      }
    };
  });
</script>
