import { isPointInSwing, type SwingParams } from "$lib/combat/melee-swing";
import { clampToRoom, playerRadius } from "$lib/game/scene-layout";
import type {
  ActivePickup,
  MeleeFrame,
  PickupKind,
  RoomHazard,
  RoomPlatform,
  Vec3,
} from "$lib/types/game";

interface PickupConfig {
  radius: number;
}

interface PickupDrop {
  kind: PickupKind;
  value: number;
  weight: number;
}

interface PickupSpawnContext {
  hazards?: RoomHazard[];
  obstacles?: RoomPlatform[];
  pickups?: ActivePickup[];
}

interface PickupCollectContext {
  meleeFrame?: MeleeFrame;
  meleeParams?: SwingParams;
  obstacles?: RoomPlatform[];
  pickupRadiusBonus?: number;
}

export const pickupConfigs = {
  gear: { radius: 0.38 },
  heal: { radius: 0.46 },
  key: { radius: 0.52 },
} satisfies Record<PickupKind, PickupConfig>;

export const pickupCollectDurationMs = 360;
const gearMagnetPullRadiusMultiplier = 4.5;
const gearMagnetMinElapsedMs = 16;
const gearMagnetMaxElapsedMs = 50;
const gearMagnetBaseSpeed = 2.4;
const gearMagnetBonusSpeedScale = 4.2;

const roomDrops: PickupDrop[] = [
  { kind: "gear", value: 1, weight: 1 },
  { kind: "heal", value: 1, weight: 1 },
];

const overlapsObstacle = (
  position: Vec3,
  radius: number,
  obstacles: RoomPlatform[] = []
) =>
  obstacles.some(
    (obstacle) =>
      Math.abs(position[0] - obstacle.position[0]) <=
        obstacle.args[0] + radius &&
      Math.abs(position[2] - obstacle.position[2]) <= obstacle.args[2] + radius
  );

const pushPickupAway = (
  pickup: ActivePickup,
  playerPosition: Vec3,
  distance: number,
  obstacles?: RoomPlatform[]
): Vec3 => {
  const pushX =
    distance > 0 ? (pickup.position[0] - playerPosition[0]) / distance : 1;
  const pushZ =
    distance > 0 ? (pickup.position[2] - playerPosition[2]) / distance : 0;
  const nextPosition = clampToRoom(
    [
      pickup.position[0] + pushX * 0.18,
      pickup.position[1],
      pickup.position[2] + pushZ * 0.18,
    ],
    pickup.radius
  );

  return overlapsObstacle(nextPosition, pickup.radius, obstacles)
    ? pickup.position
    : nextPosition;
};

const getPickupDistance = (pickup: ActivePickup, playerPosition: Vec3) =>
  Math.hypot(
    pickup.position[0] - playerPosition[0],
    pickup.position[2] - playerPosition[2]
  );

const pullGearTowardPlayer = (
  pickup: ActivePickup,
  playerPosition: Vec3,
  distance: number,
  now: number,
  pickupRadiusBonus: number,
  obstacles?: RoomPlatform[]
): ActivePickup => {
  if (distance <= 0) {
    return { ...pickup, magnetizedAt: now };
  }

  const elapsedMs = Math.min(
    gearMagnetMaxElapsedMs,
    Math.max(
      gearMagnetMinElapsedMs,
      now - (pickup.magnetizedAt ?? now - gearMagnetMinElapsedMs)
    )
  );
  const pullStep = Math.min(
    distance,
    (gearMagnetBaseSpeed + pickupRadiusBonus * gearMagnetBonusSpeedScale) *
      (elapsedMs / 1000)
  );
  const pullX = (playerPosition[0] - pickup.position[0]) / distance;
  const pullZ = (playerPosition[2] - pickup.position[2]) / distance;
  const nextPosition = clampToRoom(
    [
      pickup.position[0] + pullX * pullStep,
      pickup.position[1],
      pickup.position[2] + pullZ * pullStep,
    ],
    pickup.radius
  );

  return {
    ...pickup,
    magnetizedAt: now,
    position: overlapsObstacle(nextPosition, pickup.radius, obstacles)
      ? pickup.position
      : nextPosition,
  };
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
  now: number,
  context: PickupSpawnContext = {}
): ActivePickup[] => {
  if (!(enemyTemplateId && enemyCount > 0)) {
    return [];
  }

  const totalWeight = roomDrops.reduce((sum, drop) => sum + drop.weight, 0);
  let roll = seededUnit(`${roomId}:pickup`) * totalWeight;
  const selected =
    roomDrops.find((drop) => {
      roll -= drop.weight;

      return roll < 0;
    }) ?? roomDrops[0];
  const config = pickupConfigs[selected.kind];
  let position: Vec3 | null = null;

  const candidateCount = 81;
  const startIndex = Math.floor(
    seededUnit(`${roomId}:pickup:start`) * candidateCount
  );

  for (let attempt = 0; attempt < candidateCount; attempt += 1) {
    const index = (startIndex + attempt) % candidateCount;
    const candidate = clampToRoom(
      [-7.6 + (index % 9) * 1.9, 0.54, -5.8 + Math.floor(index / 9) * 1.45],
      config.radius
    );
    const overlapsHazard = context.hazards?.some(
      (hazard) =>
        Math.abs(candidate[0] - hazard.position[0]) <=
          hazard.args[0] + config.radius &&
        Math.abs(candidate[2] - hazard.position[2]) <=
          hazard.args[2] + config.radius
    );
    const blockedByObstacle = overlapsObstacle(
      candidate,
      config.radius,
      context.obstacles
    );
    const overlapsPickup = context.pickups?.some(
      (pickup) =>
        Math.hypot(
          candidate[0] - pickup.position[0],
          candidate[2] - pickup.position[2]
        ) <=
        config.radius + pickup.radius + 0.25
    );

    if (!(overlapsHazard || blockedByObstacle || overlapsPickup)) {
      position = candidate;
      break;
    }
  }

  if (!position) {
    return [];
  }

  return [
    {
      createdAt: now,
      id: crypto.randomUUID(),
      kind: selected.kind,
      position,
      radius: config.radius,
      value: selected.value,
    },
  ];
};

export const collectPickups = (
  pickups: ActivePickup[],
  playerPosition: Vec3,
  health: number,
  maxHealth: number,
  now = performance.now(),
  context: PickupCollectContext = {}
) => {
  const remaining: ActivePickup[] = [];
  let gearDelta = 0;
  let keyDelta = 0;
  let nextHealth = health;
  const pickupRadiusBonus = Math.max(0, context.pickupRadiusBonus ?? 0);

  for (const pickup of pickups) {
    if (pickup.collectedAt !== undefined) {
      if (now - pickup.collectedAt < pickupCollectDurationMs) {
        remaining.push(pickup);
      }

      continue;
    }

    let activePickup = pickup;
    let distance = getPickupDistance(activePickup, playerPosition);
    const collectRadius =
      playerRadius + activePickup.radius + pickupRadiusBonus;
    const magnetPullRadius =
      playerRadius +
      activePickup.radius +
      pickupRadiusBonus * gearMagnetPullRadiusMultiplier;

    if (
      activePickup.kind === "gear" &&
      pickupRadiusBonus > 0 &&
      distance > collectRadius &&
      distance <= magnetPullRadius
    ) {
      activePickup = pullGearTowardPlayer(
        activePickup,
        playerPosition,
        distance,
        now,
        pickupRadiusBonus,
        context.obstacles
      );
      distance = getPickupDistance(activePickup, playerPosition);
    }

    const slashed =
      context.meleeFrame?.active === true &&
      context.meleeParams !== undefined &&
      isPointInSwing(
        activePickup.position,
        context.meleeFrame.t,
        context.meleeFrame.center,
        context.meleeFrame.facingYaw,
        {
          ...context.meleeParams,
          innerRadius: Math.max(
            0,
            context.meleeParams.innerRadius - activePickup.radius
          ),
          reach: context.meleeParams.reach + activePickup.radius,
          thickness: context.meleeParams.thickness + 0.12,
        }
      );

    if (distance > collectRadius && !slashed) {
      remaining.push(activePickup);
      continue;
    }

    if (activePickup.kind === "gear") {
      gearDelta += activePickup.value;
      remaining.push({
        ...activePickup,
        collectedAt: now,
        collectedTo: [playerPosition[0], playerPosition[1], playerPosition[2]],
      });
      continue;
    }

    if (activePickup.kind === "key") {
      keyDelta += activePickup.value;
      remaining.push({
        ...activePickup,
        collectedAt: now,
        collectedTo: [playerPosition[0], playerPosition[1], playerPosition[2]],
      });
      continue;
    }

    const heal = Math.min(activePickup.value, maxHealth - nextHealth);

    if (heal <= 0) {
      remaining.push({
        ...activePickup,
        position: pushPickupAway(
          activePickup,
          playerPosition,
          distance,
          context.obstacles
        ),
      });
      continue;
    }

    nextHealth += heal;
    remaining.push({
      ...activePickup,
      collectedAt: now,
      collectedTo: [playerPosition[0], playerPosition[1], playerPosition[2]],
    });
  }

  return {
    gearDelta,
    healthDelta: nextHealth - health,
    keyDelta,
    nextHealth,
    pickups: remaining,
  };
};
