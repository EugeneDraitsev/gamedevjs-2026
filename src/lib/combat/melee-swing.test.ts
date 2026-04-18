import { describe, expect, it } from "vitest";
import {
  applyYRotationToLocalPoint,
  buildSwingRibbonGeometryData,
  DEFAULT_SWING,
  easeSwing,
  isPointInSwing,
  isSwingActive,
  type SwingParams,
  sampleSwingArc,
  sampleSwingPose,
  swingAngleAt,
  swingGroupRotationY,
  swingKnockbackDirection,
  swingProgress,
  swingRibbonProgress,
  swingTipPosition,
  type Vec3,
} from "./melee-swing";

const CENTER: Vec3 = [0, 0.9, 0];
const AT = (yaw: number, distance: number, center: Vec3 = CENTER): Vec3 => [
  center[0] + Math.sin(yaw) * distance,
  center[1],
  center[2] + Math.cos(yaw) * distance,
];

const ACTIVE_SAMPLES = [0.22, 0.3, 0.45, 0.5, 0.6, 0.75, 0.8];
const FACINGS = [0, Math.PI / 2, -Math.PI / 2, Math.PI, 1.234, -2.345];

describe("swingProgress", () => {
  it("clamps to [0,1]", () => {
    expect(swingProgress(-10)).toBe(0);
    expect(swingProgress(0)).toBe(0);
    expect(swingProgress(DEFAULT_SWING.durationMs)).toBe(1);
    expect(swingProgress(DEFAULT_SWING.durationMs * 3)).toBe(1);
  });

  it("is linear between 0 and 1", () => {
    expect(swingProgress(DEFAULT_SWING.durationMs / 2)).toBeCloseTo(0.5, 6);
    expect(swingProgress(DEFAULT_SWING.durationMs / 4)).toBeCloseTo(0.25, 6);
  });
});

describe("easeSwing", () => {
  it("hits 0 and 1 at the endpoints", () => {
    expect(easeSwing(0)).toBe(0);
    expect(easeSwing(1)).toBe(1);
  });

  it("is monotonically increasing", () => {
    let previous = 0;

    for (let index = 1; index <= 20; index += 1) {
      const value = easeSwing(index / 20);

      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it("has smoothstep symmetry around 0.5", () => {
    expect(easeSwing(0.5)).toBeCloseTo(0.5, 6);
    expect(easeSwing(0.25) + easeSwing(0.75)).toBeCloseTo(1, 6);
  });
});

describe("swingAngleAt", () => {
  it("reaches start and end angles at the endpoints", () => {
    expect(swingAngleAt(0)).toBeCloseTo(DEFAULT_SWING.startAngle, 6);
    expect(swingAngleAt(1)).toBeCloseTo(DEFAULT_SWING.endAngle, 6);
  });

  it("is monotonic across the sweep", () => {
    const direction = Math.sign(
      DEFAULT_SWING.endAngle - DEFAULT_SWING.startAngle
    );
    let previous = swingAngleAt(0);

    for (let index = 1; index <= 20; index += 1) {
      const value = swingAngleAt(index / 20);

      expect((value - previous) * direction).toBeGreaterThanOrEqual(-1e-9);
      previous = value;
    }
  });
});

describe("isSwingActive", () => {
  it("is false during windup and recovery", () => {
    expect(isSwingActive(0)).toBe(false);
    expect(isSwingActive(DEFAULT_SWING.activeStart - 0.01)).toBe(false);
    expect(isSwingActive(DEFAULT_SWING.activeEnd + 0.01)).toBe(false);
    expect(isSwingActive(1)).toBe(false);
  });

  it("is true during the active window", () => {
    expect(isSwingActive(DEFAULT_SWING.activeStart)).toBe(true);
    expect(isSwingActive(DEFAULT_SWING.activeEnd)).toBe(true);
    expect(isSwingActive(0.5)).toBe(true);
  });
});

describe("sampleSwingPose ↔ swingTipPosition consistency", () => {
  for (const facingYaw of FACINGS) {
    for (const t of ACTIVE_SAMPLES) {
      it(`tip is exactly reach away at pose bladeYaw (facing=${facingYaw.toFixed(
        3
      )}, t=${t})`, () => {
        const pose = sampleSwingPose(t, CENTER, facingYaw);
        const tip = swingTipPosition(t, CENTER, facingYaw);
        const dx = tip[0] - pose.pivot[0];
        const dz = tip[2] - pose.pivot[2];
        const distance = Math.hypot(dx, dz);
        const observedYaw = Math.atan2(dx, dz);
        const wrapped = Math.atan2(
          Math.sin(observedYaw - pose.bladeYaw),
          Math.cos(observedYaw - pose.bladeYaw)
        );

        expect(distance).toBeCloseTo(pose.reach, 6);
        expect(wrapped).toBeCloseTo(0, 6);
      });
    }
  }
});

describe("hitbox matches the visual pose", () => {
  for (const facingYaw of FACINGS) {
    for (const t of ACTIVE_SAMPLES) {
      it(`tip is inside the swing hitbox (facing=${facingYaw.toFixed(
        3
      )}, t=${t})`, () => {
        const pose = sampleSwingPose(t, CENTER, facingYaw);
        const tipShort = AT(pose.bladeYaw, pose.reach - 0.001);
        const midBlade = AT(pose.bladeYaw, (pose.innerRadius + pose.reach) / 2);

        expect(isPointInSwing(tipShort, t, CENTER, facingYaw)).toBe(true);
        expect(isPointInSwing(midBlade, t, CENTER, facingYaw)).toBe(true);
      });

      it(`point outside the blade arc is NOT hit (facing=${facingYaw.toFixed(
        3
      )}, t=${t})`, () => {
        const pose = sampleSwingPose(t, CENTER, facingYaw);
        const epsilon = 0.04;
        const justPastPlus = AT(
          pose.bladeYaw + pose.thickness + epsilon,
          (pose.innerRadius + pose.reach) / 2
        );
        const justPastMinus = AT(
          pose.bladeYaw - pose.thickness - epsilon,
          (pose.innerRadius + pose.reach) / 2
        );

        expect(isPointInSwing(justPastPlus, t, CENTER, facingYaw)).toBe(false);
        expect(isPointInSwing(justPastMinus, t, CENTER, facingYaw)).toBe(false);
      });

      it(`points inside the arc but outside reach are NOT hit (facing=${facingYaw.toFixed(
        3
      )}, t=${t})`, () => {
        const pose = sampleSwingPose(t, CENTER, facingYaw);
        const tooFar = AT(pose.bladeYaw, pose.reach + 0.1);
        const tooClose = AT(pose.bladeYaw, Math.max(0, pose.innerRadius - 0.1));

        expect(isPointInSwing(tooFar, t, CENTER, facingYaw)).toBe(false);
        expect(isPointInSwing(tooClose, t, CENTER, facingYaw)).toBe(false);
      });
    }
  }
});

describe("swing does not hit outside the active window", () => {
  for (const facingYaw of FACINGS) {
    it(`tip during windup is NOT hit (facing=${facingYaw.toFixed(3)})`, () => {
      const t = DEFAULT_SWING.activeStart - 0.05;
      const pose = sampleSwingPose(t, CENTER, facingYaw);
      const tip = AT(pose.bladeYaw, pose.reach * 0.9);

      expect(isPointInSwing(tip, t, CENTER, facingYaw)).toBe(false);
    });

    it(`tip during recovery is NOT hit (facing=${facingYaw.toFixed(3)})`, () => {
      const t = DEFAULT_SWING.activeEnd + 0.05;
      const pose = sampleSwingPose(t, CENTER, facingYaw);
      const tip = AT(pose.bladeYaw, pose.reach * 0.9);

      expect(isPointInSwing(tip, t, CENTER, facingYaw)).toBe(false);
    });
  }
});

describe("swingKnockbackDirection", () => {
  it("is perpendicular to the radial direction", () => {
    const point: Vec3 = [2, 0.9, 0.6];
    const [kx, kz] = swingKnockbackDirection(point, CENTER);
    const dx = point[0] - CENTER[0];
    const dz = point[2] - CENTER[2];
    const radial = Math.hypot(dx, dz);
    const dot = (dx / radial) * kx + (dz / radial) * kz;

    expect(dot).toBeCloseTo(0, 6);
    expect(Math.hypot(kx, kz)).toBeCloseTo(1, 6);
  });

  it("points along the sweep direction", () => {
    const point: Vec3 = [0, 0.9, 2];
    const [kx] = swingKnockbackDirection(point, CENTER);

    expect(kx).toBeGreaterThan(0);
  });

  it("flips sign when the sweep reverses", () => {
    const reversed: SwingParams = {
      ...DEFAULT_SWING,
      startAngle: DEFAULT_SWING.endAngle,
      endAngle: DEFAULT_SWING.startAngle,
    };
    const point: Vec3 = [0, 0.9, 2];
    const [forwardKx] = swingKnockbackDirection(point, CENTER);
    const [reversedKx] = swingKnockbackDirection(point, CENTER, reversed);

    expect(Math.sign(forwardKx)).toBe(-Math.sign(reversedKx));
  });
});

describe("sampleSwingArc", () => {
  it("returns points that are all hits at the same t", () => {
    const t = 0.5;
    const facingYaw = 0.5;
    const arc = sampleSwingArc(t, CENTER, facingYaw, 8);

    expect(arc.length).toBe(8);

    for (const hit of arc) {
      expect(isPointInSwing(hit.point, t, CENTER, facingYaw)).toBe(true);
    }
  });

  it("rejects sample counts below 2", () => {
    expect(() => sampleSwingArc(0.5, CENTER, 0, 1)).toThrow();
  });
});

describe("three.js visual transform matches the hitbox", () => {
  for (const facingYaw of FACINGS) {
    for (const t of ACTIVE_SAMPLES) {
      it(`blade-local tip transformed by swing rotation lands exactly on swingTipPosition (facing=${facingYaw.toFixed(
        3
      )}, t=${t})`, () => {
        const rotationY = swingGroupRotationY(t, facingYaw);
        const localTip: Vec3 = [0, 0, DEFAULT_SWING.reach];
        const worldTipFromVisual = applyYRotationToLocalPoint(
          localTip,
          rotationY,
          CENTER
        );
        const worldTipFromHitbox = swingTipPosition(
          t,
          CENTER,
          facingYaw,
          CENTER[1]
        );

        expect(worldTipFromVisual[0]).toBeCloseTo(worldTipFromHitbox[0], 6);
        expect(worldTipFromVisual[1]).toBeCloseTo(worldTipFromHitbox[1], 6);
        expect(worldTipFromVisual[2]).toBeCloseTo(worldTipFromHitbox[2], 6);
      });

      it(`blade-local mid-blade transformed by swing rotation is inside the hitbox (facing=${facingYaw.toFixed(
        3
      )}, t=${t})`, () => {
        const rotationY = swingGroupRotationY(t, facingYaw);
        const midRadial = (DEFAULT_SWING.innerRadius + DEFAULT_SWING.reach) / 2;
        const localMid: Vec3 = [0, 0, midRadial];
        const worldMid = applyYRotationToLocalPoint(
          localMid,
          rotationY,
          CENTER
        );

        expect(isPointInSwing(worldMid, t, CENTER, facingYaw)).toBe(true);
      });

      it(`blade-local point past the outer radius is NOT hit (facing=${facingYaw.toFixed(
        3
      )}, t=${t})`, () => {
        const rotationY = swingGroupRotationY(t, facingYaw);
        const localPastTip: Vec3 = [0, 0, DEFAULT_SWING.reach + 0.25];
        const worldPastTip = applyYRotationToLocalPoint(
          localPastTip,
          rotationY,
          CENTER
        );

        expect(isPointInSwing(worldPastTip, t, CENTER, facingYaw)).toBe(false);
      });

      it(`blade-local lateral offset past the arc thickness is NOT hit (facing=${facingYaw.toFixed(
        3
      )}, t=${t})`, () => {
        const rotationY = swingGroupRotationY(t, facingYaw);
        const midRadial = (DEFAULT_SWING.innerRadius + DEFAULT_SWING.reach) / 2;
        const sidewaysOffset =
          midRadial * Math.tan(DEFAULT_SWING.thickness) + 0.2;
        const localSideways: Vec3 = [sidewaysOffset, 0, midRadial];
        const worldSideways = applyYRotationToLocalPoint(
          localSideways,
          rotationY,
          CENTER
        );

        expect(isPointInSwing(worldSideways, t, CENTER, facingYaw)).toBe(false);
      });
    }
  }
});

describe("buildSwingRibbonGeometryData", () => {
  it("produces vertex pairs on the inner and outer radius at each segment", () => {
    const segments = 12;
    const data = buildSwingRibbonGeometryData(DEFAULT_SWING, segments);

    expect(data.positions.length).toBe((segments + 1) * 2 * 3);
    expect(data.uvs.length).toBe((segments + 1) * 2 * 2);
    expect(data.indices.length).toBe(segments * 6);

    for (let i = 0; i <= segments; i += 1) {
      const u = i / segments;
      const expectedAngle =
        DEFAULT_SWING.startAngle +
        (DEFAULT_SWING.endAngle - DEFAULT_SWING.startAngle) * u;
      const innerX = data.positions[i * 2 * 3];
      const innerZ = data.positions[i * 2 * 3 + 2];
      const outerX = data.positions[(i * 2 + 1) * 3];
      const outerZ = data.positions[(i * 2 + 1) * 3 + 2];
      const innerRadius = Math.hypot(innerX, innerZ);
      const outerRadius = Math.hypot(outerX, outerZ);
      const innerAngle = Math.atan2(innerX, innerZ);
      const outerAngle = Math.atan2(outerX, outerZ);

      expect(innerRadius).toBeCloseTo(DEFAULT_SWING.innerRadius, 6);
      expect(outerRadius).toBeCloseTo(DEFAULT_SWING.reach, 6);
      expect(innerAngle).toBeCloseTo(expectedAngle, 6);
      expect(outerAngle).toBeCloseTo(expectedAngle, 6);
      expect(data.uvs[i * 2 * 2]).toBeCloseTo(u, 6);
      expect(data.uvs[i * 2 * 2 + 1]).toBe(0);
      expect(data.uvs[(i * 2 + 1) * 2]).toBeCloseTo(u, 6);
      expect(data.uvs[(i * 2 + 1) * 2 + 1]).toBe(1);
    }
  });

  it("indices reference only valid vertex ids", () => {
    const segments = 8;
    const data = buildSwingRibbonGeometryData(DEFAULT_SWING, segments);
    const maxVertex = (segments + 1) * 2 - 1;

    for (const index of data.indices) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThanOrEqual(maxVertex);
    }
  });

  it("rejects degenerate segment counts", () => {
    expect(() => buildSwingRibbonGeometryData(DEFAULT_SWING, 1)).toThrow();
  });
});

describe("swingRibbonProgress", () => {
  it("is 0 at t=0 and 1 at t=1", () => {
    expect(swingRibbonProgress(0)).toBeCloseTo(0, 6);
    expect(swingRibbonProgress(1)).toBeCloseTo(1, 6);
  });

  it("matches the arc position at the tip along the ribbon", () => {
    const samples = [0.1, 0.3, 0.5, 0.7, 0.9];

    for (const t of samples) {
      const progress = swingRibbonProgress(t);
      const expectedAngle =
        DEFAULT_SWING.startAngle +
        (DEFAULT_SWING.endAngle - DEFAULT_SWING.startAngle) * progress;

      expect(swingAngleAt(t)).toBeCloseTo(expectedAngle, 6);
    }
  });
});

describe("ribbon vertex at progress u matches tip at same angular offset", () => {
  it("ribbon vertex at UV.x=u is exactly where the blade tip is when swing yaw matches", () => {
    const segments = 32;
    const data = buildSwingRibbonGeometryData(DEFAULT_SWING, segments);

    for (let i = 1; i < segments; i += 4) {
      const u = i / segments;
      const outerX = data.positions[(i * 2 + 1) * 3];
      const outerZ = data.positions[(i * 2 + 1) * 3 + 2];
      // Find t such that swingAngleAt(t) == startAngle + u*arc
      // Then ribbon's world position at facing=0 should equal swingTipPosition at that t
      const angle =
        DEFAULT_SWING.startAngle +
        (DEFAULT_SWING.endAngle - DEFAULT_SWING.startAngle) * u;
      const expectedTip: Vec3 = [
        Math.sin(angle) * DEFAULT_SWING.reach,
        0,
        Math.cos(angle) * DEFAULT_SWING.reach,
      ];

      expect(outerX).toBeCloseTo(expectedTip[0], 6);
      expect(outerZ).toBeCloseTo(expectedTip[2], 6);
    }
  });
});

describe("determinism", () => {
  it("swingAngleAt is pure", () => {
    const samples = [0, 0.1, 0.33, 0.5, 0.77, 1];

    for (const t of samples) {
      expect(swingAngleAt(t)).toBe(swingAngleAt(t));
    }
  });

  it("sampleSwingPose is pure", () => {
    const facing = 0.7;
    const t = 0.4;
    const first = sampleSwingPose(t, CENTER, facing);
    const second = sampleSwingPose(t, CENTER, facing);

    expect(first).toEqual(second);
  });
});
