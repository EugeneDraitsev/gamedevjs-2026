import { describe, expect, it } from "vitest";
import {
  buildOutsideWarmupViews,
  createWarmupStabilityTracker,
} from "./renderer-warmup";

const createOutsideTracker = () =>
  createWarmupStabilityTracker({
    maxPasses: 20,
    minPasses: 2,
    stableFrameMs: 20,
    stablePasses: 2,
    viewCount: 3,
  });

describe("renderer warmup", () => {
  it("adds seed-generated outside POIs to the warmup camera catalog", () => {
    const baseViews = [
      {
        position: [0, 42, 72],
        target: [0, 0, 30],
      },
    ] satisfies Parameters<typeof buildOutsideWarmupViews>[0];

    const views = buildOutsideWarmupViews(baseViews, [{ x: -42, y: 1, z: 18 }]);

    expect(views).toHaveLength(2);
    expect(views[0]).toEqual(baseViews[0]);
    expect(views[1]).toEqual({
      position: [-42, 35, 48],
      target: [-42, 1, 18],
    });
  });

  it("waits until every warmup view renders clean after shader compilation", () => {
    const tracker = createOutsideTracker();

    expect(
      tracker.record({ duration: 3, newPrograms: 0, viewIndex: 0 })
    ).toMatchObject({
      cleanViewCount: 1,
      done: false,
      stablePasses: 1,
    });
    expect(
      tracker.record({ duration: 3, newPrograms: 0, viewIndex: 1 })
    ).toMatchObject({
      cleanViewCount: 2,
      done: false,
      stablePasses: 2,
    });
    expect(
      tracker.record({ duration: 3, newPrograms: 0, viewIndex: 2 })
    ).toMatchObject({
      cleanCycles: 1,
      cleanViewCount: 3,
      done: true,
      stablePasses: 3,
    });
  });

  it("resets clean view coverage when a later view creates a shader program", () => {
    const tracker = createOutsideTracker();

    tracker.record({ duration: 3, newPrograms: 0, viewIndex: 0 });
    tracker.record({ duration: 3, newPrograms: 0, viewIndex: 1 });

    expect(
      tracker.record({ duration: 120, newPrograms: 1, viewIndex: 2 })
    ).toMatchObject({
      cleanCycles: 0,
      cleanViewCount: 0,
      done: false,
      stablePasses: 0,
    });
    expect(
      tracker.record({ duration: 3, newPrograms: 0, viewIndex: 0 })
    ).toMatchObject({
      cleanViewCount: 1,
      done: false,
      stablePasses: 1,
    });
    expect(
      tracker.record({ duration: 3, newPrograms: 0, viewIndex: 1 })
    ).toMatchObject({
      cleanViewCount: 2,
      done: false,
      stablePasses: 2,
    });
    expect(
      tracker.record({ duration: 3, newPrograms: 0, viewIndex: 2 })
    ).toMatchObject({
      cleanCycles: 1,
      cleanViewCount: 3,
      done: true,
      stablePasses: 3,
    });
  });

  it("keeps covered views but restarts the stability streak after a slow clean frame", () => {
    const tracker = createWarmupStabilityTracker({
      maxPasses: 20,
      minPasses: 2,
      stableFrameMs: 20,
      stablePasses: 2,
      viewCount: 2,
    });

    expect(
      tracker.record({ duration: 40, newPrograms: 0, viewIndex: 0 })
    ).toMatchObject({
      cleanViewCount: 1,
      done: false,
      stablePasses: 0,
    });
    expect(
      tracker.record({ duration: 3, newPrograms: 0, viewIndex: 1 })
    ).toMatchObject({
      cleanViewCount: 2,
      done: false,
      stablePasses: 1,
    });
    expect(
      tracker.record({ duration: 3, newPrograms: 0, viewIndex: 0 })
    ).toMatchObject({
      cleanViewCount: 2,
      done: true,
      stablePasses: 2,
    });
  });

  it("can require repeated clean cycles across every warmup view", () => {
    const tracker = createWarmupStabilityTracker({
      cleanCycles: 2,
      maxPasses: 10,
      minPasses: 1,
      stableFrameMs: 20,
      stablePasses: 1,
      viewCount: 2,
    });

    expect(
      tracker.record({ duration: 3, newPrograms: 0, viewIndex: 0 })
    ).toMatchObject({
      cleanCycles: 0,
      cleanViewCount: 1,
      done: false,
    });
    expect(
      tracker.record({ duration: 3, newPrograms: 0, viewIndex: 1 })
    ).toMatchObject({
      cleanCycles: 1,
      cleanViewCount: 2,
      done: false,
    });
    expect(
      tracker.record({ duration: 3, newPrograms: 0, viewIndex: 0 })
    ).toMatchObject({
      cleanCycles: 1,
      done: false,
    });
    expect(
      tracker.record({ duration: 3, newPrograms: 0, viewIndex: 1 })
    ).toMatchObject({
      cleanCycles: 2,
      done: true,
    });
  });

  it("stops at the max pass cap even when shaders keep appearing", () => {
    const tracker = createWarmupStabilityTracker({
      maxPasses: 3,
      minPasses: 1,
      stableFrameMs: 20,
      stablePasses: 1,
      viewCount: 3,
    });

    expect(
      tracker.record({ duration: 80, newPrograms: 1, viewIndex: 0 })
    ).toMatchObject({ done: false, maxReached: false, pass: 1 });
    expect(
      tracker.record({ duration: 80, newPrograms: 1, viewIndex: 1 })
    ).toMatchObject({ done: false, maxReached: false, pass: 2 });
    expect(
      tracker.record({ duration: 80, newPrograms: 1, viewIndex: 2 })
    ).toMatchObject({ done: true, maxReached: true, pass: 3 });
  });
});
