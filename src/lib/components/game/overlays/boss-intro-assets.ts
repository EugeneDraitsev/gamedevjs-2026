import ironWardenPlaqueUrl from "$lib/assets/generated/boss-intro/iron-warden.png";
import mineHeraldPlaqueUrl from "$lib/assets/generated/boss-intro/mine-herald.png";

export interface BossIntroPlaque {
  enemyId: string;
  image: string;
}

export const bossIntroPlaques: BossIntroPlaque[] = [
  {
    enemyId: "iron-warden",
    image: ironWardenPlaqueUrl,
  },
  {
    enemyId: "mine-herald",
    image: mineHeraldPlaqueUrl,
  },
];

export const bossIntroPlaqueByEnemyId = Object.fromEntries(
  bossIntroPlaques.map((plaque) => [plaque.enemyId, plaque.image])
) as Record<string, string>;

export const fallbackBossIntroPlaqueUrl = ironWardenPlaqueUrl;

const preloadedBossIntroImages: HTMLImageElement[] = [];
let preloadBossIntroImagesPromise: Promise<void> | null = null;

const addBossIntroImageHint = (plaque: BossIntroPlaque) => {
  if (typeof document === "undefined") {
    return;
  }

  const existing = document.head.querySelector(
    `link[data-boss-intro-image="${plaque.enemyId}"]`
  );

  if (existing) {
    return;
  }

  const link = document.createElement("link");

  link.as = "image";
  link.dataset.bossIntroImage = plaque.enemyId;
  link.href = plaque.image;
  link.rel = "prefetch";
  document.head.append(link);
};

const loadAndDecodeBossIntroImage = (plaque: BossIntroPlaque) =>
  new Promise<void>((resolve) => {
    const image = new Image();

    image.decoding = "async";
    image.loading = "eager";
    image.onload = () => {
      const decode = image.decode?.();

      if (decode) {
        decode.catch(() => undefined).finally(resolve);
        return;
      }

      resolve();
    };
    image.onerror = () => resolve();
    image.src = plaque.image;
    preloadedBossIntroImages.push(image);
  });

export const preloadBossIntroImages = () => {
  if (preloadBossIntroImagesPromise || typeof Image === "undefined") {
    return preloadBossIntroImagesPromise ?? Promise.resolve();
  }

  for (const plaque of bossIntroPlaques) {
    addBossIntroImageHint(plaque);
  }

  preloadBossIntroImagesPromise = Promise.all(
    bossIntroPlaques.map(loadAndDecodeBossIntroImage)
  ).then(() => undefined);

  return preloadBossIntroImagesPromise;
};

export const scheduleBossIntroImagePreload = () => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(
      () => {
        preloadBossIntroImages().catch(() => undefined);
      },
      { timeout: 1600 }
    );

    return () => window.cancelIdleCallback(id);
  }

  const id = setTimeout(() => {
    preloadBossIntroImages().catch(() => undefined);
  }, 450);

  return () => clearTimeout(id);
};
