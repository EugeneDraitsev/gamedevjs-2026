import { DefaultLoadingManager } from "three";

/**
 * What a story reports to a page that embeds it. "engine" until the story
 * has a canvas, "assets" while textures download, "shaders" while the game's
 * loading overlay warms the renderer up, then "ready" once, on a clean frame.
 */
type LiveSceneStage = "engine" | "assets" | "shaders" | "ready";

interface LiveSceneMessage {
  loaded?: number;
  stage: LiveSceneStage;
  total?: number;
  type: "live-scene";
}

const POLL_MS = 150;
const SETTLED_POLLS = 2;
// Half a blog column: a story's panel would cover most of the scene.
const NARROW_PX = 720;
// Tweakpane animates a fold; the page waits for it before revealing.
const FOLD_MS = 300;

const framedByAnotherSite = () => {
  if (window.parent === window) {
    return false;
  }

  try {
    // Storybook's manager frames its stories from the same origin.
    return !window.parent.location.href;
  } catch {
    return true;
  }
};

/**
 * The dev blog embeds these fixtures in iframes. Without this, the embedding
 * page only knows when the document loaded, so it showed its own spinner for
 * a moment and then the game's "Loading" for several silent seconds. This
 * reports the real stages so the page can show one loader with progress.
 * Standalone Storybook and the manager's own preview frame are left alone.
 */
export const startEmbedBridge = () => {
  if (typeof window === "undefined" || !framedByAnotherSite()) {
    return;
  }

  // The Debug Controls pane (camera, physics, lighting) and its FPS meter are
  // for working on the game; an embed keeps only each story's own panel.
  const style = document.createElement("style");
  style.textContent = ".debug-anchor { display: none !important; }";
  document.head.append(style);

  let loaded = 0;
  let total = 0;
  let reported = "";
  let settled = 0;

  const post = (
    stage: LiveSceneStage,
    progress?: { loaded: number; total: number }
  ) => {
    const key = `${stage}:${progress?.loaded ?? ""}/${progress?.total ?? ""}`;

    if (key === reported) {
      return;
    }

    reported = key;
    const message: LiveSceneMessage = {
      stage,
      type: "live-scene",
      ...progress,
    };
    window.parent.postMessage(message, "*");
  };

  // Count items on the manager's own methods: @threlte/extras replaces the
  // onStart/onProgress callbacks when it is imported, so those go quiet.
  const { itemEnd, itemStart } = DefaultLoadingManager;

  DefaultLoadingManager.itemStart = (url) => {
    total += 1;
    itemStart.call(DefaultLoadingManager, url);
  };
  // Three's loaders call itemEnd after itemError too, so failures count here.
  DefaultLoadingManager.itemEnd = (url) => {
    loaded += 1;
    itemEnd.call(DefaultLoadingManager, url);
  };

  const timer = window.setInterval(() => {
    const canvas = document.querySelector("canvas");
    const warming = document.querySelector(".scene-loading-overlay");

    if (total > loaded) {
      settled = 0;
      post("assets", { loaded, total });
    } else if (!canvas) {
      settled = 0;
      post("engine");
    } else if (warming) {
      settled = 0;
      post("shaders", { loaded, total });
    } else {
      settled += 1;

      if (settled < SETTLED_POLLS) {
        return;
      }

      window.clearInterval(timer);

      // A narrow embed starts with each story panel folded to its title bar,
      // which still opens it.
      const titles =
        window.innerWidth < NARROW_PX
          ? document.querySelectorAll<HTMLButtonElement>(
              ".tp-rotv-expanded > .tp-rotv_b"
            )
          : [];

      for (const title of titles) {
        title.click();
      }

      // Two frames: the first clean one is drawn before the page reveals it.
      window.setTimeout(
        () => requestAnimationFrame(() => requestAnimationFrame(() => post("ready"))),
        titles.length ? FOLD_MS : 0
      );
    }
  }, POLL_MS);
};
