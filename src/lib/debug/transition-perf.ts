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

interface RenderSample {
  at: number;
  calls: number;
  duration: number;
  end: number;
  geometries: number;
  programs: number;
  route: string | null;
  sceneNodes: number | null;
  seq: number | null;
  shadowAutoUpdate: boolean;
  shadowEnabled: boolean;
  shadowNeedsUpdateBefore: boolean;
  textures: number;
  triangles: number;
}

interface GameFrameInfo {
  beams: number;
  bombs: number;
  deltaSec: number;
  enemies: number;
  enemyShots: number;
  gateLasers: number;
  playerDeathActive: boolean;
  projectiles: number;
  roomId: string;
  spawnPending: boolean;
  templateId: string;
}

interface GameFrameSample extends GameFrameInfo {
  at: number;
  duration: number;
  route: string | null;
  seq: number | null;
}

interface PhaseSample {
  at: number;
  duration: number;
  info: Record<string, unknown> | null;
  name: string;
  route: string | null;
  seq: number | null;
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
  gameFrames: GameFrameSample[];
  phases: PhaseSample[];
  renders: RenderSample[];
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
const SAMPLE_RING_SIZE = 180;
const RENDER_SLOW_MS = 16;
const GAME_FRAME_SLOW_MS = 8;
const PHASE_SLOW_MS = 4;
const TRACE_AFTER_APPLY_MS = 1200;
const PERF_VERSION = "rt-perf-v17-instanced-heal-pickup";

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
let activeTrace: {
  gameLogs: number;
  phaseLogs: number;
  renderLogs: number;
  route: string;
  seq: number;
  startedAt: number;
  until: number;
} | null = null;

const ringBuffer: TransitionRecord[] = [];
const recentLoaf: PerformanceEntry[] = [];
const renderSamples: RenderSample[] = [];
const gameFrameSamples: GameFrameSample[] = [];
const phaseSamples: PhaseSample[] = [];
const wrappedRenderers = new WeakMap<WebGLRenderer, WebGLRenderer["render"]>();

const heapMB = (): number | null => {
  const mem = (
    performance as unknown as { memory?: { usedJSHeapSize?: number } }
  ).memory;

  if (!mem?.usedJSHeapSize) {
    return null;
  }

  return mem.usedJSHeapSize / (1024 * 1024);
};

const countSceneNodes = (s: Object3D | null): number => {
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

const pushBounded = <T>(buffer: T[], value: T, limit = SAMPLE_RING_SIZE) => {
  buffer.push(value);

  while (buffer.length > limit) {
    buffer.shift();
  }
};

const currentTrace = (at = performance.now()) => {
  if (activeTrace && at <= activeTrace.until) {
    return activeTrace;
  }

  if (activeTrace && at > activeTrace.until) {
    activeTrace = null;
  }

  return null;
};

const routeLabel = (ctx: PendingTransition): string =>
  `${ctx.fromKind}/${ctx.fromTpl}(${ctx.fromRoomId}) -> ${ctx.toKind}/${ctx.toTpl}(${ctx.toRoomId})`;

const samplesInWindow = <T extends { at: number; end?: number }>(
  samples: T[],
  start: number,
  end: number
): T[] =>
  samples.filter((sample) => {
    const sampleEnd = sample.end ?? sample.at;

    return sample.at <= end && sampleEnd >= start;
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
      console.log(
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

        console.log(
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

        console.log(
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

const scheduleTraceBoundaryProbes = (startedAt: number): void => {
  const mark = (name: string) => {
    markTransitionPhaseEnd(name, startedAt, () => ({
      sinceApplyEndMs: performance.now() - startedAt,
    }));
  };

  if (typeof queueMicrotask === "function") {
    queueMicrotask(() => mark("after-apply-microtask"));
  } else {
    Promise.resolve().then(() => mark("after-apply-microtask"));
  }

  setTimeout(() => mark("after-apply-timeout"), 0);

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => mark("first-raf-start"));
  }
};

type RenderSceneArg = Parameters<WebGLRenderer["render"]>[0];
type RenderCameraArg = Parameters<WebGLRenderer["render"]>[1];

const fmtBool = (value: boolean) => (value ? "1" : "0");

const recordRenderSample = (
  r: WebGLRenderer,
  renderScene: RenderSceneArg,
  startedAt: number,
  endedAt: number,
  shadowNeedsUpdateBefore: boolean
): void => {
  if (!enabled) {
    return;
  }

  const trace = currentTrace(startedAt);
  const duration = endedAt - startedAt;
  const traceLogAllowed = Boolean(trace && trace.renderLogs < 8);
  const shouldLog = duration > RENDER_SLOW_MS || traceLogAllowed;
  const sample: RenderSample = {
    at: startedAt,
    calls: r.info.render.calls,
    duration,
    end: endedAt,
    geometries: r.info.memory.geometries,
    programs: r.info.programs?.length ?? 0,
    route: trace?.route ?? null,
    sceneNodes: shouldLog ? countSceneNodes(renderScene as Object3D) : null,
    seq: trace?.seq ?? null,
    shadowAutoUpdate: r.shadowMap.autoUpdate,
    shadowEnabled: r.shadowMap.enabled,
    shadowNeedsUpdateBefore,
    textures: r.info.memory.textures,
    triangles: r.info.render.triangles,
  };

  pushBounded(renderSamples, sample);

  if (!shouldLog) {
    return;
  }

  if (traceLogAllowed && trace) {
    trace.renderLogs += 1;
  }

  console.log(
    `%c[rt render] #${sample.seq ?? "-"} render=${fmt(sample.duration)}ms calls=${sample.calls} tris=${sample.triangles} progs=${sample.programs} geo=${sample.geometries} tex=${sample.textures} nodes=${sample.sceneNodes ?? "?"} shadow=${fmtBool(sample.shadowEnabled)}/${fmtBool(sample.shadowAutoUpdate)}/${fmtBool(sample.shadowNeedsUpdateBefore)} ${sample.route ?? ""}`,
    sample.duration > RENDER_SLOW_MS
      ? "color:#fb7185;font-weight:bold"
      : "color:#67e8f9"
  );
};

const wrapRenderer = (r: WebGLRenderer): void => {
  if (wrappedRenderers.has(r)) {
    return;
  }

  const original = r.render.bind(r) as WebGLRenderer["render"];

  wrappedRenderers.set(r, original);
  r.render = ((renderScene: RenderSceneArg, camera: RenderCameraArg) => {
    if (!enabled) {
      return original(renderScene, camera);
    }

    const startedAt = performance.now();
    const shadowNeedsUpdateBefore = r.shadowMap.needsUpdate;

    try {
      return original(renderScene, camera);
    } finally {
      recordRenderSample(
        r,
        renderScene,
        startedAt,
        performance.now(),
        shadowNeedsUpdateBefore
      );
    }
  }) as WebGLRenderer["render"];
};

export const setTransitionRenderer = (next: WebGLRenderer | null): void => {
  if (next) {
    renderer = next;
    wrapRenderer(next);
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

const installRtPerfApi = (): void => {
  const w = window as unknown as { __rtPerf?: unknown };

  w.__rtPerf = {
    cachedGeo: () => cachedGeometryStats(),
    clear: () => {
      ringBuffer.length = 0;
      recentLoaf.length = 0;
      renderSamples.length = 0;
      gameFrameSamples.length = 0;
      phaseSamples.length = 0;
    },
    dump: () => ringBuffer.slice(),
    gameFrames: () => gameFrameSamples.slice(),
    gameSlow: () =>
      gameFrameSamples.filter((sample) => sample.duration > GAME_FRAME_SLOW_MS),
    last: () => ringBuffer.at(-1),
    loaf: () => recentLoaf.slice(),
    phases: () => phaseSamples.slice(),
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
    render: () => renderSamples.slice(),
    renderSlow: () =>
      renderSamples.filter((sample) => sample.duration > RENDER_SLOW_MS),
    spikes: () => ringBuffer.filter((r) => r.totalMs > SPIKE_TOTAL_MS),
    trace: () => activeTrace,
    version: () => PERF_VERSION,
  };
};

export const enableTransitionPerf = (): void => {
  installRtPerfApi();

  if (enabled) {
    return;
  }

  enabled = true;
  firstSpikeProgramsLogged = false;
  startLongTaskObserver();
  startLoafObserver();
  lastFrameAt = 0;
  frameWatcher = requestAnimationFrame(watchFrames);

  console.info(
    `%c[perf] transition logging enabled ${PERF_VERSION} - window.__rtPerf for postmortem`,
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
  activeTrace = null;
};

const getPhaseInfo = (
  getInfo?: () => Record<string, unknown>
): Record<string, unknown> | null => {
  if (!getInfo) {
    return null;
  }

  try {
    return getInfo();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const formatInfo = (info: Record<string, unknown> | null): string => {
  if (!info) {
    return "";
  }

  try {
    return JSON.stringify(info);
  } catch {
    return "[unserializable]";
  }
};

export const markGameFrameStart = (): number => {
  if (!enabled) {
    return 0;
  }

  return performance.now();
};

export const markGameFrameEnd = (
  startedAt: number,
  getInfo: () => GameFrameInfo
): void => {
  if (!(enabled && startedAt > 0)) {
    return;
  }

  const endedAt = performance.now();
  const trace = currentTrace(startedAt);
  const duration = endedAt - startedAt;
  const info = getInfo();
  const sample: GameFrameSample = {
    ...info,
    at: startedAt,
    duration,
    route: trace?.route ?? null,
    seq: trace?.seq ?? null,
  };

  pushBounded(gameFrameSamples, sample);

  const traceLogAllowed = Boolean(trace && trace.gameLogs < 8);

  if (!(traceLogAllowed || duration > GAME_FRAME_SLOW_MS)) {
    return;
  }

  if (traceLogAllowed && trace) {
    trace.gameLogs += 1;
  }

  console.log(
    `%c[rt game] #${sample.seq ?? "-"} tick=${fmt(sample.duration)}ms dt=${sample.deltaSec.toFixed(3)} room=${sample.roomId}/${sample.templateId} enemies=${sample.enemies} shots=${sample.enemyShots} proj=${sample.projectiles} beams=${sample.beams} bombs=${sample.bombs} gates=${sample.gateLasers} spawn=${fmtBool(sample.spawnPending)} death=${fmtBool(sample.playerDeathActive)} ${sample.route ?? ""}`,
    sample.duration > GAME_FRAME_SLOW_MS
      ? "color:#f59e0b;font-weight:bold"
      : "color:#93c5fd"
  );
};

export const markTransitionPhaseStart = (): number => {
  if (!enabled) {
    return 0;
  }

  return performance.now();
};

export const markTransitionPhaseEnd = (
  name: string,
  startedAt: number,
  getInfo?: () => Record<string, unknown>
): void => {
  if (!(enabled && startedAt > 0)) {
    return;
  }

  const endedAt = performance.now();
  const trace = currentTrace(startedAt);
  const duration = endedAt - startedAt;
  const info = getPhaseInfo(getInfo);
  const sample: PhaseSample = {
    at: startedAt,
    duration,
    info,
    name,
    route: trace?.route ?? null,
    seq: trace?.seq ?? null,
  };

  pushBounded(phaseSamples, sample);

  const traceLogAllowed = Boolean(trace && trace.phaseLogs < 16);

  if (!(traceLogAllowed || duration > PHASE_SLOW_MS)) {
    return;
  }

  if (traceLogAllowed && trace) {
    trace.phaseLogs += 1;
  }

  const infoStr = formatInfo(sample.info);

  console.log(
    `%c[rt phase] #${sample.seq ?? "-"} ${sample.name}=${fmt(sample.duration)}ms ${sample.route ?? ""}${infoStr ? ` ${infoStr}` : ""}`,
    sample.duration > PHASE_SLOW_MS
      ? "color:#c084fc;font-weight:bold"
      : "color:#c4b5fd"
  );
};

export const markRuntimeTrace = (
  name: string,
  getInfo?: () => Record<string, unknown>,
  durationMs = TRACE_AFTER_APPLY_MS
): void => {
  if (!enabled) {
    return;
  }

  const startedAt = performance.now();
  const info = getPhaseInfo(getInfo);
  const infoStr = formatInfo(info);

  activeTrace = {
    gameLogs: 0,
    phaseLogs: 0,
    renderLogs: 0,
    route: `${name}${infoStr ? ` ${infoStr}` : ""}`,
    seq: -1,
    startedAt,
    until: startedAt + durationMs,
  };

  pushBounded(phaseSamples, {
    at: startedAt,
    duration: 0,
    info,
    name,
    route: activeTrace.route,
    seq: activeTrace.seq,
  });
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

const formatRenderSummary = (renders: RenderSample[]): string =>
  renders
    .map(
      (sample, index) =>
        `r${index + 1}=${fmt(sample.duration)}ms calls=${sample.calls} tris=${sample.triangles} sh=${fmtBool(sample.shadowEnabled)}/${fmtBool(sample.shadowAutoUpdate)}/${fmtBool(sample.shadowNeedsUpdateBefore)}`
    )
    .join(" ");

const formatGameFrameSummary = (samples: GameFrameSample[]): string =>
  samples
    .map(
      (sample, index) =>
        `g${index + 1}=${fmt(sample.duration)}ms room=${sample.roomId}/${sample.templateId} enemies=${sample.enemies} proj=${sample.projectiles} spawn=${fmtBool(sample.spawnPending)}`
    )
    .join(" ");

const formatPhaseSummary = (samples: PhaseSample[]): string =>
  samples.map((sample) => `${sample.name}=${fmt(sample.duration)}ms`).join(" ");

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
  gameFrames: GameFrameSample[];
  phases: PhaseSample[];
  renders: RenderSample[];
  seq: number;
  total: number;
  triggerToApply: number;
}

interface TraceSamples {
  gameFrames: GameFrameSample[];
  phases: PhaseSample[];
  renders: RenderSample[];
}

const pushTransitionRecord = (args: RecordArgs): void => {
  ringBuffer.push({
    applyMs: args.applyMs,
    deltas: args.deltas,
    frames: args.frames,
    gameFrames: args.gameFrames,
    fromKind: args.ctx.fromKind,
    fromRoomId: args.ctx.fromRoomId,
    fromTpl: args.ctx.fromTpl,
    phases: args.phases,
    renders: args.renders,
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

const collectTraceSamples = (start: number, end: number): TraceSamples => ({
  gameFrames: samplesInWindow(gameFrameSamples, start, end),
  phases: samplesInWindow(phaseSamples, start, end),
  renders: samplesInWindow(renderSamples, start, end),
});

const logTraceSummaries = (seq: number, samples: TraceSamples): void => {
  const { gameFrames, phases, renders } = samples;

  if (renders.length > 0) {
    console.log(
      `%c[rt render trace] #${seq} ${formatRenderSummary(renders)}`,
      renders.some((sample) => sample.duration > RENDER_SLOW_MS)
        ? "color:#fb7185;font-weight:bold"
        : "color:#67e8f9"
    );
  }

  if (gameFrames.length > 0) {
    console.log(
      `%c[rt game trace] #${seq} ${formatGameFrameSummary(gameFrames)}`,
      gameFrames.some((sample) => sample.duration > GAME_FRAME_SLOW_MS)
        ? "color:#f59e0b;font-weight:bold"
        : "color:#93c5fd"
    );
  }

  if (phases.length > 0) {
    console.log(
      `%c[rt phase trace] #${seq} ${formatPhaseSummary(phases)}`,
      phases.some((sample) => sample.duration > PHASE_SLOW_MS)
        ? "color:#c084fc;font-weight:bold"
        : "color:#c4b5fd"
    );
  }
};

const logTransitionResult = (
  seq: number,
  route: string,
  triggerToApply: number,
  applyDuration: number,
  frames: FrameSample[],
  total: number,
  deltas: DeltaBundle | null,
  isSpike: boolean
): void => {
  const framesStr = frames.map((f) => `f${f.index}=${fmt(f.delta)}`).join(" ");
  const slowDetail = formatSlowDetail(frames);
  const tag = isSpike ? "[rt SPIKE]" : "[rt]";
  const style = isSpike ? "color:#ff6b6b;font-weight:bold" : "color:#7dd3fc";

  console.log(
    `%c${tag} #${seq} ${route}  trigger-to-apply=${fmt(triggerToApply)}ms apply=${fmt(applyDuration)}ms ${framesStr} total=${fmt(total)}ms${formatDeltas(deltas)}` +
      (slowDetail ? `\n  -> ${slowDetail}` : ""),
    style
  );
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
  const traceStartedAt = performance.now();
  const route = routeLabel(ctx);

  activeTrace = {
    gameLogs: 0,
    phaseLogs: 0,
    renderLogs: 0,
    route,
    seq,
    startedAt: traceStartedAt,
    until: traceStartedAt + TRACE_AFTER_APPLY_MS,
  };
  scheduleTraceBoundaryProbes(traceStartedAt);

  let triggerToApply = 0;
  let applyDuration = 0;

  try {
    triggerToApply = performance.measure(
      "rt:trigger-to-apply",
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
    const traceEndedAt = performance.now();
    const traceSamples = collectTraceSamples(traceStartedAt, traceEndedAt);
    const framesTotal = frames.reduce((s, f) => s + f.delta, 0);
    const total = triggerToApply + applyDuration + framesTotal;
    const isSpike = total > SPIKE_TOTAL_MS;
    const deltas = computeDeltas(ctx.before, after);
    logTransitionResult(
      seq,
      route,
      triggerToApply,
      applyDuration,
      frames,
      total,
      deltas,
      isSpike
    );

    logTraceSummaries(seq, traceSamples);

    if (isSpike) {
      maybeLogFirstSpikePrograms();
    }

    pushTransitionRecord({
      applyMs: applyDuration,
      deltas,
      frames,
      gameFrames: traceSamples.gameFrames,
      phases: traceSamples.phases,
      renders: traceSamples.renders,
      seq,
      total,
      triggerToApply,
      ctx,
    });

    clearMarks(["rt:trigger", "rt:apply-start", "rt:apply-end"]);
    clearMeasures(["rt:trigger-to-apply", "rt:apply"]);
  };

  if (typeof requestAnimationFrame === "undefined") {
    finalize();
  } else {
    requestAnimationFrame(measureFrame);
  }
};
