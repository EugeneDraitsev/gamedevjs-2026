import { describe, expect, it } from "vitest";
import type { DungeonRoom } from "../config/dungeon-layout";
import {
  clampToRoom,
  getConveyorVelocity,
  getRoomPlatforms,
  getTransition,
  playerRadius,
  roomTransitionInsetX,
  roomTransitionInsetZ,
} from "./scene-layout";

const roomWithDoors: DungeonRoom = {
  exits: {
    east: "east-room",
    north: "north-room",
    south: "south-room",
    west: "west-room",
  },
  grid: [0, 0],
  id: "center",
  kind: "normal",
  label: "Center",
  templateId: "normal-line",
};

describe("clampToRoom", () => {
  it("still allows reaching east and west transition thresholds", () => {
    expect(clampToRoom([99, 1, 0], playerRadius)[0]).toBeCloseTo(
      roomTransitionInsetX,
      6
    );
    expect(clampToRoom([-99, 1, 0], playerRadius)[0]).toBeCloseTo(
      -roomTransitionInsetX,
      6
    );
  });

  it("still allows reaching north and south transition thresholds", () => {
    expect(clampToRoom([0, 1, 99], playerRadius)[2]).toBeCloseTo(
      roomTransitionInsetZ,
      6
    );
    expect(clampToRoom([0, 1, -99], playerRadius)[2]).toBeCloseTo(
      -roomTransitionInsetZ,
      6
    );
  });
});

describe("getConveyorVelocity", () => {
  it("returns catwalk conveyor velocity on top of a conveyor", () => {
    expect(
      getConveyorVelocity(getRoomPlatforms("catwalk"), [0, 0.7, 0])
    ).toEqual([0, 0, 3.74]);
  });

  it("ignores points below the conveyor top", () => {
    expect(
      getConveyorVelocity(getRoomPlatforms("catwalk"), [0, 0.38, 0])
    ).toBeNull();
  });
});

describe("getTransition", () => {
  it("can transition after clamping at an east doorway", () => {
    const position = clampToRoom([99, 1, 0], playerRadius);

    expect(getTransition(roomWithDoors, position)?.roomId).toBe("east-room");
  });

  it("can transition after clamping at a north doorway", () => {
    const position = clampToRoom([0, 1, -99], playerRadius);

    expect(getTransition(roomWithDoors, position)?.roomId).toBe("north-room");
  });
});
