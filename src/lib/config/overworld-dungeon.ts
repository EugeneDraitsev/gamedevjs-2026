import type { DungeonLayout, DungeonRoom } from "$lib/config/dungeon-layout";
import { OVERWORLD_PLAYABLE_RADIUS } from "$lib/config/overworld-layout";

export const OVERWORLD_ROOM_ID = "overworld";
export const OVERWORLD_TEMPLATE_ID = "overworld-arena";

export const createOverworldDungeon = (seed: string): DungeonLayout => {
  const room: DungeonRoom = {
    exits: {},
    grid: [0, 0],
    id: OVERWORLD_ROOM_ID,
    kind: "polygon",
    label: "Wayfarer's Reach",
    templateId: OVERWORLD_TEMPLATE_ID,
  };

  return {
    floor: 0,
    initialModules: [],
    rooms: { [OVERWORLD_ROOM_ID]: room },
    seed,
    startRoomId: OVERWORLD_ROOM_ID,
  };
};
