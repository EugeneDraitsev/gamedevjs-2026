export interface WarmupView {
  position: [number, number, number];
  target: [number, number, number];
}

export interface WarmupPointOfInterest {
  x: number;
  y: number;
  z: number;
}

export interface WarmupStabilityOptions {
  maxPasses: number;
  minPasses: number;
  stableFrameMs: number;
  stablePasses: number;
  viewCount: number;
}

export interface WarmupFrameSample {
  duration: number;
  newPrograms: number;
  viewIndex: number;
}

export interface WarmupStabilityDecision {
  cleanViewCount: number;
  done: boolean;
  maxReached: boolean;
  pass: number;
  stablePasses: number;
}

const clampInt = (value: number, min: number) =>
  Math.max(min, Math.floor(value));

export const createPointOfInterestWarmupView = ({
  x,
  y,
  z,
}: WarmupPointOfInterest): WarmupView => ({
  position: [x, y + 34, z + 30],
  target: [x, y, z],
});

export const buildOutsideWarmupViews = (
  baseViews: WarmupView[],
  pointsOfInterest: WarmupPointOfInterest[]
): WarmupView[] => [
  ...baseViews,
  ...pointsOfInterest.map(createPointOfInterestWarmupView),
];

export const createWarmupStabilityTracker = (
  options: WarmupStabilityOptions
) => {
  const maxPasses = clampInt(options.maxPasses, 1);
  const minPasses = Math.min(maxPasses, clampInt(options.minPasses, 1));
  const requiredStablePasses = clampInt(options.stablePasses, 1);
  const viewCount = clampInt(options.viewCount, 1);
  const cleanViewsSinceLastProgram = new Set<number>();
  let pass = 0;
  let stablePasses = 0;

  const record = (sample: WarmupFrameSample): WarmupStabilityDecision => {
    pass += 1;

    if (sample.newPrograms > 0) {
      stablePasses = 0;
      cleanViewsSinceLastProgram.clear();
    } else {
      cleanViewsSinceLastProgram.add(
        Math.max(0, Math.floor(sample.viewIndex)) % viewCount
      );
      stablePasses =
        sample.duration <= options.stableFrameMs ? stablePasses + 1 : 0;
    }

    const maxReached = pass >= maxPasses;
    const stableEnough =
      pass >= minPasses &&
      stablePasses >= requiredStablePasses &&
      cleanViewsSinceLastProgram.size >= viewCount;

    return {
      cleanViewCount: cleanViewsSinceLastProgram.size,
      done: maxReached || stableEnough,
      maxReached,
      pass,
      stablePasses,
    };
  };

  return {
    record,
    get pass() {
      return pass;
    },
  };
};
