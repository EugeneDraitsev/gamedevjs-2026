<script lang="ts">
  import GameApp from "$lib/components/app/GameApp.svelte";

  interface PageData {
    seed: string;
  }

  let { data }: { data: PageData } = $props();
</script>

<GameApp seed={data.seed} />
