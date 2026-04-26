import type { Object3D, Scene, WebGLRenderer } from "three";
import { cachedGeometryStats } from "$lib/game/cached-geometries";

interface RendererSnapshot {
  calls: number;
  geometries: number;
  heapMB: number | null;
  programs: number;
  sceneNodes: number;
  textures: number;
  triangles: number;
}

interface PendingTransition {
  before: RendererSnapshot | null;
  fromKind: string;
  fromRoomId: string;
  fromTpl: string;
  toKind: string;
  toRoomId: string;
  toTpl: string;
}

interface FrameSample {
  delta: number;
  index: number;
  loafBlocking: number | null;
  loafDuration: number | null;
  loafScripts: string[] | null;
}

interface TransitionRecord {
  applyMs: number;
  deltas: {
    calls: number;
    geo: number;
    heapMB: number | null;
    nodes: number;
    progs: number;
    tex: number;
    tri: number;
  } | null;
  frames: FrameSample[];
  fromKind: string;
  fromRoomId: string;
  fromTpl: string;
  seq: number;
  toKind: string;
  toRoomId: string;
  toTpl: string;
  totalMs: number;
  triggerToApplyMs: number;
}

const FRAME_TRACE_COUNT = 5;
const SLOW_FRAME_MS = 25;
const LONG_TASK_MS = 50;
const SPIKE_TOTAL_MS = 30;
const RING_SIZE = 50;

let enabled = false;
let renderer: WebGLRenderer | null = null;
let scene: Scene | null = null;
let longTaskObserver: PerformanceObserver | null = null;
let loafObserver: PerformanceObserver | null = null;
let pending: PendingTransition | null = null;
let frameWatcher = 0;
let lastFrameAt = 0;
let transitionSeq = 0;
let firstSpikeProgramsLogged = false;

const ringBuffer: TransitionRecord[] = [];
const recentLoaf: PerformanceEntry[] = [];

const heapMB = (): number | null => {
  const mem = (
    performance as unknown as { memory?: { usedJSHeapSize?: number } }
  ).memory;

  if (!mem?.usedJSHeapSize) {
    return null;
  }

  return mem.usedJSHeapSize / (1024 * 1024);
};

const countSceneNodes = (s: Scene | null): number => {
  if (!s) {
    return 0;
  }

  let n = 0;

  s.traverse((_obj: Object3D) => {
    n += 1;
  });

  return n;
};

const snapshot = (r: WebGLRenderer): RendererSnapshot => ({
  calls: r.info.render.calls,
  geometries: r.info.memory.geometries,
  heapMB: heapMB(),
  programs: r.info.programs?.length ?? 0,
  sceneNodes: countSceneNodes(scene),
  textures: r.info.memory.textures,
  triangles: r.info.render.triangles,
});

const clearMarks = (names: string[]) => {
  for (const name of names) {
    try {
      performance.clearMarks(name);
    } catch {
      // noop
    }
  }
};

const clearMeasures = (names: string[]) => {
  for (const name of names) {
    try {
      performance.clearMeasures(name);
    } catch {
      // noop
    }
  }
};

const watchFrames = () => {
  const now = performance.now();

  if (lastFrameAt > 0) {
    const dt = now - lastFrameAt;

    if (dt > SLOW_FRAME_MS) {
      console.warn(
        `%c[slowframe] ${dt.toFixed(1)}ms @ ${now.toFixed(0)}ms`,
        "color:#fbbf24"
      );
    }
  }

  lastFrameAt = now;
  frameWatcher = requestAnimationFrame(watchFrames);
};

const startLongTaskObserver = () => {
  if (typeof PerformanceObserver === "undefined") {
    return;
  }

  try {
    longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration < LONG_TASK_MS) {
          continue;
        }

        console.warn(
          `%c[longtask] ${entry.duration.toFixed(1)}ms @ ${entry.startTime.toFixed(0)}ms`,
          "color:#f97316;font-weight:bold"
        );
      }
    });
    longTaskObserver.observe({ entryTypes: ["longtask"] });
  } catch {
    // longtask not supported in this browser
  }
};

interface LoafEntry extends PerformanceEntry {
  blockingDuration: number;
  renderStart: number;
  scripts?: { duration: number; invoker?: string; name?: string }[];
  styleAndLayoutStart: number;
}

const startLoafObserver = () => {
  if (typeof PerformanceObserver === "undefined") {
    return;
  }

  try {
    loafObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        recentLoaf.push(entry);

        while (recentLoaf.length > 60) {
          recentLoaf.shift();
        }

        if (entry.duration < SLOW_FRAME_MS) {
          continue;
        }

        const loaf = entry as LoafEntry;
        const scripts =
          loaf.scripts
            ?.filter((s) => s.duration > 4)
            .map(
              (s) =>
                `${s.invoker || s.name || "anon"}(${s.duration.toFixed(0)}ms)`
            )
            .join(" ") || "";
        const blocking = loaf.blockingDuration?.toFixed(0) ?? "?";
        const styleStart = loaf.styleAndLayoutStart
          ? (loaf.styleAndLayoutStart - entry.startTime).toFixed(0)
          : "?";

        console.warn(
          `%c[loaf] ${entry.duration.toFixed(1)}ms blocking=${blocking}ms style@=${styleStart}ms ${scripts}`,
          "color:#a855f7;font-weight:bold"
        );
      }
    });
    loafObserver.observe({
      buffered: true,
      type: "long-animation-frame",
    } as PerformanceObserverInit);
  } catch {
    // LoAF not supported
  }
};

export const setTransitionRenderer = (next: WebGLRenderer | null): void => {
  if (next) {
    renderer = next;
  }
};

export const setTransitionScene = (next: Scene | null): void => {
  if (next) {
    scene = next;
  }
};

export const clearTransitionRefs = (): void => {
  renderer = null;
  scene = null;
};

export const enableTransitionPerf = (): void => {
  if (enabled) {
    return;
  }

  enabled = true;
  firstSpikeProgramsLogged = false;
  startLongTaskObserver();
  startLoafObserver();
  lastFrameAt = 0;
  frameWatcher = requestAnimationFrame(watchFrames);

  const w = window as unknown as { __rtPerf?: unknown };

  w.__rtPerf = {
    cachedGeo: () => cachedGeometryStats(),
    clear: () => {
      ringBuffer.length = 0;
    },
    dump: () => ringBuffer.slice(),
    last: () => ringBuffer.at(-1),
    loaf: () => recentLoaf.slice(),
    programs: () =>
      renderer?.info.programs?.map((p) => ({
        cacheKey: (p as unknown as { cacheKey?: string }).cacheKey,
        id: p.id,
        name: p.name,
        usedTimes: p.usedTimes,
      })) ?? [],
    sceneSummary: () => {
      if (!scene) {
        return null;
      }

      const counts: Record<string, number> = {};

      scene.traverse((obj) => {
        counts[obj.type] = (counts[obj.type] ?? 0) + 1;
      });

      return counts;
    },
    spikes: () => ringBuffer.filter((r) => r.totalMs > SPIKE_TOTAL_MS),
  };

  console.info(
    "%c[perf] transition logging enabled — window.__rtPerf for postmortem",
    "color:#7dd3fc;font-weight:bold"
  );
};

export const disableTransitionPerf = (): void => {
  enabled = false;
  longTaskObserver?.disconnect();
  longTaskObserver = null;
  loafObserver?.disconnect();
  loafObserver = null;
  cancelAnimationFrame(frameWatcher);
  frameWatcher = 0;
  lastFrameAt = 0;
  pending = null;
};

interface TransitionInfo {
  fromKind: string;
  fromRoomId: string;
  fromTpl: string;
  toKind: string;
  toRoomId: string;
  toTpl: string;
}

export const markTransitionTrigger = (info: TransitionInfo): void => {
  if (!enabled) {
    return;
  }

  performance.mark("rt:trigger");
  pending = {
    before: renderer ? snapshot(renderer) : null,
    ...info,
  };
};

export const markTransitionApplyStart = (): void => {
  if (!(enabled && pending)) {
    return;
  }

  performance.mark("rt:apply-start");
};

const findLoafForFrame = (frameStart: number): LoafEntry | null => {
  for (let i = recentLoaf.length - 1; i >= 0; i -= 1) {
    const entry = recentLoaf[i];
    const end = entry.startTime + entry.duration;

    if (entry.startTime <= frameStart && end >= frameStart) {
      return entry as LoafEntry;
    }
  }

  return null;
};

const fmt = (n: number) => n.toFixed(1);
const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

interface DeltaBundle {
  calls: number;
  geo: number;
  heapMB: number | null;
  nodes: number;
  progs: number;
  tex: number;
  tri: number;
}

const computeDeltas = (
  before: RendererSnapshot | null,
  after: RendererSnapshot | null
): DeltaBundle | null => {
  if (!(before && after)) {
    return null;
  }

  const heapDelta =
    before.heapMB !== null && after.heapMB !== null
      ? after.heapMB - before.heapMB
      : null;

  return {
    calls: after.calls - before.calls,
    geo: after.geometries - before.geometries,
    heapMB: heapDelta,
    nodes: after.sceneNodes - before.sceneNodes,
    progs: after.programs - before.programs,
    tex: after.textures - before.textures,
    tri: after.triangles - before.triangles,
  };
};

const formatDeltas = (deltas: DeltaBundle | null): string => {
  if (!deltas) {
    return "";
  }

  const heapStr =
    deltas.heapMB === null
      ? ""
      : ` heapMB:${deltas.heapMB >= 0 ? "+" : ""}${deltas.heapMB.toFixed(1)}`;

  return ` Δ progs:${sign(deltas.progs)} tex:${sign(deltas.tex)} geo:${sign(deltas.geo)} nodes:${sign(deltas.nodes)} tris:${sign(deltas.tri)} calls:${sign(deltas.calls)}${heapStr}`;
};

const formatSlowDetail = (frames: FrameSample[]): string =>
  frames
    .filter(
      (f) =>
        f.delta > SLOW_FRAME_MS && f.loafScripts && f.loafScripts.length > 0
    )
    .map(
      (f) =>
        `f${f.index}[blocking=${f.loafBlocking?.toFixed(0) ?? "?"}ms scripts=${f.loafScripts?.join(",")}]`
    )
    .join(" ");

const maybeLogFirstSpikePrograms = (): void => {
  if (firstSpikeProgramsLogged || !renderer) {
    return;
  }

  firstSpikeProgramsLogged = true;
  const programs =
    renderer.info.programs?.slice(-15).map((p) => ({
      id: p.id,
      name: p.name,
      usedTimes: p.usedTimes,
    })) ?? [];

  console.log(
    "%c[rt] last 15 programs (first spike):",
    "color:#7dd3fc",
    programs
  );
};

interface RecordArgs {
  applyMs: number;
  ctx: PendingTransition;
  deltas: DeltaBundle | null;
  frames: FrameSample[];
  seq: number;
  total: number;
  triggerToApply: number;
}

const pushTransitionRecord = (args: RecordArgs): void => {
  ringBuffer.push({
    applyMs: args.applyMs,
    deltas: args.deltas,
    frames: args.frames,
    fromKind: args.ctx.fromKind,
    fromRoomId: args.ctx.fromRoomId,
    fromTpl: args.ctx.fromTpl,
    seq: args.seq,
    toKind: args.ctx.toKind,
    toRoomId: args.ctx.toRoomId,
    toTpl: args.ctx.toTpl,
    totalMs: args.total,
    triggerToApplyMs: args.triggerToApply,
  });

  while (ringBuffer.length > RING_SIZE) {
    ringBuffer.shift();
  }
};

export const markTransitionApplyEnd = (): void => {
  if (!(enabled && pending)) {
    return;
  }

  performance.mark("rt:apply-end");

  const ctx = pending;

  pending = null;
  transitionSeq += 1;

  const seq = transitionSeq;
  let triggerToApply = 0;
  let applyDuration = 0;

  try {
    triggerToApply = performance.measure(
      "rt:trigger→apply",
      "rt:trigger",
      "rt:apply-start"
    ).duration;
    applyDuration = performance.measure(
      "rt:apply",
      "rt:apply-start",
      "rt:apply-end"
    ).duration;
  } catch {
    // marks may have been cleared
  }

  const frames: FrameSample[] = [];
  let lastTimestamp = performance.now();
  let framesLeft = FRAME_TRACE_COUNT;

  const measureFrame = () => {
    const now = performance.now();
    const delta = now - lastTimestamp;
    const idx = FRAME_TRACE_COUNT - framesLeft;
    const loaf = findLoafForFrame(lastTimestamp);

    frames.push({
      delta,
      index: idx + 1,
      loafBlocking: loaf?.blockingDuration ?? null,
      loafDuration: loaf?.duration ?? null,
      loafScripts:
        loaf?.scripts
          ?.filter((s) => s.duration > 4)
          .map(
            (s) => `${s.invoker || s.name || "anon"}:${s.duration.toFixed(0)}ms`
          ) ?? null,
    });

    lastTimestamp = now;
    framesLeft -= 1;

    if (framesLeft > 0) {
      requestAnimationFrame(measureFrame);
    } else {
      finalize();
    }
  };

  const finalize = () => {
    const after = renderer ? snapshot(renderer) : null;
    const framesTotal = frames.reduce((s, f) => s + f.delta, 0);
    const total = triggerToApply + applyDuration + framesTotal;
    const isSpike = total > SPIKE_TOTAL_MS;
    const deltas = computeDeltas(ctx.before, after);
    const route = `${ctx.fromKind}/${ctx.fromTpl}(${ctx.fromRoomId}) → ${ctx.toKind}/${ctx.toTpl}(${ctx.toRoomId})`;
    const framesStr = frames
      .map((f) => `f${f.index}=${fmt(f.delta)}`)
      .join(" ");
    const slowDetail = formatSlowDetail(frames);
    const tag = isSpike ? "[rt SPIKE]" : "[rt]";
    const style = isSpike ? "color:#ff6b6b;font-weight:bold" : "color:#7dd3fc";

    console.log(
      `%c${tag} #${seq} ${route}  trigger→apply=${fmt(triggerToApply)}ms apply=${fmt(applyDuration)}ms ${framesStr} total=${fmt(total)}ms${formatDeltas(deltas)}` +
        (slowDetail ? `\n  ↳ ${slowDetail}` : ""),
      style
    );

    if (isSpike) {
      maybeLogFirstSpikePrograms();
    }

    pushTransitionRecord({
      applyMs: applyDuration,
      deltas,
      frames,
      seq,
      total,
      triggerToApply,
      ctx,
    });

    clearMarks(["rt:trigger", "rt:apply-start", "rt:apply-end"]);
    clearMeasures(["rt:trigger→apply", "rt:apply"]);
  };

  if (typeof requestAnimationFrame === "undefined") {
    finalize();
  } else {
    requestAnimationFrame(measureFrame);
  }
};
