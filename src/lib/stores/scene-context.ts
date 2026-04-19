import { getContext, setContext } from "svelte";
import type { GameSceneStore } from "$lib/stores/game-scene.svelte";

const KEY = Symbol("game-scene-context");

export const setGameSceneContext = (context: GameSceneStore) => {
  setContext(KEY, context);
  return context;
};

export const getGameSceneContext = () => getContext<GameSceneStore>(KEY);
