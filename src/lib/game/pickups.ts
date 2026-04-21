import { clampToRoom, playerRadius } from "$lib/game/scene-layout";
import type { ActivePickup, PickupKind, Vec3 } from "$lib/types/game";

interface PickupConfig {
  radius: number;
}

interface PickupDrop {
  chance: number;
  kind: PickupKind;
  value: number;
}

export const pickupConfigs = {
  gear: { radius: 0.38 },
  heal: { radius: 0.46 },
} satisfies Record<PickupKind, PickupConfig>;

const roomDrops: Partial<Record<string, PickupDrop[]>> = {
  "bolt-runner": [{ chance: 0.34, kind: "gear", value: 1 }],
  "coil-sentry": [
    { chance: 0.6, kind: "gear", value: 1 },
    { chance: 0.12, kind: "heal", value: 1 },
  ],
  "ember-artillery": [{ chance: 0.48, kind: "gear", value: 1 }],
  "iron-warden": [
    { chance: 1, kind: "gear", value: 8 },
    { chance: 0.55, kind: "heal", value: 2 },
  ],
  "mine-herald": [
    { chance: 1, kind: "gear", value: 14 },
    { chance: 0.75, kind: "heal", value: 2 },
  ],
  "rail-hunter": [
    { chance: 0.78, kind: "gear", value: 2 },
    { chance: 0.16, kind: "heal", value: 1 },
  ],
  "slag-brute": [
    { chance: 0.72, kind: "gear", value: 2 },
    { chance: 0.24, kind: "heal", value: 1 },
  ],
};

export const seededUnit = (seed: string) => {
  const modulo = 1_000_000_007;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % modulo;
  }

  return hash / modulo;
};

export const createRoomPickups = (
  roomId: string,
  enemyTemplateId: string | undefined,
  enemyCount: number,
  now: number
): ActivePickup[] => {
  const table = enemyTemplateId ? (roomDrops[enemyTemplateId] ?? []) : [];
  const rolledDrops = table.filter((drop, index) => {
    const chance = 1 - (1 - drop.chance) ** Math.max(1, enemyCount);

    return seededUnit(`${roomId}:${drop.kind}:${index}`) <= chance;
  });
  const selected =
    rolledDrops[
      Math.floor(seededUnit(`${roomId}:pickup`) * rolledDrops.length)
    ];

  if (!selected) {
    if (enemyCount <= 0) {
      return [];
    }

    return [
      {
        createdAt: now,
        id: crypto.randomUUID(),
        kind: "gear",
        position: [0, 0.54, 0],
        radius: pickupConfigs.gear.radius,
        value: 1,
      },
    ];
  }

  const config = pickupConfigs[selected.kind];
  const yaw = seededUnit(`${roomId}:${selected.kind}:yaw`) * Math.PI * 2;
  const position = clampToRoom(
    [Math.sin(yaw) * 0.55, 0.54, Math.cos(yaw) * 0.55],
    config.radius
  );
  const value =
    selected.kind === "gear"
      ? Math.max(1, Math.round(selected.value * enemyCount * selected.chance))
      : selected.value;

  return [
    {
      createdAt: now,
      id: crypto.randomUUID(),
      kind: selected.kind,
      position,
      radius: config.radius,
      value,
    },
  ];
};

export const collectPickups = (
  pickups: ActivePickup[],
  playerPosition: Vec3,
  health: number,
  maxHealth: number
) => {
  const remaining: ActivePickup[] = [];
  let gearDelta = 0;
  let nextHealth = health;

  for (const pickup of pickups) {
    const distance = Math.hypot(
      pickup.position[0] - playerPosition[0],
      pickup.position[2] - playerPosition[2]
    );

    if (distance > playerRadius + pickup.radius) {
      remaining.push(pickup);
      continue;
    }

    if (pickup.kind === "gear") {
      gearDelta += pickup.value;
      continue;
    }

    const heal = Math.min(pickup.value, maxHealth - nextHealth);

    if (heal <= 0) {
      remaining.push(pickup);
      continue;
    }

    nextHealth += heal;
  }

  return {
    gearDelta,
    healthDelta: nextHealth - health,
    nextHealth,
    pickups: remaining,
  };
};
