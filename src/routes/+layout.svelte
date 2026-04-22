<script lang="ts">
  import artifactFloorTexture from "$lib/assets/artifact-floor-foundry.png";
  import bossBannerTexture from "$lib/assets/boss-banner-foundry.png";
  import bossDoorTexture from "$lib/assets/boss-door.svg";
  import bossFloorTexture from "$lib/assets/boss-floor-foundry.png";
  import foundryFloorTexture from "$lib/assets/foundry-floor-atlas.png";
  import foundryFloorDecalsTexture from "$lib/assets/foundry-floor-decals.png";
  import foundryWallTexture from "$lib/assets/foundry-wall-panel.png";
  import lavaSurfaceTexture from "$lib/assets/lava-surface.png";
  import favicon from "$lib/assets/orb-knight-icon.svg";

  let { children } = $props();

  const gameTextures = [
    artifactFloorTexture,
    bossBannerTexture,
    bossDoorTexture,
    bossFloorTexture,
    foundryFloorTexture,
    foundryFloorDecalsTexture,
    foundryWallTexture,
    lavaSurfaceTexture,
  ];
</script>

<svelte:head>
  <link rel="icon" type="image/svg+xml" href={favicon}>
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  {#each gameTextures as texture}
    <link rel="preload" as="image" href={texture}>
  {/each}
</svelte:head>

{@render children()}
