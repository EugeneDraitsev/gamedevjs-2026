import ammoHopperIconUrl from "$lib/assets/machine-modules/ammo-hopper.png";
import arcSplitterCoilIconUrl from "$lib/assets/machine-modules/arc-splitter-coil.png";
import boilerPlateFrameIconUrl from "$lib/assets/machine-modules/boiler-plate-frame.png";
import cleaverAxeHeadIconUrl from "$lib/assets/machine-modules/cleaver-axe-head.svg";
import gyroServoFrameIconUrl from "$lib/assets/machine-modules/gyro-servo-frame.png";
import overclockGovernorIconUrl from "$lib/assets/machine-modules/overclock-governor.png";
import parryReflectorIconUrl from "$lib/assets/machine-modules/parry-reflector.svg";
import pressureLanceNozzleIconUrl from "$lib/assets/machine-modules/pressure-lance-nozzle.png";
import rivetPressCoreIconUrl from "$lib/assets/machine-modules/rivet-press-core.png";
import salvageMagnetIconUrl from "$lib/assets/machine-modules/salvage-magnet.png";
import type { MachineModuleId } from "$lib/config/machine-modules";

export const machineModuleIconUrls: Record<MachineModuleId, string> = {
  "ammo-hopper": ammoHopperIconUrl,
  "arc-splitter-coil": arcSplitterCoilIconUrl,
  "boiler-plate-frame": boilerPlateFrameIconUrl,
  "cleaver-axe-head": cleaverAxeHeadIconUrl,
  "gyro-servo-frame": gyroServoFrameIconUrl,
  "overclock-governor": overclockGovernorIconUrl,
  "parry-reflector": parryReflectorIconUrl,
  "pressure-lance-nozzle": pressureLanceNozzleIconUrl,
  "rivet-press-core": rivetPressCoreIconUrl,
  "salvage-magnet": salvageMagnetIconUrl,
};

export const getMachineModuleIconUrl = (id: MachineModuleId) =>
  machineModuleIconUrls[id];
