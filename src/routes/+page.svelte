<script lang="ts">
  import { goto } from "$app/navigation";
  import MainMenu from "$lib/components/app/MainMenu.svelte";

  const seed = "polygon-001";
</script>

<svelte:head> <title>Warden's Trial</title> </svelte:head>

<MainMenu
  canResume={false}
  floorIndex={1}
  onOpenSettings={() => goto("/settings")}
  onPlay={() => goto(`/game/${seed}`)}
  {seed}
/>
