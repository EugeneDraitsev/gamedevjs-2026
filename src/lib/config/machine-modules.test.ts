import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeMachineStats,
  createDefaultMachineLoadout,
  type MachineLoadout,
  machineModuleIds,
  machineModuleTemplates,
  machineRewardModuleIds,
  moduleFitsSlot,
  normalizeMachineLoadout,
  starterMachineModuleIds,
} from "$lib/config/machine-modules";
import { loadRunSave, saveRunSave } from "$lib/game/run-save";

const storageFor = () => {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
};

describe("machine modules", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defines the module catalog without duplicate ids", () => {
    expect(machineModuleTemplates).toHaveLength(10);
    expect(new Set(machineModuleIds).size).toBe(10);
    expect(machineRewardModuleIds).not.toContain("rivet-press-core");
    expect(machineRewardModuleIds).not.toContain("gyro-servo-frame");
    expect(machineRewardModuleIds).not.toContain("parry-reflector");

    for (const starter of starterMachineModuleIds) {
      expect(
        machineModuleTemplates.find((item) => item.id === starter)?.scrapValue
      ).toBe(0);
    }
  });

  it("restricts modules to compatible machine sockets", () => {
    expect(moduleFitsSlot("arc-splitter-coil", "attack")).toBe(true);
    expect(moduleFitsSlot("arc-splitter-coil", "utility-a")).toBe(false);
    expect(moduleFitsSlot("boiler-plate-frame", "body")).toBe(true);
    expect(moduleFitsSlot("ammo-hopper", "utility-b")).toBe(true);
    expect(moduleFitsSlot("ammo-hopper", "utility-c")).toBe(false);
    expect(moduleFitsSlot("parry-reflector", "utility-c")).toBe(true);
    expect(moduleFitsSlot("parry-reflector", "utility-a")).toBe(false);
    expect(moduleFitsSlot("cleaver-axe-head", "utility-c")).toBe(true);
    expect(moduleFitsSlot("cleaver-axe-head", "utility-a")).toBe(false);
  });

  it("computes combat stats from installed modules", () => {
    const defaults = computeMachineStats(createDefaultMachineLoadout());
    const arcStats = computeMachineStats({
      ...createDefaultMachineLoadout(),
      attack: "arc-splitter-coil",
    });
    const laserStats = computeMachineStats({
      ...createDefaultMachineLoadout(),
      attack: "pressure-lance-nozzle",
    });
    const heavyStats = computeMachineStats({
      attack: "rivet-press-core",
      body: "boiler-plate-frame",
      "utility-a": "ammo-hopper",
      "utility-b": "salvage-magnet",
      "utility-c": null,
    });
    const axeStats = computeMachineStats({
      ...createDefaultMachineLoadout(),
      "utility-c": "cleaver-axe-head",
    });

    expect(arcStats.weaponBuild.pelletCount).toBeGreaterThan(1);
    expect(arcStats.fireRate).toBeGreaterThan(defaults.fireRate);
    expect(laserStats.weaponBuild.attackMode).toBe("beam");
    expect(laserStats.damage).toBeGreaterThan(defaults.damage);
    expect(laserStats.magazineSize).toBe(1);
    expect(heavyStats.maxHealth).toBeGreaterThan(defaults.maxHealth);
    expect(heavyStats.magazineSize).toBeGreaterThan(defaults.magazineSize);
    expect(heavyStats.pickupRadiusBonus).toBeGreaterThan(0);
    expect(heavyStats.scrapYieldBonus).toBe(1);
    expect(defaults.reflectedShotsSeekEnemies).toBe(false);
    expect(axeStats.reflectedShotsSeekEnemies).toBe(true);
    expect(axeStats.weaponBuild.meleeDamage).toBeGreaterThan(
      defaults.weaponBuild.meleeDamage
    );
    expect(axeStats.damage).toBe(defaults.damage);
  });

  it("normalizes invalid or duplicate saved loadouts", () => {
    const normalized = normalizeMachineLoadout({
      attack: "ammo-hopper",
      body: "boiler-plate-frame",
      "utility-a": "ammo-hopper",
      "utility-b": "salvage-magnet",
      "utility-c": "ammo-hopper",
    });

    expect(normalized.attack).toBe("rivet-press-core");
    expect(normalized.body).toBe("boiler-plate-frame");
    expect(normalized["utility-a"]).toBe("ammo-hopper");
    expect(normalized["utility-b"]).toBe("salvage-magnet");
    expect(normalized["utility-c"]).toBe("parry-reflector");
  });

  it("saves v2 runs and drops old weapon graph saves", () => {
    const localStorage = storageFor();

    vi.stubGlobal("localStorage", localStorage);
    localStorage.setItem(
      "warden-run:v1",
      JSON.stringify({ floorIndex: 1, looseModules: [], weaponNodes: [] })
    );

    expect(loadRunSave("v1")).toBeNull();
    expect(localStorage.getItem("warden-run:v1")).toBeNull();

    const machineLoadout: MachineLoadout = {
      attack: "pressure-lance-nozzle",
      body: "gyro-servo-frame",
      "utility-a": "ammo-hopper",
      "utility-b": null,
      "utility-c": "parry-reflector",
    };

    saveRunSave("v2", {
      collectedArtifactRooms: ["treasure-1"],
      floorIndex: -1,
      gearCount: 5,
      machineLoadout,
      moduleInventory: ["salvage-magnet"],
      version: 2,
    });

    expect(loadRunSave("v2")).toMatchObject({
      floorIndex: -1,
      gearCount: 5,
      machineLoadout,
      moduleInventory: ["salvage-magnet"],
    });
  });
});
