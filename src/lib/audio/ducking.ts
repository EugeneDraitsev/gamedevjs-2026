import { gameMusic } from "$lib/audio/music";
import { gameSfx } from "$lib/audio/sfx";

const activeReasons = new Set<string>();

export const setGameAudioDucked = (reason: string, ducked: boolean) => {
  if (ducked) {
    activeReasons.add(reason);
  } else {
    activeReasons.delete(reason);
  }

  const shouldDuck = activeReasons.size > 0;

  gameMusic.setDucked(shouldDuck);
  gameSfx.setDucked(shouldDuck);
};

export const createAudioDuckReason = (prefix: string) =>
  `${prefix}:${Math.random().toString(36).slice(2)}`;
