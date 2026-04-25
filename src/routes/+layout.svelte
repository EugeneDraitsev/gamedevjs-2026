<script lang="ts">
  import foundryFloorTexture from "$lib/assets/foundry-floor-atlas.png";
  import foundryFloorDecalsTexture from "$lib/assets/foundry-floor-decals.png";
  import foundryWallTexture from "$lib/assets/foundry-wall-panel.png";
  import lavaSurfaceTexture from "$lib/assets/lava-surface.png";
  import favicon from "$lib/assets/orb-knight-icon.svg";

  let { children } = $props();

  const criticalGameTextures = [
    foundryFloorTexture,
    foundryFloorDecalsTexture,
    foundryWallTexture,
    lavaSurfaceTexture,
  ];
</script>

<svelte:head>
  <link rel="icon" type="image/svg+xml" href={favicon}>
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  {#each criticalGameTextures as texture}
    <link rel="preload" as="image" href={texture} crossorigin="anonymous">
  {/each}
</svelte:head>

{@render children()}
