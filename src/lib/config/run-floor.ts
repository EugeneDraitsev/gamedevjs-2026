export const initialDungeonFloor = -2;
export const outsideFloor = 0;
export const finalDungeonFloor = outsideFloor - 1;

export const normalizeRunFloorIndex = (floorIndex: unknown) => {
  if (typeof floorIndex !== "number" || !Number.isFinite(floorIndex)) {
    return initialDungeonFloor;
  }

  return Math.max(
    initialDungeonFloor,
    Math.min(outsideFloor, Math.round(floorIndex))
  );
};

export const getNextRunFloor = (floorIndex: number) =>
  Math.min(outsideFloor, floorIndex + 1);

export const formatRunFloorLabel = (floorIndex: number) =>
  floorIndex === outsideFloor ? "Outside" : `Floor ${floorIndex}`;
