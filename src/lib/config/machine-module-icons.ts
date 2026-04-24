import ammoHopperIconUrl from "$lib/assets/machine-modules/ammo-hopper.png";
import arcSplitterCoilIconUrl from "$lib/assets/machine-modules/arc-splitter-coil.png";
import boilerPlateFrameIconUrl from "$lib/assets/machine-modules/boiler-plate-frame.png";
import gyroServoFrameIconUrl from "$lib/assets/machine-modules/gyro-servo-frame.png";
import overclockGovernorIconUrl from "$lib/assets/machine-modules/overclock-governor.png";
import pressureLanceNozzleIconUrl from "$lib/assets/machine-modules/pressure-lance-nozzle.png";
import rivetPressCoreIconUrl from "$lib/assets/machine-modules/rivet-press-core.png";
import salvageMagnetIconUrl from "$lib/assets/machine-modules/salvage-magnet.png";
import type { MachineModuleId } from "$lib/config/machine-modules";

export const machineModuleIconUrls: Record<MachineModuleId, string> = {
  "ammo-hopper": ammoHopperIconUrl,
  "arc-splitter-coil": arcSplitterCoilIconUrl,
  "boiler-plate-frame": boilerPlateFrameIconUrl,
  "gyro-servo-frame": gyroServoFrameIconUrl,
  "overclock-governor": overclockGovernorIconUrl,
  "pressure-lance-nozzle": pressureLanceNozzleIconUrl,
  "rivet-press-core": rivetPressCoreIconUrl,
  "salvage-magnet": salvageMagnetIconUrl,
};

export const getMachineModuleIconUrl = (id: MachineModuleId) =>
  machineModuleIconUrls[id];
