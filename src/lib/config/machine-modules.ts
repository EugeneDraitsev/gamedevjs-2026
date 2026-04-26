import {
  computeWeaponBuild,
  createWeaponEdge,
  type WeaponBuild,
  type WeaponFlowNode,
  type WeaponNodeType,
  weaponEntryNodeId,
  weaponExitNodeId,
} from "$lib/config/weapon-graph";

export type MachineModuleId =
  | "rivet-press-core"
  | "arc-splitter-coil"
  | "pressure-lance-nozzle"
  | "boiler-plate-frame"
  | "gyro-servo-frame"
  | "ammo-hopper"
  | "overclock-governor"
  | "salvage-magnet"
  | "parry-reflector"
  | "cleaver-axe-head";

export type MachineModuleKind = "attack" | "body" | "sword" | "utility";
export type MachineModuleRarity = "common" | "uncommon" | "rare";
export type MachineSlotId =
  | "attack"
  | "body"
  | "utility-a"
  | "utility-b"
  | "utility-c";

export const machineModuleKindAccents = {
  attack: "#ef4444",
  body: "#22c55e",
  sword: "#38bdf8",
  utility: "#e5e7eb",
} satisfies Record<MachineModuleKind, string>;

export const machineModuleRarityAccents = {
  common: "#cbd5e1",
  uncommon: "#fbbf24",
  rare: "#fb7185",
} satisfies Record<MachineModuleRarity, string>;

export const getMachineModuleKindAccent = (kind: MachineModuleKind) =>
  machineModuleKindAccents[kind];

export const getMachineModuleRarityAccent = (rarity: MachineModuleRarity) =>
  machineModuleRarityAccents[rarity];

export interface MachineModuleTemplate {
  accent: string;
  description: string;
  effect: string;
  id: MachineModuleId;
  kind: MachineModuleKind;
  label: string;
  rarity: MachineModuleRarity;
  scrapValue: number;
  shortLabel: string;
  statLines: string[];
}

export type MachineLoadout = Record<MachineSlotId, MachineModuleId | null>;

export interface MachineStats {
  damage: number;
  fireRate: number;
  installedModuleIds: MachineModuleId[];
  magazineSize: number;
  maxHealth: number;
  pickupRadiusBonus: number;
  reflectedShotsSeekEnemies: boolean;
  reloadDurationMs: number;
  scrapYieldBonus: number;
  shootCooldownMs: number;
  weaponBuild: WeaponBuild;
}

interface CompiledWeaponNode {
  type: WeaponNodeType;
  value?: number;
}

interface MachineStatDraft {
  cooldownMultiplier: number;
  damageMultiplier: number;
  magazineBonus: number;
  magazineSizeOverride: number | null;
  maxHealthBonus: number;
  meleeDamageMultiplier: number;
  pickupRadiusBonus: number;
  reflectedShotsSeekEnemies: boolean;
  reloadMultiplier: number;
  scrapYieldBonus: number;
  weaponNodes: CompiledWeaponNode[];
}

const baseMachineHealth = 6;
const baseMagazineSize = 8;
const baseReloadDurationMs = 900;
const baseShootCooldownMs = 350;
const swordMeleeDamageMultiplier = 1.5;
const axeMeleeDamageMultiplier = 1.75;

export const machineSlots: Array<{
  id: MachineSlotId;
  kind: MachineModuleKind;
  label: string;
}> = [
  { id: "attack", kind: "attack", label: "Eye Module" },
  { id: "body", kind: "body", label: "Body Module" },
  { id: "utility-a", kind: "utility", label: "Utility Module" },
  { id: "utility-b", kind: "utility", label: "Utility Module" },
  { id: "utility-c", kind: "sword", label: "Weapon Module" },
];

export const machineModuleTemplates: MachineModuleTemplate[] = [
  {
    accent: "#f97316",
    description:
      "A pneumatic punch press that fires heated rivets in a clean line.",
    effect: "Stable impact pattern with dependable damage.",
    id: "rivet-press-core",
    kind: "attack",
    label: "Rivet Press Core",
    rarity: "common",
    scrapValue: 0,
    shortLabel: "Rivet",
    statLines: ["stable shot", "+damage"],
  },
  {
    accent: "#38bdf8",
    description:
      "A forked induction coil that splits the barrel current into three lanes.",
    effect: "3-way electric split, faster fire cycle, lower per-shot damage.",
    id: "arc-splitter-coil",
    kind: "attack",
    label: "Arc Splitter Coil",
    rarity: "uncommon",
    scrapValue: 3,
    shortLabel: "Arc",
    statLines: ["3-way split", "+fire rate"],
  },
  {
    accent: "#f43f5e",
    description:
      "A focused laser emitter that charges before cutting through targets.",
    effect:
      "Charged laser beam attack with high damage and a one-shot magazine.",
    id: "pressure-lance-nozzle",
    kind: "attack",
    label: "Laser Beam",
    rarity: "rare",
    scrapValue: 6,
    shortLabel: "Laser Beam",
    statLines: ["laser beam", "charge attack"],
  },
  {
    accent: "#f59e0b",
    description:
      "Layered boiler plate that turns the chassis into a slow armored drum.",
    effect: "More health and magazine capacity, slower cycle and reload.",
    id: "boiler-plate-frame",
    kind: "body",
    label: "Boiler Plate Frame",
    rarity: "uncommon",
    scrapValue: 3,
    shortLabel: "Boiler",
    statLines: ["+health", "+magazine"],
  },
  {
    accent: "#22c55e",
    description:
      "A servo-balanced spine that keeps the chamber aligned under recoil.",
    effect: "Faster fire cycle and reload without changing the weapon pattern.",
    id: "gyro-servo-frame",
    kind: "body",
    label: "Gyro Servo Frame",
    rarity: "common",
    scrapValue: 0,
    shortLabel: "Gyro",
    statLines: ["+fire rate", "+reload"],
  },
  {
    accent: "#eab308",
    description:
      "A gravity-fed brass hopper that keeps extra rounds above the chamber.",
    effect: "Much larger magazine with a slightly longer reload.",
    id: "ammo-hopper",
    kind: "utility",
    label: "Ammo Hopper",
    rarity: "uncommon",
    scrapValue: 3,
    shortLabel: "Hopper",
    statLines: ["++magazine", "-reload"],
  },
  {
    accent: "#a855f7",
    description:
      "An unsafe governor that lets the whole rig run past its rated cycle.",
    effect: "Faster fire and reload, but the payload loses some punch.",
    id: "overclock-governor",
    kind: "utility",
    label: "Overclock Governor",
    rarity: "uncommon",
    scrapValue: 3,
    shortLabel: "Overclock",
    statLines: ["++fire rate", "-damage"],
  },
  {
    accent: "#2dd4bf",
    description:
      "A magnetized salvage loop that pulls spare parts back into the chassis.",
    effect: "Larger pickup reach and better scrap yield.",
    id: "salvage-magnet",
    kind: "utility",
    label: "Salvage Magnet",
    rarity: "uncommon",
    scrapValue: 3,
    shortLabel: "Magnet",
    statLines: ["+pickup reach", "+scrap"],
  },
  {
    accent: "#38bdf8",
    description: "A simple holographic sword relay mounted to the side arm.",
    effect: "Keeps the standard melee blade shape without changing shots.",
    id: "parry-reflector",
    kind: "sword",
    label: "Energy Sword",
    rarity: "common",
    scrapValue: 0,
    shortLabel: "Sword",
    statLines: ["sword blade", "default melee"],
  },
  {
    accent: "#38bdf8",
    description:
      "A simple holographic axe head that catches shots on the swing edge.",
    effect:
      "Melee hits bite harder and reflected shots turn back into enemies.",
    id: "cleaver-axe-head",
    kind: "sword",
    label: "Cleaver Axe Head",
    rarity: "uncommon",
    scrapValue: 4,
    shortLabel: "Axe",
    statLines: ["axe cleave", "shot reflect", "++melee"],
  },
];

export const machineModuleIds = machineModuleTemplates.map(
  (module) => module.id
);

export const starterMachineModuleIds: MachineModuleId[] = [
  "rivet-press-core",
  "gyro-servo-frame",
  "parry-reflector",
];

export const machineRewardModuleIds = machineModuleIds.filter(
  (id) => !starterMachineModuleIds.includes(id)
);

export const machineModuleById = Object.fromEntries(
  machineModuleTemplates.map((module) => [module.id, module])
) as Record<MachineModuleId, MachineModuleTemplate>;

export const createDefaultMachineLoadout = (): MachineLoadout => ({
  attack: "rivet-press-core",
  body: "gyro-servo-frame",
  "utility-a": null,
  "utility-b": null,
  "utility-c": "parry-reflector",
});

export const createDefaultModuleInventory = (): MachineModuleId[] => [];

export const isMachineModuleId = (value: unknown): value is MachineModuleId =>
  typeof value === "string" &&
  machineModuleIds.includes(value as MachineModuleId);

export const getMachineModule = (id: MachineModuleId) => machineModuleById[id];

export const getInstalledMachineModules = (loadout: MachineLoadout) =>
  machineSlots
    .map((slot) => loadout[slot.id])
    .filter((id): id is MachineModuleId => Boolean(id));

export const hasMachineModule = (
  loadout: MachineLoadout,
  inventory: MachineModuleId[],
  id: MachineModuleId
) => getInstalledMachineModules(loadout).includes(id) || inventory.includes(id);

export const moduleFitsSlot = (
  moduleId: MachineModuleId,
  slotId: MachineSlotId
) =>
  getMachineModule(moduleId).kind ===
  machineSlots.find((slot) => slot.id === slotId)?.kind;

export const normalizeMachineLoadout = (
  input: Partial<Record<MachineSlotId, unknown>> | null | undefined
): MachineLoadout => {
  const fallback = createDefaultMachineLoadout();
  const next: MachineLoadout = {
    attack: null,
    body: null,
    "utility-a": null,
    "utility-b": null,
    "utility-c": null,
  };
  const used = new Set<MachineModuleId>();

  for (const slot of machineSlots) {
    const candidate = input?.[slot.id];

    if (
      isMachineModuleId(candidate) &&
      moduleFitsSlot(candidate, slot.id) &&
      !used.has(candidate)
    ) {
      next[slot.id] = candidate;
      used.add(candidate);
    }
  }

  if (!next.attack) {
    next.attack = fallback.attack;
  }

  if (!next.body) {
    next.body = fallback.body;
  }

  if (!next["utility-c"]) {
    next["utility-c"] = fallback["utility-c"];
  }

  return next;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const createStatDraft = (): MachineStatDraft => ({
  cooldownMultiplier: 1,
  damageMultiplier: 1,
  magazineBonus: 0,
  magazineSizeOverride: null,
  maxHealthBonus: 0,
  meleeDamageMultiplier: swordMeleeDamageMultiplier,
  pickupRadiusBonus: 0,
  reflectedShotsSeekEnemies: false,
  reloadMultiplier: 1,
  scrapYieldBonus: 0,
  weaponNodes: [],
});

const applyModuleToDraft = (
  draft: MachineStatDraft,
  moduleId: MachineModuleId
) => {
  switch (moduleId) {
    case "rivet-press-core":
      draft.weaponNodes.push({ type: "anvil-common", value: 0.28 });
      draft.damageMultiplier *= 1.08;
      break;
    case "arc-splitter-coil":
      draft.weaponNodes.push(
        { type: "cluster-uncommon", value: 3 },
        { type: "rush-common", value: 0.64 },
        { type: "pinpoint-uncommon", value: 0.42 }
      );
      draft.cooldownMultiplier *= 0.74;
      draft.damageMultiplier *= 0.82;
      draft.magazineBonus += 1;
      draft.reloadMultiplier *= 0.96;
      break;
    case "pressure-lance-nozzle":
      draft.weaponNodes.push(
        { type: "laser-common" },
        { type: "meteor-rare", value: 0.65 },
        { type: "ambush-common", value: 0.52 }
      );
      draft.cooldownMultiplier *= 1.18;
      draft.damageMultiplier *= 2.1;
      draft.magazineSizeOverride = 1;
      draft.reloadMultiplier *= 1.12;
      break;
    case "boiler-plate-frame":
      draft.cooldownMultiplier *= 1.12;
      draft.damageMultiplier *= 1.1;
      draft.magazineBonus += 3;
      draft.maxHealthBonus += 3;
      draft.reloadMultiplier *= 1.2;
      break;
    case "gyro-servo-frame":
      draft.cooldownMultiplier *= 0.9;
      draft.reloadMultiplier *= 0.88;
      break;
    case "ammo-hopper":
      draft.magazineBonus += 8;
      draft.reloadMultiplier *= 1.14;
      break;
    case "overclock-governor":
      draft.cooldownMultiplier *= 0.68;
      draft.damageMultiplier *= 0.9;
      draft.reloadMultiplier *= 0.88;
      break;
    case "salvage-magnet":
      draft.pickupRadiusBonus += 0.38;
      draft.scrapYieldBonus += 1;
      break;
    case "parry-reflector":
      break;
    case "cleaver-axe-head":
      draft.meleeDamageMultiplier = axeMeleeDamageMultiplier;
      draft.reflectedShotsSeekEnemies = true;
      break;
    default:
      break;
  }
};

const createCoreNode = (
  id: string,
  kind: "entry" | "exit",
  label: string
): WeaponFlowNode => ({
  data: {
    accent: kind === "entry" ? "#38bdf8" : "#f97316",
    hint: kind === "entry" ? "Machine input." : "Machine output.",
    kind,
    label,
  },
  deletable: false,
  draggable: false,
  id,
  position: { x: 0, y: 0 },
  selectable: false,
  type: "weapon",
});

const createCompiledWeaponBuild = (compiledNodes: CompiledWeaponNode[]) => {
  const modifierNodes: WeaponFlowNode[] = compiledNodes.map((node, index) => ({
    data: {
      accent: "#f97316",
      hint: "Compiled machine module.",
      kind: "modifier",
      label: node.type,
      type: node.type,
      value: node.value,
    },
    draggable: false,
    id: `machine-module-${index}-${node.type}`,
    position: { x: 180 + index * 160, y: 0 },
    selectable: false,
    type: "weapon",
  }));
  const nodes = [
    createCoreNode(weaponEntryNodeId, "entry", "Machine"),
    ...modifierNodes,
    createCoreNode(weaponExitNodeId, "exit", "Output"),
  ];
  const chain = nodes.map((node) => node.id);

  return computeWeaponBuild(
    nodes,
    chain
      .slice(0, -1)
      .map((source, index) => createWeaponEdge(source, chain[index + 1]))
  );
};

const applyDamageMultiplier = (
  weaponBuild: WeaponBuild,
  damageMultiplier: number,
  meleeDamageMultiplier = 1
): WeaponBuild => {
  const damage = Math.max(1, Math.round(weaponBuild.damage * damageMultiplier));
  const burstDamage = Math.max(1, Math.round(damage * weaponBuild.pelletCount));
  const meleeDamage = Math.max(1, Math.round(damage * meleeDamageMultiplier));

  return {
    ...weaponBuild,
    burstDamage,
    damage,
    knockback: weaponBuild.knockback * clamp(damageMultiplier, 0.7, 1.8),
    meleeDamage,
  };
};

export const computeMachineStats = (loadout: MachineLoadout): MachineStats => {
  const installedModuleIds = getInstalledMachineModules(loadout);
  const draft = createStatDraft();

  for (const moduleId of installedModuleIds) {
    applyModuleToDraft(draft, moduleId);
  }

  const weaponBuild = applyDamageMultiplier(
    createCompiledWeaponBuild(draft.weaponNodes),
    draft.damageMultiplier,
    draft.meleeDamageMultiplier
  );
  const shootCooldownMs = Math.round(
    clamp(baseShootCooldownMs * draft.cooldownMultiplier, 120, 620)
  );
  const reloadDurationMs = Math.round(
    clamp(baseReloadDurationMs * draft.reloadMultiplier, 420, 1600)
  );
  const magazineSize =
    draft.magazineSizeOverride ??
    Math.round(clamp(baseMagazineSize + draft.magazineBonus, 3, 20));
  const maxHealth = Math.round(
    clamp(baseMachineHealth + draft.maxHealthBonus, 4, 12)
  );

  return {
    damage: weaponBuild.burstDamage,
    fireRate: Number((1000 / shootCooldownMs).toFixed(2)),
    installedModuleIds,
    magazineSize,
    maxHealth,
    pickupRadiusBonus: draft.pickupRadiusBonus,
    reflectedShotsSeekEnemies: draft.reflectedShotsSeekEnemies,
    reloadDurationMs,
    scrapYieldBonus: draft.scrapYieldBonus,
    shootCooldownMs,
    weaponBuild,
  };
};
