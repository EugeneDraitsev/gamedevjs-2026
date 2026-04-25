import { DEFAULT_SWING, type SwingParams } from "$lib/combat/melee-swing";
import type { DungeonLayout } from "$lib/config/dungeon-layout";
import {
  computeMachineStats,
  createDefaultMachineLoadout,
} from "$lib/config/machine-modules";
import { roomTemplateById } from "$lib/config/room-templates";
import type { SceneSettings } from "$lib/config/scene-settings";
import type { MeleeTrailSettings } from "$lib/types/game";

export const playgroundRoomId = "playground-room";

export const buildPlaygroundDungeon = (
  templateId: string,
  seed = "playground",
  previewExits = false
): DungeonLayout => {
  const template = roomTemplateById[templateId];

  if (!template) {
    throw new Error(`Unknown room template: ${templateId}`);
  }

  const dungeon: DungeonLayout = {
    floor: 1,
    initialModules: [],
    rooms: {
      [playgroundRoomId]: {
        exits: previewExits
          ? {
              east: "preview-treasure",
              north: "preview-boss",
              south: "preview-normal",
              west: "preview-shop",
            }
          : {},
        grid: [0, 0],
        id: playgroundRoomId,
        kind: template.kind,
        label: template.label,
        templateId,
        ...(template.kind === "treasure"
          ? { artifactType: "ammo-hopper" }
          : {}),
      },
    },
    seed,
    startRoomId: playgroundRoomId,
  };

  if (previewExits) {
    dungeon.rooms["preview-boss"] = {
      exits: { south: playgroundRoomId },
      grid: [0, -1],
      id: "preview-boss",
      kind: "boss",
      label: "Foundry",
      templateId: "boss-warden",
    };
    dungeon.rooms["preview-normal"] = {
      exits: { north: playgroundRoomId },
      grid: [0, 1],
      id: "preview-normal",
      kind: "normal",
      label: "Chamber",
      templateId: "normal-line",
    };
    dungeon.rooms["preview-shop"] = {
      exits: { east: playgroundRoomId },
      grid: [-1, 0],
      id: "preview-shop",
      kind: "shop",
      label: "Shop",
      templateId: "shop-empty",
    };
    dungeon.rooms["preview-treasure"] = {
      exits: { west: playgroundRoomId },
      grid: [1, 0],
      id: "preview-treasure",
      kind: "treasure",
      label: "Treasure",
      templateId: "treasure-artifact",
      artifactType: "ammo-hopper",
    };
  }

  return dungeon;
};

export const playgroundMachineStats = computeMachineStats(
  createDefaultMachineLoadout()
);
export const playgroundWeaponBuild = playgroundMachineStats.weaponBuild;

export const noop = () => {
  // Intentional no-op handler used by playground stories.
};

export const buildPlaygroundMeleeParams = (
  settings: SceneSettings
): SwingParams => ({
  ...DEFAULT_SWING,
  durationMs: settings.meleeDurationMs,
  endAngle: settings.meleeArcSpan / 2,
  reach: settings.meleeReach,
  startAngle: -settings.meleeArcSpan / 2,
});

export const buildPlaygroundTrailSettings = (
  settings: SceneSettings
): MeleeTrailSettings => ({
  bandAlphas: [
    settings.meleeBand1Alpha,
    settings.meleeBand2Alpha,
    settings.meleeBand3Alpha,
  ],
  bandCenters: [
    settings.meleeBand1Center,
    settings.meleeBand2Center,
    settings.meleeBand3Center,
  ],
  bandWidths: [
    settings.meleeBand1Width,
    settings.meleeBand2Width,
    settings.meleeBand3Width,
  ],
  coreColor: settings.meleeCoreColor,
  edgeColor: settings.meleeEdgeColor,
  tailLength: settings.meleeTailLength,
});

export interface CombatPreset {
  description: string;
  enemyCount: number;
  enemyTemplateId: string;
  id: string;
  label: string;
  templateId: string;
}

export const combatPresets: CombatPreset[] = [
  {
    description: "Line of scrap runners with melee rush AI.",
    enemyCount: 4,
    enemyTemplateId: "scrap-runner",
    id: "scrap-runner",
    label: "Scrap Runner — Line",
    templateId: "normal-line",
  },
  {
    description: "Quick bolts in pincer formation.",
    enemyCount: 5,
    enemyTemplateId: "bolt-runner",
    id: "bolt-runner",
    label: "Bolt Runner — Pincer",
    templateId: "normal-pincer",
  },
  {
    description: "Crossfire of coil sentries.",
    enemyCount: 4,
    enemyTemplateId: "coil-sentry",
    id: "coil-sentry",
    label: "Coil Sentry — Crossfire",
    templateId: "normal-crossfire",
  },
  {
    description: "Arc of ember artillery.",
    enemyCount: 3,
    enemyTemplateId: "ember-artillery",
    id: "ember-artillery",
    label: "Ember Artillery — Arc",
    templateId: "normal-arc",
  },
  {
    description: "Slag brutes in foundry.",
    enemyCount: 5,
    enemyTemplateId: "slag-brute",
    id: "slag-brute",
    label: "Slag Brute — Foundry",
    templateId: "normal-furnace",
  },
  {
    description: "Rail hunters across a relay.",
    enemyCount: 4,
    enemyTemplateId: "rail-hunter",
    id: "rail-hunter",
    label: "Rail Hunter — Relay",
    templateId: "normal-relay",
  },
  {
    description: "Boss fight: Iron Warden.",
    enemyCount: 1,
    enemyTemplateId: "iron-warden",
    id: "iron-warden",
    label: "Boss — Iron Warden",
    templateId: "boss-warden",
  },
  {
    description:
      "Boss fight: Mine Herald kites and scatters arming bombs — slash unarmed ones.",
    enemyCount: 1,
    enemyTemplateId: "mine-herald",
    id: "mine-herald",
    label: "Boss — Mine Herald",
    templateId: "boss-bomber",
  },
  {
    description: "Boss fight: Gate Keeper triple shots and jumpable arc laser.",
    enemyCount: 1,
    enemyTemplateId: "gate-keeper",
    id: "gate-keeper",
    label: "Boss - Gate Keeper",
    templateId: "boss-gate-keeper",
  },
];
