<script lang="ts">
  import AppModalShell from "$lib/components/app/AppModalShell.svelte";
  import EndDemoModal from "$lib/components/app/EndDemoModal.svelte";

  interface EndDemoModalShowcaseProps {
    open?: boolean;
    startIndex?: number;
  }

  let { open = true, startIndex = 0 }: EndDemoModalShowcaseProps = $props();
</script>

<main class="showcase">
  <AppModalShell describedby="end-demo-copy" labelledby="end-demo-title" {open}>
    <EndDemoModal
      onClose={() => undefined}
      onOpenMainMenu={() => undefined}
      {open}
      {startIndex}
    />
  </AppModalShell>
</main>

<style>
  .showcase {
    position: relative;
    min-block-size: 100vh;
    background:
      radial-gradient(
        circle at 50% 25%,
        rgba(214, 177, 95, 0.12),
        transparent 28%
      ),
      #03070c;
  }
</style>
