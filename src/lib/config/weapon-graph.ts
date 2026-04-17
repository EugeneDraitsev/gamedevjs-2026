import type { Edge, Node, XYPosition } from "@xyflow/svelte";

export const weaponEntryNodeId = "weapon-entry";
export const weaponExitNodeId = "weapon-exit";

export type WeaponNodeRarity = "common" | "uncommon" | "rare";

export type WeaponNodeIcon =
  | "wave"
  | "split"
  | "weight"
  | "rush"
  | "pinpoint"
  | "profile"
  | "lob";

export type WeaponNodeType =
  | "ripple-common"
  | "ribbon-uncommon"
  | "maelstrom-rare"
  | "fork-common"
  | "cluster-uncommon"
  | "hive-rare"
  | "anvil-common"
  | "crush-uncommon"
  | "meteor-rare"
  | "rush-common"
  | "pinpoint-uncommon"
  | "ambush-common"
  | "bloom-uncommon"
  | "cruise-rare"
  | "lob-common";

export interface WeaponNodeTemplate {
  accent: string;
  defaultValue: number;
  effect: string;
  hint: string;
  icon: WeaponNodeIcon;
  label: string;
  max: number;
  min: number;
  rarity: WeaponNodeRarity;
  step: number;
  type: WeaponNodeType;
}

export interface WeaponFlowNodeData extends Record<string, unknown> {
  accent: string;
  effect?: string;
  hint: string;
  icon?: WeaponNodeIcon;
  kind: "entry" | "exit" | "modifier";
  label: string;
  max?: number;
  min?: number;
  rarity?: WeaponNodeRarity;
  step?: number;
  type?: WeaponNodeType;
  value?: number;
}

export type WeaponFlowNode = Node<WeaponFlowNodeData, "weapon">;
export type WeaponFlowEdge = Edge;

export const weaponRarityColors: Record<WeaponNodeRarity, string> = {
  common: "#7b8ea8",
  rare: "#ffd166",
  uncommon: "#57d6a5",
};

export interface WeaponBuild {
  burstDamage: number;
  colors: {
    core: string;
    glow: string;
    gradient: string;
    shell: string;
  };
  connectedModifierCount: number;
  curve: number;
  damage: number;
  damageFactor: number;
  damageProfile: [number, number, number];
  damageProfileLabel: string;
  drag: number;
  gravity: number;
  knockback: number;
  mass: number;
  massFactor: number;
  patternLabel: string;
  pelletCount: number;
  radius: number;
  rangeFactor: number;
  speed: number;
  speedFactor: number;
  spread: number;
  ttlMs: number;
}

interface WeaponBuildDraft {
  curve: number;
  damageFactor: number;
  damageProfile: [number, number, number];
  drag: number;
  gravity: number;
  massFactor: number;
  pelletCount: number;
  radiusFactor: number;
  speedFactor: number;
  spread: number;
  ttlMs: number;
}

const BASE_DAMAGE = 20;
const BASE_DRAG = 0.04;
const BASE_MASS = 0.26;
const BASE_RADIUS = 0.14;
const BASE_SPEED = 18;
const BASE_SPREAD = 0.015;
const BASE_TTL_MS = 1900;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const mixChannel = (from: number, to: number, amount: number) =>
  Math.round(from + (to - from) * amount);

const mixColor = (from: string, to: string, amount: number) => {
  const safeAmount = clamp(amount, 0, 1);
  const fromChannels = [
    Number.parseInt(from.slice(1, 3), 16),
    Number.parseInt(from.slice(3, 5), 16),
    Number.parseInt(from.slice(5, 7), 16),
  ];
  const toChannels = [
    Number.parseInt(to.slice(1, 3), 16),
    Number.parseInt(to.slice(3, 5), 16),
    Number.parseInt(to.slice(5, 7), 16),
  ];

  const red = mixChannel(fromChannels[0], toChannels[0], safeAmount);
  const green = mixChannel(fromChannels[1], toChannels[1], safeAmount);
  const blue = mixChannel(fromChannels[2], toChannels[2], safeAmount);

  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
};

export const weaponNodeTemplates: WeaponNodeTemplate[] = [
  {
    accent: "#b388ff",
    defaultValue: 0.45,
    effect: "Adds a sloppy wave.",
    hint: "Common: turns straight fire into a wobble, with a speed tax.",
    icon: "wave",
    label: "Wave",
    max: 1,
    min: 0.2,
    rarity: "common",
    step: 0.05,
    type: "ripple-common",
  },
  {
    accent: "#cf8cff",
    defaultValue: 0.55,
    effect: "Bigger wave, cleaner tradeoff.",
    hint: "Uncommon: a stronger bend without the common penalty spike.",
    icon: "wave",
    label: "Wave",
    max: 1,
    min: 0.2,
    rarity: "uncommon",
    step: 0.05,
    type: "ribbon-uncommon",
  },
  {
    accent: "#f19cff",
    defaultValue: 0.6,
    effect: "Wild serpentine path.",
    hint: "Rare: pushes the wave into chaos while keeping decent speed.",
    icon: "wave",
    label: "Wave",
    max: 1,
    min: 0.2,
    rarity: "rare",
    step: 0.05,
    type: "maelstrom-rare",
  },
  {
    accent: "#ffd166",
    defaultValue: 0.4,
    effect: "Splits into 2-3 shots.",
    hint: "Common: brutal damage drop, quick way to spray.",
    icon: "split",
    label: "Split",
    max: 1,
    min: 0.2,
    rarity: "common",
    step: 0.05,
    type: "fork-common",
  },
  {
    accent: "#ffcb6b",
    defaultValue: 0.45,
    effect: "Splits into 3-4 shots.",
    hint: "Uncommon: still hurts, but the math is less miserable.",
    icon: "split",
    label: "Split",
    max: 1,
    min: 0.2,
    rarity: "uncommon",
    step: 0.05,
    type: "cluster-uncommon",
  },
  {
    accent: "#ffe08a",
    defaultValue: 0.5,
    effect: "Splits into 4-5 shots.",
    hint: "Rare: proper shotgun node instead of a self-own.",
    icon: "split",
    label: "Split",
    max: 1,
    min: 0.2,
    rarity: "rare",
    step: 0.05,
    type: "hive-rare",
  },
  {
    accent: "#59a5ff",
    defaultValue: 0.4,
    effect: "Mass up, speed down hard.",
    hint: "Common: thick projectile, heavy speed loss.",
    icon: "weight",
    label: "Weight",
    max: 1,
    min: 0.2,
    rarity: "common",
    step: 0.05,
    type: "anvil-common",
  },
  {
    accent: "#6fb5ff",
    defaultValue: 0.5,
    effect: "Better heavy shot.",
    hint: "Uncommon: more mass for less punishment.",
    icon: "weight",
    label: "Weight",
    max: 1,
    min: 0.2,
    rarity: "uncommon",
    step: 0.05,
    type: "crush-uncommon",
  },
  {
    accent: "#8ec8ff",
    defaultValue: 0.55,
    effect: "Big mass spike, still moves.",
    hint: "Rare: chunky impact without turning into a brick.",
    icon: "weight",
    label: "Weight",
    max: 1,
    min: 0.2,
    rarity: "rare",
    step: 0.05,
    type: "meteor-rare",
  },
  {
    accent: "#4cc9f0",
    defaultValue: 0.45,
    effect: "Speed up, mass down.",
    hint: "Common: cheap acceleration with lighter impact.",
    icon: "rush",
    label: "Rush",
    max: 1,
    min: 0.2,
    rarity: "common",
    step: 0.05,
    type: "rush-common",
  },
  {
    accent: "#8ad7ff",
    defaultValue: 0.45,
    effect: "Tightens the pattern.",
    hint: "Uncommon: cleaner line and better travel, slight weight loss.",
    icon: "pinpoint",
    label: "Pinpoint",
    max: 1,
    min: 0.2,
    rarity: "uncommon",
    step: 0.05,
    type: "pinpoint-uncommon",
  },
  {
    accent: "#ff6b6b",
    defaultValue: 0.45,
    effect: "Damage spikes right away.",
    hint: "Common: perfect for close range, weak farther out.",
    icon: "profile",
    label: "Profile",
    max: 1,
    min: 0.2,
    rarity: "common",
    step: 0.05,
    type: "ambush-common",
  },
  {
    accent: "#ff9f68",
    defaultValue: 0.5,
    effect: "Damage blooms in the middle.",
    hint: "Uncommon: strongest around the center of the flight.",
    icon: "profile",
    label: "Profile",
    max: 1,
    min: 0.2,
    rarity: "uncommon",
    step: 0.05,
    type: "bloom-uncommon",
  },
  {
    accent: "#ffb26b",
    defaultValue: 0.5,
    effect: "Late-ramp projectile.",
    hint: "Rare: scales into long range without killing speed.",
    icon: "profile",
    label: "Profile",
    max: 1,
    min: 0.2,
    rarity: "rare",
    step: 0.05,
    type: "cruise-rare",
  },
  {
    accent: "#7fe39e",
    defaultValue: 0.4,
    effect: "Drops into an arc.",
    hint: "Common: gains vertical fall and extra hang-time.",
    icon: "lob",
    label: "Lob",
    max: 1,
    min: 0.2,
    rarity: "common",
    step: 0.05,
    type: "lob-common",
  },
];

const createCoreNode = (
  id: string,
  label: string,
  kind: WeaponFlowNodeData["kind"],
  position: XYPosition,
  accent: string
): WeaponFlowNode => ({
  data: {
    accent,
    hint:
      kind === "entry" ? "Base attack starts here." : "Projectile exits here.",
    kind,
    label,
  },
  deletable: false,
  draggable: false,
  id,
  position,
  selectable: true,
  type: "weapon",
});

export const createWeaponFlowNode = (
  type: WeaponNodeType,
  position: XYPosition
): WeaponFlowNode => {
  const template =
    weaponNodeTemplates.find((item) => item.type === type) ??
    weaponNodeTemplates[0];

  return {
    data: {
      accent: template.accent,
      effect: template.effect,
      hint: template.hint,
      icon: template.icon,
      kind: "modifier",
      label: template.label,
      max: template.max,
      min: template.min,
      rarity: template.rarity,
      step: template.step,
      type,
      value: template.defaultValue,
    },
    draggable: true,
    id: crypto.randomUUID(),
    position,
    type: "weapon",
  };
};

export const createDefaultWeaponGraph = () => ({
  edges: [createWeaponEdge(weaponEntryNodeId, weaponExitNodeId)],
  nodes: [
    createCoreNode(
      weaponEntryNodeId,
      "Trigger",
      "entry",
      { x: 60, y: 170 },
      "#4cc9f0"
    ),
    createCoreNode(
      weaponExitNodeId,
      "Projectile",
      "exit",
      { x: 980, y: 170 },
      "#ff6b6b"
    ),
  ] as WeaponFlowNode[],
});

export const createWeaponEdge = (
  source: string,
  target: string
): WeaponFlowEdge => ({
  animated: true,
  id: `${source}-${target}`,
  source,
  style: "stroke:#7dd3fc;stroke-width:2.5",
  target,
  type: "smoothstep",
});

export const copyWeaponBuild = (build: WeaponBuild): WeaponBuild => ({
  ...build,
  colors: { ...build.colors },
  damageProfile: [...build.damageProfile] as [number, number, number],
});

export const getDamageAtDistance = (
  profile: [number, number, number],
  distance: number
) => {
  if (distance <= 3) {
    return profile[0];
  }

  if (distance <= 8) {
    return profile[0] + (profile[1] - profile[0]) * ((distance - 3) / 5);
  }

  if (distance <= 14) {
    return profile[1] + (profile[2] - profile[1]) * ((distance - 8) / 6);
  }

  return profile[2];
};

const getOrderedModifierNodes = (
  nodes: WeaponFlowNode[],
  edges: WeaponFlowEdge[]
) => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const ordered: WeaponFlowNode[] = [];
  const visited = new Set<string>([weaponEntryNodeId]);
  let currentId = weaponEntryNodeId;

  while (true) {
    const nextEdge = edges.find((edge) => edge.source === currentId);

    if (!nextEdge || visited.has(nextEdge.target)) {
      break;
    }

    visited.add(nextEdge.target);

    if (nextEdge.target === weaponExitNodeId) {
      break;
    }

    const node = nodeById.get(nextEdge.target);

    if (!node || node.data.kind !== "modifier") {
      break;
    }

    ordered.push(node);
    currentId = node.id;
  }

  return ordered;
};

const getSplitDamageFactor = (
  count: number,
  commonPenalty: number,
  rareRelief: number
) => {
  if (count <= 2) {
    return 0.48 + rareRelief - commonPenalty;
  }

  if (count === 3) {
    return 0.31 + rareRelief - commonPenalty;
  }

  if (count === 4) {
    return 0.23 + rareRelief - commonPenalty;
  }

  return 0.18 + rareRelief - commonPenalty;
};

const createWeaponBuildDraft = (): WeaponBuildDraft => ({
  curve: 0,
  damageFactor: 1,
  damageProfile: [1, 1, 1],
  drag: BASE_DRAG,
  gravity: 0,
  massFactor: 1,
  pelletCount: 1,
  radiusFactor: 1,
  speedFactor: 1,
  spread: BASE_SPREAD,
  ttlMs: BASE_TTL_MS,
});

const modifierAppliers: Record<
  WeaponNodeType,
  (draft: WeaponBuildDraft, value: number) => void
> = {
  "ambush-common": (draft, value) => {
    draft.damageProfile[0] += 0.7 + value * 0.75;
    draft.damageProfile[1] += value * 0.05;
    draft.damageProfile[2] -= 0.3 + value * 0.25;
  },
  "anvil-common": (draft, value) => {
    draft.massFactor *= 1.35 + value * 1.2;
    draft.speedFactor *= 0.9 - value * 0.24;
    draft.radiusFactor *= 1.03 + value * 0.24;
  },
  "bloom-uncommon": (draft, value) => {
    draft.damageProfile[0] -= 0.14 + value * 0.12;
    draft.damageProfile[1] += 0.85 + value * 0.8;
    draft.damageProfile[2] -= 0.08 + value * 0.08;
  },
  "cluster-uncommon": (draft, value) => {
    const count = 3 + Math.round(value);

    draft.pelletCount += count - 1;
    draft.damageFactor *= getSplitDamageFactor(count, value * 0.03, 0.08);
    draft.spread += 0.075 + value * 0.075;
    draft.speedFactor *= 0.98 - value * 0.05;
  },
  "cruise-rare": (draft, value) => {
    draft.damageProfile[0] -= 0.18 + value * 0.15;
    draft.damageProfile[1] += 0.2 + value * 0.25;
    draft.damageProfile[2] += 0.9 + value * 0.85;
    draft.speedFactor *= 1.03 + value * 0.12;
  },
  "crush-uncommon": (draft, value) => {
    draft.massFactor *= 1.65 + value * 1.35;
    draft.speedFactor *= 0.94 - value * 0.18;
    draft.radiusFactor *= 1.06 + value * 0.26;
    draft.damageFactor *= 1.01 + value * 0.1;
  },
  "fork-common": (draft, value) => {
    const count = 2 + Math.round(value);

    draft.pelletCount += count - 1;
    draft.damageFactor *= getSplitDamageFactor(count, value * 0.05, 0);
    draft.spread += 0.085 + value * 0.085;
  },
  "hive-rare": (draft, value) => {
    const count = 4 + Math.round(value);

    draft.pelletCount += count - 1;
    draft.damageFactor *= getSplitDamageFactor(count, value * 0.02, 0.13);
    draft.spread += 0.065 + value * 0.065;
    draft.speedFactor *= 1 - value * 0.035;
  },
  "lob-common": (draft, value) => {
    draft.gravity += 1.5 + value * 3.8;
    draft.speedFactor *= 0.98 - value * 0.12;
    draft.ttlMs *= 1.05 + value * 0.13;
  },
  "maelstrom-rare": (draft, value) => {
    draft.curve += 4.2 + value * 4.4;
    draft.speedFactor *= 0.99 - value * 0.08;
    draft.spread += 0.012 + value * 0.03;
    draft.ttlMs *= 1.08 + value * 0.1;
  },
  "meteor-rare": (draft, value) => {
    draft.massFactor *= 2 + value * 1.45;
    draft.speedFactor *= 0.97 - value * 0.12;
    draft.radiusFactor *= 1.1 + value * 0.28;
    draft.damageFactor *= 1.08 + value * 0.14;
  },
  "pinpoint-uncommon": (draft, value) => {
    draft.spread *= 0.58 - value * 0.22;
    draft.speedFactor *= 1.05 + value * 0.18;
    draft.massFactor *= 0.98 - value * 0.09;
  },
  "ribbon-uncommon": (draft, value) => {
    draft.curve += 2.3 + value * 3.6;
    draft.speedFactor *= 0.98 - value * 0.11;
    draft.spread += 0.015 + value * 0.035;
    draft.ttlMs *= 1.04 + value * 0.08;
  },
  "ripple-common": (draft, value) => {
    draft.curve += 1.2 + value * 2.8;
    draft.speedFactor *= 0.96 - value * 0.16;
    draft.spread += 0.02 + value * 0.045;
  },
  "rush-common": (draft, value) => {
    draft.speedFactor *= 1.1 + value * 0.34;
    draft.massFactor *= 0.96 - value * 0.24;
    draft.damageFactor *= 1 - value * 0.1;
  },
};

const finalizeDraft = (draft: WeaponBuildDraft) => {
  draft.pelletCount = clamp(Math.round(draft.pelletCount), 1, 5);
  draft.damageFactor = clamp(draft.damageFactor, 0.12, 3.2);
  draft.speedFactor = clamp(draft.speedFactor, 0.42, 2.3);
  draft.massFactor = clamp(draft.massFactor, 0.45, 4.5);
  draft.radiusFactor = clamp(draft.radiusFactor, 0.85, 2.2);
  draft.spread = clamp(draft.spread, 0.008, 0.42);
  draft.curve = clamp(draft.curve, 0, 8.8);
  draft.gravity = clamp(draft.gravity, 0, 7);
  draft.drag = clamp(
    draft.drag + Math.max(0, draft.pelletCount - 1) * 0.008,
    0.02,
    0.42
  );
  draft.ttlMs = clamp(draft.ttlMs, 900, 3600);
  draft.damageProfile[0] = clamp(draft.damageProfile[0], 0.3, 2.4);
  draft.damageProfile[1] = clamp(draft.damageProfile[1], 0.3, 2.4);
  draft.damageProfile[2] = clamp(draft.damageProfile[2], 0.3, 2.4);
};

const getDamageProfileLabel = (damageProfile: [number, number, number]) => {
  if (damageProfile.every((value) => value === 1)) {
    return "flat";
  }

  const strongestBand = damageProfile.indexOf(Math.max(...damageProfile));

  if (strongestBand === 0) {
    return "front peak";
  }

  if (strongestBand === 1) {
    return "mid peak";
  }

  return "tail peak";
};

const getPatternLabel = (draft: WeaponBuildDraft) => {
  if (draft.curve > 5) {
    return draft.pelletCount > 1 ? "chaos split" : "chaos wave";
  }

  if (draft.curve > 0.8) {
    if (draft.pelletCount > 1) {
      return "wave split";
    }

    return draft.gravity > 1.2 ? "wave arc" : "wave";
  }

  if (draft.gravity > 1.2) {
    return draft.pelletCount > 1 ? "lob split" : "lob";
  }

  return draft.pelletCount > 1 ? "split" : "straight";
};

export const computeWeaponBuild = (
  nodes: WeaponFlowNode[],
  edges: WeaponFlowEdge[]
): WeaponBuild => {
  const draft = createWeaponBuildDraft();
  const modifierNodes = getOrderedModifierNodes(nodes, edges);

  for (const node of modifierNodes) {
    if (node.data.type) {
      modifierAppliers[node.data.type](draft, node.data.value ?? 0.45);
    }
  }

  finalizeDraft(draft);

  const damage = Math.round(BASE_DAMAGE * draft.damageFactor);
  const speed = BASE_SPEED * draft.speedFactor;
  const mass = BASE_MASS * draft.massFactor;
  const radius = BASE_RADIUS * draft.radiusFactor;
  const burstDamage = Math.round(damage * draft.pelletCount);
  const knockback = clamp(damage * 0.045 + mass * 2.9, 0.8, 10);
  const damageShare = clamp(
    burstDamage / (burstDamage + mass * 38 + speed * 0.55),
    0,
    1
  );
  const massShare = clamp(
    draft.massFactor /
      (draft.massFactor + draft.damageFactor + draft.speedFactor),
    0,
    1
  );
  const speedShare = clamp(draft.speedFactor / 2.3, 0, 1);
  const shell = mixColor("#3b82f6", "#ff5a5f", damageShare);
  const core = mixColor(
    "#7dd3fc",
    "#ffe08a",
    speedShare * 0.42 + damageShare * 0.58
  );
  const glow = mixColor(
    "#1d4ed8",
    "#ff7b54",
    damageShare * 0.76 + speedShare * 0.24
  );
  const gradient = `linear-gradient(90deg, #3b82f6 0%, ${shell} ${Math.round(
    massShare * 100
  )}%, #ff5a5f 100%)`;
  const damageProfileLabel = getDamageProfileLabel(draft.damageProfile);
  const patternLabel = getPatternLabel(draft);

  return {
    burstDamage,
    colors: { core, glow, gradient, shell },
    connectedModifierCount: modifierNodes.length,
    curve: draft.curve,
    damage,
    damageFactor: draft.damageFactor,
    damageProfile: draft.damageProfile,
    damageProfileLabel,
    drag: draft.drag,
    gravity: draft.gravity,
    knockback,
    mass,
    massFactor: draft.massFactor,
    patternLabel,
    pelletCount: draft.pelletCount,
    radius,
    rangeFactor: draft.ttlMs / BASE_TTL_MS,
    speed,
    speedFactor: draft.speedFactor,
    spread: draft.spread,
    ttlMs: draft.ttlMs,
  };
};

const wouldCreateCycle = (
  source: string,
  target: string,
  edges: WeaponFlowEdge[]
) => {
  const visited = new Set<string>([target]);
  const stack = [target];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    if (current === source) {
      return true;
    }

    for (const edge of edges) {
      if (edge.source !== current || visited.has(edge.target)) {
        continue;
      }

      visited.add(edge.target);
      stack.push(edge.target);
    }
  }

  return false;
};

export const isValidWeaponConnection = (
  connection: {
    source: string | null | undefined;
    target: string | null | undefined;
  },
  edges: WeaponFlowEdge[]
) => {
  const { source, target } = connection;

  if (!(source && target) || source === target) {
    return false;
  }

  if (source === weaponExitNodeId || target === weaponEntryNodeId) {
    return false;
  }

  if (edges.some((edge) => edge.source === source)) {
    return false;
  }

  if (edges.some((edge) => edge.target === target)) {
    return false;
  }

  if (edges.some((edge) => edge.source === source && edge.target === target)) {
    return false;
  }

  return !wouldCreateCycle(source, target, edges);
};
