import {
  getMachineModule,
  type MachineModuleId,
  machineRewardModuleIds,
} from "$lib/config/machine-modules";
import type { Vec3 } from "$lib/types/game";

export type ShopOfferKind = "heal-big" | "heal-small" | "module";

export interface ShopOffer {
  id: string;
  kind: ShopOfferKind;
  moduleId?: MachineModuleId;
  position: Vec3;
  price: number;
  value: number;
}

export const shopSmallHealValue = 1;
export const shopBigHealValue = 3;
export const shopSmallHealPrice = 3;
export const shopBigHealPrice = 7;
export const shopModulePriceBase = 5;

const shopSlotPositions: Vec3[] = [
  [-5.4, 0.6, -2.4],
  [-1.8, 0.6, -2.4],
  [1.8, 0.6, -2.4],
  [5.4, 0.6, -2.4],
];

const createSeededRandom = (seed: string) => {
  let state =
    seed.split("").reduce((total, char, index) => {
      return total + char.charCodeAt(0) * (index + 1);
    }, 1) || 1;

  return () => {
    const value = Math.sin(state) * 10_000;
    state += 1;
    return value - Math.floor(value);
  };
};

const sampleUnique = <T>(
  items: readonly T[],
  count: number,
  random: () => number
) => {
  const pool = [...items];
  const picked: T[] = [];

  while (picked.length < count && pool.length > 0) {
    picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }

  return picked;
};

const getModulePrice = (moduleId: MachineModuleId) =>
  shopModulePriceBase + getMachineModule(moduleId).scrapValue;

export const createShopOffers = (
  seed: string,
  roomId: string,
  excludeModuleIds: readonly MachineModuleId[] = []
): ShopOffer[] => {
  const random = createSeededRandom(`${seed}:${roomId}:shop`);
  const pool = machineRewardModuleIds.filter(
    (id) => !excludeModuleIds.includes(id)
  );
  const fallback = pool.length >= 2 ? pool : machineRewardModuleIds;
  const modules = sampleUnique(fallback, 2, random);

  return [
    {
      id: `${roomId}:slot-0`,
      kind: "module",
      moduleId: modules[0],
      position: shopSlotPositions[0],
      price: getModulePrice(modules[0]),
      value: 0,
    },
    {
      id: `${roomId}:slot-1`,
      kind: "module",
      moduleId: modules[1],
      position: shopSlotPositions[1],
      price: getModulePrice(modules[1]),
      value: 0,
    },
    {
      id: `${roomId}:slot-2`,
      kind: "heal-small",
      position: shopSlotPositions[2],
      price: shopSmallHealPrice,
      value: shopSmallHealValue,
    },
    {
      id: `${roomId}:slot-3`,
      kind: "heal-big",
      position: shopSlotPositions[3],
      price: shopBigHealPrice,
      value: shopBigHealValue,
    },
  ];
};
