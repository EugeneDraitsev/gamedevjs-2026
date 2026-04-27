import {
  createDefaultMachineLoadout,
  createDefaultModuleInventory,
  isMachineModuleId,
  type MachineLoadout,
  type MachineModuleId,
  normalizeMachineLoadout,
} from "$lib/config/machine-modules";
import {
  initialDungeonFloor,
  normalizeRunFloorIndex,
} from "$lib/config/run-floor";
import type { ActivePickup } from "$lib/types/game";

export interface RunCheckpoint {
  clearedEnemyRoomIds: string[];
  corePrisonSealBrokenAt: number;
  corePrisonSealHits: number;
  currentRoomId: string;
  exploredRoomIds: string[];
  floorIndex: number;
  pickupsByRoomId: Record<string, ActivePickup[]>;
  playerAmmo: number;
  playerHealth: number;
  playerPosition: [number, number, number];
  releasedRoomIds: string[];
}

export interface SavedRunState {
  checkpoint?: RunCheckpoint | null;
  collectedArtifactRooms: string[];
  floorIndex: number;
  gearCount?: number;
  machineLoadout: MachineLoadout;
  moduleInventory: MachineModuleId[];
  newModuleIds?: MachineModuleId[];
  purchasedShopOfferIds?: string[];
  version: 2;
}

const getRunSaveKey = (seed: string) => `warden-run:${seed}`;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const finiteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const parseStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

const parseVec3 = (value: unknown): [number, number, number] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const x = finiteNumber(value[0]);
  const y = finiteNumber(value[1]);
  const z = finiteNumber(value[2]);
  return x !== null && y !== null && z !== null ? [x, y, z] : null;
};

const isPickupKind = (value: unknown): value is "gear" | "heal" | "key" =>
  value === "gear" || value === "heal" || value === "key";

const parseActivePickup = (value: unknown): ActivePickup | null => {
  if (!isObject(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id : null;
  const kind = isPickupKind(value.kind) ? value.kind : null;
  const position = parseVec3(value.position);
  const radius = finiteNumber(value.radius);
  const pickupValue = finiteNumber(value.value);
  const createdAt = finiteNumber(value.createdAt);

  if (
    !(id && kind && position) ||
    radius === null ||
    pickupValue === null ||
    createdAt === null
  ) {
    return null;
  }

  const collectedAt = finiteNumber(value.collectedAt);
  const collectedTo = parseVec3(value.collectedTo);
  const magnetizedAt = finiteNumber(value.magnetizedAt);

  const pickup: ActivePickup = {
    createdAt,
    id,
    kind,
    position,
    radius,
    value: pickupValue,
  };

  if (collectedAt !== null) {
    pickup.collectedAt = collectedAt;
  }
  if (collectedTo) {
    pickup.collectedTo = collectedTo;
  }
  if (magnetizedAt !== null) {
    pickup.magnetizedAt = magnetizedAt;
  }

  return pickup;
};

const parsePickupsByRoomId = (
  value: unknown
): Record<string, ActivePickup[]> => {
  if (!isObject(value)) {
    return {};
  }

  const result: Record<string, ActivePickup[]> = {};

  for (const [roomId, items] of Object.entries(value)) {
    if (!Array.isArray(items)) {
      continue;
    }

    const parsed: ActivePickup[] = [];
    for (const entry of items) {
      const pickup = parseActivePickup(entry);
      if (pickup) {
        parsed.push(pickup);
      }
    }

    result[roomId] = parsed;
  }

  return result;
};

const parseCheckpoint = (value: unknown): RunCheckpoint | null => {
  if (!isObject(value)) {
    return null;
  }

  const currentRoomId =
    typeof value.currentRoomId === "string" ? value.currentRoomId : null;
  const floorIndex = finiteNumber(value.floorIndex);
  const positionRaw = Array.isArray(value.playerPosition)
    ? value.playerPosition
    : null;
  const px = positionRaw ? finiteNumber(positionRaw[0]) : null;
  const py = positionRaw ? finiteNumber(positionRaw[1]) : null;
  const pz = positionRaw ? finiteNumber(positionRaw[2]) : null;

  if (
    !currentRoomId ||
    floorIndex === null ||
    px === null ||
    py === null ||
    pz === null
  ) {
    return null;
  }

  const playerHealth = finiteNumber(value.playerHealth);
  const playerAmmo = finiteNumber(value.playerAmmo);
  const corePrisonSealHits = finiteNumber(value.corePrisonSealHits);
  const corePrisonSealBrokenAt = finiteNumber(value.corePrisonSealBrokenAt);

  return {
    clearedEnemyRoomIds: parseStringArray(value.clearedEnemyRoomIds),
    corePrisonSealBrokenAt:
      corePrisonSealBrokenAt === null ? 0 : corePrisonSealBrokenAt,
    corePrisonSealHits:
      corePrisonSealHits === null
        ? 0
        : Math.max(0, Math.round(corePrisonSealHits)),
    currentRoomId,
    exploredRoomIds: parseStringArray(value.exploredRoomIds),
    floorIndex: normalizeRunFloorIndex(floorIndex),
    pickupsByRoomId: parsePickupsByRoomId(value.pickupsByRoomId),
    playerAmmo: playerAmmo === null ? 0 : Math.max(0, Math.round(playerAmmo)),
    playerHealth: playerHealth === null ? 0 : Math.max(0, playerHealth),
    playerPosition: [px, py, pz],
    releasedRoomIds: parseStringArray(value.releasedRoomIds),
  };
};

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
      ? normalizeRunFloorIndex(value.floorIndex)
      : initialDungeonFloor;
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
  const purchasedShopOfferIds = Array.isArray(value.purchasedShopOfferIds)
    ? value.purchasedShopOfferIds.filter(
        (id): id is string => typeof id === "string"
      )
    : [];
  const newModuleIds = Array.isArray(value.newModuleIds)
    ? value.newModuleIds.filter((moduleId): moduleId is MachineModuleId =>
        isMachineModuleId(moduleId)
      )
    : [];
  const checkpoint = parseCheckpoint(value.checkpoint);

  return {
    checkpoint,
    collectedArtifactRooms,
    floorIndex,
    gearCount,
    machineLoadout,
    moduleInventory,
    newModuleIds,
    purchasedShopOfferIds,
    version: 2,
  };
};

export const createDefaultRunState = (): SavedRunState => ({
  checkpoint: null,
  collectedArtifactRooms: [],
  floorIndex: initialDungeonFloor,
  gearCount: 0,
  machineLoadout: createDefaultMachineLoadout(),
  moduleInventory: createDefaultModuleInventory(),
  newModuleIds: [],
  purchasedShopOfferIds: [],
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
