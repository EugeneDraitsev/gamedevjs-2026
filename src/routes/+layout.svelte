<script lang="ts">
  import favicon from "$lib/assets/orb-knight-icon.svg";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" type="image/svg+xml" href={favicon}>
  <link rel="icon" href="/favicon.ico" sizes="32x32">
</svelte:head>

{@render children()}
