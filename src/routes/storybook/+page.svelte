<script lang="ts">
  import { onMount } from "svelte";
  import { base } from "$app/paths";

  const storybookPath = `${base}/storybook/index.html`;

  onMount(() => {
    window.location.replace(storybookPath);
  });
</script>

<svelte:head>
  <title>Storybook | Orb Knight</title>
  <meta content={`0;url=${storybookPath}`} http-equiv="refresh">
</svelte:head>

<main><a href={storybookPath}>Open Storybook</a></main>

<style>
  main {
    display: grid;
    place-items: center;
    min-block-size: 100svh;
    background: #040816;
  }

  a {
    font:
      600 1rem system-ui,
      sans-serif;
    color: #f8e9bd;
  }
</style>
