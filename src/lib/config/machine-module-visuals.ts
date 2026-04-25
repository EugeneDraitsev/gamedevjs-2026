import {
  createDefaultMachineLoadout,
  type MachineLoadout,
  type MachineModuleId,
} from "$lib/config/machine-modules";

export interface MachineBodyVisual {
  armor: "brass" | "plate";
  color: string;
  emissive: string;
  emissiveIntensity: number;
  glow: string;
  glowOpacity: number;
  seam: string;
  seamDark: string;
}

export interface MachineEyeVisual {
  glow: string;
  lens: string;
  mode: "rivet" | "splitter" | "lance";
  socket: string;
  xScale: number;
  yScale: number;
}

export interface MachineUtilityVisual {
  ammoHopper: boolean;
  axe: boolean;
  magnet: boolean;
  overclock: boolean;
  reflector: boolean;
}

export interface MachineVisualState {
  body: MachineBodyVisual;
  eye: MachineEyeVisual;
  utilities: MachineUtilityVisual;
}

export const defaultMachineBodyVisual: MachineBodyVisual = {
  armor: "brass",
  color: "#8f6424",
  emissive: "#120900",
  emissiveIntensity: 0.25,
  glow: "#ffc267",
  glowOpacity: 0.18,
  seam: "#d39a38",
  seamDark: "#3a2412",
};

export const machineBodyVisuals: Partial<
  Record<MachineModuleId, MachineBodyVisual>
> = {
  "boiler-plate-frame": {
    armor: "plate",
    color: "#8d98a3",
    emissive: "#101820",
    emissiveIntensity: 0.18,
    glow: "#dce7f0",
    glowOpacity: 0.12,
    seam: "#dce7f0",
    seamDark: "#28323d",
  },
  "gyro-servo-frame": {
    armor: "brass",
    color: "#a76e2d",
    emissive: "#071d0d",
    emissiveIntensity: 0.28,
    glow: "#5ef0a0",
    glowOpacity: 0.16,
    seam: "#f0c36a",
    seamDark: "#2c1a08",
  },
} satisfies Partial<Record<MachineModuleId, MachineBodyVisual>>;

export const defaultMachineEyeVisual: MachineEyeVisual = {
  glow: "#7befff",
  lens: "#8ff7ff",
  mode: "rivet",
  socket: "#15120f",
  xScale: 1,
  yScale: 1,
};

export const machineEyeVisuals: Partial<
  Record<MachineModuleId, MachineEyeVisual>
> = {
  "arc-splitter-coil": {
    glow: "#7dd3fc",
    lens: "#60a5fa",
    mode: "splitter",
    socket: "#102134",
    xScale: 1.08,
    yScale: 0.92,
  },
  "pressure-lance-nozzle": {
    glow: "#ff5f78",
    lens: "#ff7a90",
    mode: "lance",
    socket: "#341018",
    xScale: 0.78,
    yScale: 1.28,
  },
  "rivet-press-core": {
    glow: "#7befff",
    lens: "#8ff7ff",
    mode: "rivet",
    socket: "#15120f",
    xScale: 1,
    yScale: 1,
  },
} satisfies Partial<Record<MachineModuleId, MachineEyeVisual>>;

const emptyUtilities = (): MachineUtilityVisual => ({
  ammoHopper: false,
  axe: false,
  magnet: false,
  overclock: false,
  reflector: false,
});

export const getMachineVisualState = (
  loadout: MachineLoadout = createDefaultMachineLoadout()
): MachineVisualState => {
  const utilities = emptyUtilities();

  for (const moduleId of Object.values(loadout)) {
    switch (moduleId) {
      case "ammo-hopper":
        utilities.ammoHopper = true;
        break;
      case "overclock-governor":
        utilities.overclock = true;
        break;
      case "salvage-magnet":
        utilities.magnet = true;
        break;
      case "parry-reflector":
        utilities.reflector = true;
        break;
      case "cleaver-axe-head":
        utilities.axe = true;
        break;
      default:
        break;
    }
  }

  return {
    body:
      (loadout.body ? machineBodyVisuals[loadout.body] : null) ??
      defaultMachineBodyVisual,
    eye:
      (loadout.attack ? machineEyeVisuals[loadout.attack] : null) ??
      defaultMachineEyeVisual,
    utilities,
  };
};
