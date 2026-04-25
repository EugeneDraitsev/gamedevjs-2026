export type OverworldPOIKind = "dungeon" | "shrine" | "landmark";

export interface OverworldPOI {
  color?: string;
  description?: string;
  floor?: number;
  id: string;
  kind: OverworldPOIKind;
  label: string;
  position: [number, number, number];
  seed?: string;
}

export interface OverworldTree {
  foliageColor: string;
  id: string;
  position: [number, number, number];
  scale: number;
}

export interface OverworldMountain {
  baseRadius: number;
  color: string;
  height: number;
  id: string;
  position: [number, number, number];
}

export interface OverworldHill {
  color: string;
  id: string;
  position: [number, number, number];
  scale: [number, number, number];
}

export interface OverworldRiverSegment {
  id: string;
  length: number;
  position: [number, number, number];
  width: number;
  yaw: number;
}

export interface OverworldEncounter {
  aggroRange: number;
  id: string;
  position: [number, number, number];
  templateId: string;
}

export interface OverworldChest {
  id: string;
  label: string;
  loot: string;
  position: [number, number, number];
}

export interface OverworldHealthPickup {
  amount: number;
  id: string;
  position: [number, number, number];
}

export interface OverworldLayout {
  chests: OverworldChest[];
  encounters: OverworldEncounter[];
  healthPickups: OverworldHealthPickup[];
  hills: OverworldHill[];
  mountains: OverworldMountain[];
  playableRadius: number;
  pois: OverworldPOI[];
  rivers: OverworldRiverSegment[];
  spawn: [number, number, number];
  trees: OverworldTree[];
}

export const OVERWORLD_INTERACT_RADIUS = 2.8;
export const OVERWORLD_PLAYABLE_RADIUS = 58;
export const OVERWORLD_MOUNTAIN_INNER_RADIUS = 60;
export const OVERWORLD_MOUNTAIN_OUTER_RADIUS = 78;
export const OVERWORLD_SEA_INNER_RADIUS = 80;
export const OVERWORLD_SEA_OUTER_RADIUS = 220;

const RNG_MODULUS = 2_147_483_647;

const createRng = (seed: number) => {
  let state = Math.abs(Math.trunc(seed)) % RNG_MODULUS || 17;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % RNG_MODULUS;
    return state / RNG_MODULUS;
  };
};

const hashSeed = (seed: string) =>
  [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % RNG_MODULUS, 17);

const basePois = (seed: string): OverworldPOI[] => [
  {
    id: "dungeon-warden",
    kind: "dungeon",
    position: [18, 0, -14],
    label: "Orb Knight Escape",
    description: "Floor 1 - the broken machine",
    seed,
    floor: 1,
    color: "#f1c671",
  },
  {
    id: "dungeon-forge",
    kind: "dungeon",
    position: [-24, 0, -6],
    label: "Forge of the Cinder Heir",
    description: "Floor 2 — rivers of slag",
    seed,
    floor: 2,
    color: "#ff6a3d",
  },
  {
    id: "dungeon-glow",
    kind: "dungeon",
    position: [6, 0, -36],
    label: "Glowhive Reliquary",
    description: "A deep hive pulses ahead",
    seed,
    floor: 1,
    color: "#7fe5c7",
  },
  {
    id: "dungeon-mines",
    kind: "dungeon",
    position: [-10, 0, 28],
    label: "Herald's Mines",
    description: "Distant detonations echo",
    seed,
    floor: 2,
    color: "#d17cff",
  },
  {
    id: "shrine-spawn",
    kind: "shrine",
    position: [0, 0, 0],
    label: "Wayfarer's Anvil",
    description: "A humming brass obelisk",
    color: "#9fd6ff",
  },
  {
    id: "landmark-ruin-east",
    kind: "landmark",
    position: [32, 0, 8],
    label: "Broken Arch",
    color: "#c9b789",
  },
  {
    id: "landmark-watchtower",
    kind: "landmark",
    position: [-38, 0, 22],
    label: "Sundered Watch",
    color: "#b7a1c9",
  },
];

const generateMountains = (rng: () => number): OverworldMountain[] => {
  const mountains: OverworldMountain[] = [];
  const inner = OVERWORLD_MOUNTAIN_INNER_RADIUS;
  const outer = OVERWORLD_MOUNTAIN_OUTER_RADIUS;
  const peakCount = 64;
  for (let i = 0; i < peakCount; i++) {
    // alternate front-row and back-row for ridge depth
    const isBackRow = i % 3 === 0;
    const angle =
      (i / peakCount) * Math.PI * 2 +
      (rng() - 0.5) * ((Math.PI * 2) / peakCount);
    const radius = isBackRow
      ? inner + (outer - inner) * (0.55 + rng() * 0.4)
      : inner + (outer - inner) * (0.05 + rng() * 0.35);
    const height = (isBackRow ? 10 : 7) + rng() * 8;
    let color: string;
    if (isBackRow) {
      color = "#201b1f";
    } else if (rng() > 0.5) {
      color = "#2b2623";
    } else {
      color = "#252025";
    }
    mountains.push({
      id: `mt-${i}`,
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
      height,
      baseRadius: 3 + rng() * 2.4,
      color,
    });
  }
  return mountains;
};

const forestCenters: [number, number][] = [
  [30, -26],
  [-30, -28],
  [-40, 8],
  [24, 32],
  [-4, 40],
  [-16, -14],
  [36, -8],
];

const generateTrees = (
  rng: () => number,
  pois: OverworldPOI[]
): OverworldTree[] => {
  const trees: OverworldTree[] = [];
  let id = 0;
  const avoidPoi = (px: number, pz: number, minDist: number) => {
    for (const poi of pois) {
      if (Math.hypot(px - poi.position[0], pz - poi.position[2]) < minDist) {
        return true;
      }
    }
    return false;
  };
  for (const [cx, cz] of forestCenters) {
    const count = 10 + Math.floor(rng() * 6);
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * 6.5;
      const px = cx + Math.cos(a) * r;
      const pz = cz + Math.sin(a) * r;
      if (Math.hypot(px, pz) > OVERWORLD_PLAYABLE_RADIUS - 2) {
        continue;
      }
      if (avoidPoi(px, pz, 4)) {
        continue;
      }
      trees.push({
        id: `tree-${id++}`,
        position: [px, 0, pz],
        scale: 0.9 + rng() * 0.7,
        foliageColor: rng() > 0.55 ? "#223f20" : "#2c4c26",
      });
    }
  }
  // a few stragglers scattered around
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2;
    const r = 14 + rng() * 36;
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    if (avoidPoi(px, pz, 5)) {
      continue;
    }
    trees.push({
      id: `tree-${id++}`,
      position: [px, 0, pz],
      scale: 0.95 + rng() * 0.4,
      foliageColor: rng() > 0.5 ? "#223f20" : "#2c4c26",
    });
  }
  return trees;
};

const generateHills = (
  rng: () => number,
  pois: OverworldPOI[]
): OverworldHill[] => {
  const hills: OverworldHill[] = [];
  let attempts = 0;
  while (hills.length < 12 && attempts < 80) {
    attempts++;
    const a = rng() * Math.PI * 2;
    const r = 16 + rng() * 36;
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    let tooClose = false;
    for (const poi of pois) {
      if (Math.hypot(px - poi.position[0], pz - poi.position[2]) < 5) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) {
      continue;
    }
    const s = 1.6 + rng() * 1.8;
    hills.push({
      id: `hill-${hills.length}`,
      position: [px, 0, pz],
      scale: [s, s * 0.38, s * (0.85 + rng() * 0.3)],
      color: rng() > 0.5 ? "#3b5230" : "#2f4427",
    });
  }
  return hills;
};

const rivers: OverworldRiverSegment[] = [
  // main river winds north-to-south on the east side of the map
  {
    id: "river-1",
    position: [12, 0.05, -32],
    yaw: Math.PI * 0.08,
    length: 22,
    width: 5.2,
  },
  {
    id: "river-2",
    position: [10, 0.05, -14],
    yaw: -Math.PI * 0.06,
    length: 20,
    width: 5.4,
  },
  {
    id: "river-3",
    position: [6, 0.05, 4],
    yaw: -Math.PI * 0.12,
    length: 20,
    width: 5.4,
  },
  {
    id: "river-4",
    position: [-1, 0.05, 22],
    yaw: -Math.PI * 0.2,
    length: 22,
    width: 5,
  },
  // tributary branching west
  {
    id: "river-5",
    position: [-17, 0.05, 14],
    yaw: Math.PI * 0.52,
    length: 28,
    width: 3.6,
  },
];

const encounters: OverworldEncounter[] = [
  {
    id: "enc-scrap-1",
    templateId: "scrap-runner",
    position: [14, 0.62, 8],
    aggroRange: 8,
  },
  {
    id: "enc-scrap-2",
    templateId: "scrap-runner",
    position: [-6, 0.62, 14],
    aggroRange: 8,
  },
  {
    id: "enc-bolt-1",
    templateId: "bolt-runner",
    position: [8, 0.62, -10],
    aggroRange: 9,
  },
  {
    id: "enc-bolt-2",
    templateId: "bolt-runner",
    position: [-14, 0.62, -10],
    aggroRange: 9,
  },
  {
    id: "enc-brute-1",
    templateId: "slag-brute",
    position: [22, 0.62, -4],
    aggroRange: 10,
  },
  {
    id: "enc-coil-1",
    templateId: "coil-sentry",
    position: [-20, 0.62, 4],
    aggroRange: 10,
  },
  {
    id: "enc-ember-1",
    templateId: "ember-artillery",
    position: [2, 0.62, 18],
    aggroRange: 10,
  },
];

const chests: OverworldChest[] = [
  {
    id: "chest-east",
    position: [26, 0, 16],
    label: "Ironbound Chest",
    loot: "A fistful of brass cogs",
  },
  {
    id: "chest-west",
    position: [-26, 0, 2],
    label: "Ancient Coffer",
    loot: "A dim-glowing rune stone",
  },
  {
    id: "chest-south",
    position: [4, 0, 18],
    label: "Traveler's Cache",
    loot: "Two dented ration tins",
  },
];

const healthPickups: OverworldHealthPickup[] = [
  { id: "hp-near-shrine", position: [4, 0, 2], amount: 1 },
  { id: "hp-east", position: [16, 0, 14], amount: 1 },
  { id: "hp-west", position: [-16, 0, -4], amount: 1 },
  { id: "hp-far-south", position: [-2, 0, 22], amount: 2 },
];

export const createOverworldLayout = (seed: string): OverworldLayout => {
  const rng = createRng(hashSeed(seed));
  const pois = basePois(seed);
  return {
    playableRadius: OVERWORLD_PLAYABLE_RADIUS,
    spawn: [0, 0.6, 6],
    pois,
    mountains: generateMountains(rng),
    trees: generateTrees(rng, pois),
    hills: generateHills(rng, pois),
    rivers,
    encounters,
    chests,
    healthPickups,
  };
};

export const isInteractable = (kind: OverworldPOIKind) =>
  kind === "dungeon" || kind === "shrine";
