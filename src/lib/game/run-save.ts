import {
  createDefaultMachineLoadout,
  createDefaultModuleInventory,
  isMachineModuleId,
  type MachineLoadout,
  type MachineModuleId,
  normalizeMachineLoadout,
} from "$lib/config/machine-modules";

export interface SavedRunState {
  collectedArtifactRooms: string[];
  floorIndex: number;
  gearCount?: number;
  machineLoadout: MachineLoadout;
  moduleInventory: MachineModuleId[];
  version: 2;
}

const getRunSaveKey = (seed: string) => `warden-run:${seed}`;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseSavedRun = (value: unknown): SavedRunState | null => {
  if (!isObject(value) || value.version !== 2) {
    return null;
  }

  const collectedArtifactRooms = Array.isArray(value.collectedArtifactRooms)
    ? value.collectedArtifactRooms.filter(
        (roomId): roomId is string => typeof roomId === "string"
      )
    : [];
  const floorIndex =
    typeof value.floorIndex === "number" && Number.isFinite(value.floorIndex)
      ? Math.max(1, Math.round(value.floorIndex))
      : 1;
  const gearCount =
    typeof value.gearCount === "number" && Number.isFinite(value.gearCount)
      ? Math.max(0, Math.round(value.gearCount))
      : 0;
  const machineLoadout = normalizeMachineLoadout(
    isObject(value.machineLoadout) ? value.machineLoadout : null
  );
  const installed = new Set(Object.values(machineLoadout).filter(Boolean));
  const moduleInventory = Array.isArray(value.moduleInventory)
    ? value.moduleInventory.filter(
        (moduleId): moduleId is MachineModuleId =>
          isMachineModuleId(moduleId) && !installed.has(moduleId)
      )
    : createDefaultModuleInventory();

  return {
    collectedArtifactRooms,
    floorIndex,
    gearCount,
    machineLoadout,
    moduleInventory,
    version: 2,
  };
};

export const createDefaultRunState = (): SavedRunState => ({
  collectedArtifactRooms: [],
  floorIndex: 1,
  gearCount: 0,
  machineLoadout: createDefaultMachineLoadout(),
  moduleInventory: createDefaultModuleInventory(),
  version: 2,
});

export const loadRunSave = (seed: string): SavedRunState | null => {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(getRunSaveKey(seed));

  if (!raw) {
    return null;
  }

  try {
    const parsed = parseSavedRun(JSON.parse(raw));

    if (!parsed) {
      localStorage.removeItem(getRunSaveKey(seed));
    }

    return parsed;
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

export const clearRunSave = (seed: string) => {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.removeItem(getRunSaveKey(seed));
};
