import { DEFAULT_SWING, type SwingParams } from "$lib/combat/melee-swing";
import type { DungeonLayout } from "$lib/config/dungeon-layout";
import { roomTemplateById } from "$lib/config/room-templates";
import type { SceneSettings } from "$lib/config/scene-settings";
import {
  computeWeaponBuild,
  createDefaultWeaponGraph,
} from "$lib/config/weapon-graph";
import type { MeleeTrailSettings } from "$lib/types/game";

export const playgroundRoomId = "playground-room";

export const buildPlaygroundDungeon = (
  templateId: string,
  seed = "playground"
): DungeonLayout => {
  if (!roomTemplateById[templateId]) {
    throw new Error(`Unknown room template: ${templateId}`);
  }

  return {
    floor: 1,
    initialModules: [],
    rooms: {
      [playgroundRoomId]: {
        exits: {},
        grid: [0, 0],
        id: playgroundRoomId,
        kind: roomTemplateById[templateId].kind,
        label: roomTemplateById[templateId].label,
        templateId,
      },
    },
    seed,
    startRoomId: playgroundRoomId,
  };
};

const defaultGraph = createDefaultWeaponGraph();
export const playgroundWeaponBuild = computeWeaponBuild(
  defaultGraph.nodes,
  defaultGraph.edges
);

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
];
