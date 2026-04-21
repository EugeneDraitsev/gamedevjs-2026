import type {
  WeaponFlowEdge,
  WeaponFlowNode,
  WeaponNodeType,
} from "$lib/config/weapon-graph";

export interface SavedRunState {
  collectedArtifactRooms: string[];
  floorIndex: number;
  gearCount?: number;
  looseModules: WeaponNodeType[];
  weaponEdges: WeaponFlowEdge[];
  weaponNodes: WeaponFlowNode[];
}

const getRunSaveKey = (seed: string) => `warden-run:${seed}`;

export const loadRunSave = (seed: string): SavedRunState | null => {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(getRunSaveKey(seed));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SavedRunState;
  } catch {
    localStorage.removeItem(getRunSaveKey(seed));
    return null;
  }
};

export const saveRunSave = (seed: string, state: SavedRunState) => {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(getRunSaveKey(seed), JSON.stringify(state));
};
