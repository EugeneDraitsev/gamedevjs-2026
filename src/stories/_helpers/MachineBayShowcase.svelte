<script lang="ts">
  import MachineBayModal from "$lib/components/machine-bay/MachineBayModal.svelte";
  import {
    computeMachineStats,
    createDefaultMachineLoadout,
    getMachineModule,
    type MachineLoadout,
    type MachineModuleId,
    type MachineSlotId,
    moduleFitsSlot,
  } from "$lib/config/machine-modules";

  type ShowcaseVariant = "starter" | "inventory" | "five-installed";

  interface Props {
    gearCount?: number;
    variant?: ShowcaseVariant;
  }

  const loadoutFor = (variant: ShowcaseVariant): MachineLoadout => {
    if (variant !== "five-installed") {
      return createDefaultMachineLoadout();
    }

    return {
      attack: "rivet-press-core",
      body: "gyro-servo-frame",
      "utility-a": "ammo-hopper",
      "utility-b": "overclock-governor",
      "utility-c": "salvage-magnet",
    };
  };

  const inventoryFor = (variant: ShowcaseVariant): MachineModuleId[] => {
    if (variant === "starter") {
      return [];
    }

    if (variant === "five-installed") {
      return [
        "arc-splitter-coil",
        "pressure-lance-nozzle",
        "boiler-plate-frame",
      ];
    }

    return [
      "ammo-hopper",
      "overclock-governor",
      "salvage-magnet",
      "arc-splitter-coil",
      "pressure-lance-nozzle",
      "boiler-plate-frame",
    ];
  };

  let { gearCount = 2, variant = "starter" }: Props = $props();

  let activeVariant = $state<ShowcaseVariant | null>(null);
  let machineLoadout = $state<MachineLoadout>(createDefaultMachineLoadout());
  let moduleInventory = $state<MachineModuleId[]>([]);
  const machineStats = $derived(computeMachineStats(machineLoadout));

  $effect(() => {
    if (variant === activeVariant) {
      return;
    }

    activeVariant = variant;
    machineLoadout = loadoutFor(variant);
    moduleInventory = inventoryFor(variant);
  });

  const removeInventoryModule = (moduleId: MachineModuleId) => {
    const index = moduleInventory.indexOf(moduleId);

    if (index === -1) {
      return null;
    }

    moduleInventory = moduleInventory.toSpliced(index, 1);
    return moduleId;
  };

  const installModule = (moduleId: MachineModuleId, slotId: MachineSlotId) => {
    if (!moduleFitsSlot(moduleId, slotId)) {
      return;
    }

    const removed = removeInventoryModule(moduleId);

    if (!removed) {
      return;
    }

    const previous = machineLoadout[slotId];
    machineLoadout = { ...machineLoadout, [slotId]: moduleId };

    if (previous) {
      moduleInventory = [...moduleInventory, previous];
    }
  };

  const ejectModule = (slotId: MachineSlotId) => {
    const moduleId = machineLoadout[slotId];

    if (!moduleId) {
      return;
    }

    machineLoadout = { ...machineLoadout, [slotId]: null };
    moduleInventory = [...moduleInventory, moduleId];
  };

  const scrapModule = (moduleId: MachineModuleId) => {
    const removed = removeInventoryModule(moduleId);

    if (!removed) {
      return;
    }

    gearCount +=
      getMachineModule(moduleId).scrapValue + machineStats.scrapYieldBonus;
  };
</script>

<div class="showcase-shell">
  <MachineBayModal
    {gearCount}
    {machineLoadout}
    {machineStats}
    {moduleInventory}
    onClose={() => undefined}
    onEjectModule={ejectModule}
    onInstallModule={installModule}
    onScrapModule={scrapModule}
    open
  />
</div>

<style>
  .showcase-shell {
    min-block-size: 100vh;
    background:
      radial-gradient(
        circle at 50% 0,
        rgba(101, 220, 218, 0.16),
        transparent 30%
      ),
      linear-gradient(180deg, #11100c, #03080b 64%);
  }
</style>
