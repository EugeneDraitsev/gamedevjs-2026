import { Howler } from "howler";

export interface SfxMixSettings {
  masterSoundEnabled: boolean;
  masterVolume: number;
  sfxSoundEnabled: boolean;
  sfxVolume: number;
}

const defaultSfxMix: SfxMixSettings = {
  masterSoundEnabled: true,
  masterVolume: 1,
  sfxSoundEnabled: true,
  sfxVolume: 1,
};

const sfxOutputBoost = 3;
const silentLevel = 0.0001;
const stopTailSeconds = 0.02;

const compressorSettings = {
  attack: 0.003,
  knee: 8,
  ratio: 4,
  release: 0.18,
  threshold: -10,
};

const clamp01 = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

const randomBetween = (min: number, max: number) =>
  min + Math.random() * (max - min);

type RampType = "exp" | "linear";
type Sweep =
  | number
  | { from: number; to: number; over?: number; ramp?: RampType };
type PanSpec = number | { from: number; to: number };
interface FilterSpec {
  freq: Sweep;
  q?: number;
  type: BiquadFilterType;
}

interface GainEnvelope {
  attack?: number;
  peak: number;
  release?: number;
}

interface VoiceBase {
  duration: number;
  filter?: FilterSpec | FilterSpec[];
  gain: GainEnvelope;
  pan?: PanSpec;
  start: number;
}

interface ToneVoice extends VoiceBase {
  freq: Sweep;
  type: OscillatorType;
}

interface NoiseVoice extends VoiceBase {
  bufferDuration?: number;
  playbackRate?: number;
}

interface OneShotGraph {
  context: AudioContext;
  root: GainNode;
  start: number;
}

const applySweep = (
  param: AudioParam,
  sweep: Sweep,
  start: number,
  duration: number
) => {
  if (typeof sweep === "number") {
    param.setValueAtTime(sweep, start);
    return;
  }

  const end = start + (sweep.over ?? duration);

  param.setValueAtTime(sweep.from, start);

  if (sweep.ramp === "linear") {
    param.linearRampToValueAtTime(sweep.to, end);
  } else {
    param.exponentialRampToValueAtTime(sweep.to, end);
  }
};

const applyEnvelope = (
  param: AudioParam,
  env: GainEnvelope,
  start: number,
  duration: number
) => {
  const attack = env.attack ?? 0.006;

  param.setValueAtTime(silentLevel, start);
  param.exponentialRampToValueAtTime(env.peak, start + attack);

  if (env.release !== undefined) {
    const sustainEnd = Math.max(start + attack, start + duration - env.release);
    param.setValueAtTime(env.peak, sustainEnd);
  }

  param.exponentialRampToValueAtTime(silentLevel, start + duration);
};

const applyPan = (
  param: AudioParam,
  pan: PanSpec,
  start: number,
  duration: number
) => {
  if (typeof pan === "number") {
    param.setValueAtTime(pan, start);
    return;
  }

  param.setValueAtTime(pan.from, start);
  param.linearRampToValueAtTime(pan.to, start + duration);
};

const chainFilters = (
  context: AudioContext,
  upstream: AudioNode,
  filters: FilterSpec | FilterSpec[] | undefined,
  start: number,
  duration: number
): AudioNode => {
  if (!filters) {
    return upstream;
  }

  const list = Array.isArray(filters) ? filters : [filters];
  let node: AudioNode = upstream;

  for (const spec of list) {
    const filter = context.createBiquadFilter();

    filter.type = spec.type;
    applySweep(filter.frequency, spec.freq, start, duration);

    if (spec.q !== undefined) {
      filter.Q.setValueAtTime(spec.q, start);
    }

    node.connect(filter);
    node = filter;
  }

  return node;
};

const connectOutput = (
  context: AudioContext,
  source: AudioNode,
  root: AudioNode,
  pan: PanSpec | undefined,
  start: number,
  duration: number
) => {
  if (pan === undefined) {
    source.connect(root);
    return;
  }

  const panner = context.createStereoPanner();

  applyPan(panner.pan, pan, start, duration);
  source.connect(panner);
  panner.connect(root);
};

const createNoiseBuffer = (context: AudioContext, durationSeconds: number) => {
  const length = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < length; index += 1) {
    const fade = 1 - index / length;
    data[index] = (Math.random() * 2 - 1) * (0.35 + fade * fade * 0.65);
  }

  return buffer;
};

const playTone = (context: AudioContext, root: AudioNode, voice: ToneVoice) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = voice.type;
  applySweep(oscillator.frequency, voice.freq, voice.start, voice.duration);
  applyEnvelope(gain.gain, voice.gain, voice.start, voice.duration);

  const filtered = chainFilters(
    context,
    oscillator,
    voice.filter,
    voice.start,
    voice.duration
  );

  filtered.connect(gain);
  connectOutput(context, gain, root, voice.pan, voice.start, voice.duration);

  oscillator.start(voice.start);
  oscillator.stop(voice.start + voice.duration + stopTailSeconds);
};

const playNoise = (
  context: AudioContext,
  root: AudioNode,
  voice: NoiseVoice
) => {
  const source = context.createBufferSource();
  const gain = context.createGain();
  const bufferLength = voice.bufferDuration ?? voice.duration;

  source.buffer = createNoiseBuffer(context, bufferLength);

  if (voice.playbackRate !== undefined) {
    source.playbackRate.setValueAtTime(voice.playbackRate, voice.start);
  }

  applyEnvelope(gain.gain, voice.gain, voice.start, voice.duration);

  const filtered = chainFilters(
    context,
    source,
    voice.filter,
    voice.start,
    voice.duration
  );

  filtered.connect(gain);
  connectOutput(context, gain, root, voice.pan, voice.start, voice.duration);

  source.start(voice.start);
  source.stop(voice.start + bufferLength + stopTailSeconds);
};

const defaultPerSoundLevels: Record<string, number> = {
  artifact: 0.76,
  break: 0.24,
  crack: 1,
  damage: 1,
  death: 0.62,
  door: 2.4,
  gear: 1,
  hit: 1,
  laser: 0.1,
  loot: 1,
  reload: 0.32,
  repair: 1,
  sword: 2.4,
};

class GameSfxManager {
  readonly #lastFiredAt = new Map<string, number>();
  #mix: SfxMixSettings = defaultSfxMix;
  #output: GainNode | null = null;
  readonly #perSoundLevel = new Map<string, number>(
    Object.entries(defaultPerSoundLevels)
  );

  setPerSoundLevel(id: string, level: number) {
    this.#perSoundLevel.set(id, Math.max(0, level));
  }

  getPerSoundLevel(id: string): number {
    return this.#perSoundLevel.get(id) ?? 1;
  }

  resetPerSoundLevels() {
    this.#perSoundLevel.clear();
    for (const [id, level] of Object.entries(defaultPerSoundLevels)) {
      this.#perSoundLevel.set(id, level);
    }
  }

  getPerSoundLevels(): Record<string, number> {
    return Object.fromEntries(this.#perSoundLevel);
  }

  #scaledGain(id: string, baseGain: number): number {
    return baseGain * (this.#perSoundLevel.get(id) ?? 1);
  }

  syncMix(settings: SfxMixSettings) {
    this.#mix = {
      masterSoundEnabled: settings.masterSoundEnabled,
      masterVolume: clamp01(settings.masterVolume),
      sfxSoundEnabled: settings.sfxSoundEnabled,
      sfxVolume: clamp01(settings.sfxVolume),
    };

    if (typeof window === "undefined") {
      return;
    }

    Howler.volume(this.#mix.masterSoundEnabled ? this.#mix.masterVolume : 0);
    this.#applyOutputVolume();
  }

  playArtifactPickup() {
    const shot = this.#beginOneShot(this.#scaledGain("artifact", 0.78), 0.92);

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;
    const arpFreqs = [523.25, 659.25, 783.99, 1046.5];

    for (const [index, freq] of arpFreqs.entries()) {
      const noteStart = start + index * 0.058;
      const noteDuration = 0.46 - index * 0.04;

      playTone(context, root, {
        duration: noteDuration,
        freq: {
          from: freq * 0.992,
          ramp: "linear",
          to: freq * 1.006,
        },
        gain: { attack: 0.018, peak: 0.14 - index * 0.012 },
        pan: (index - 1.5) * 0.18,
        start: noteStart,
        type: "sine",
      });

      playTone(context, root, {
        duration: noteDuration * 0.72,
        freq: freq * 2.005,
        gain: { attack: 0.012, peak: 0.042 - index * 0.005 },
        pan: -(index - 1.5) * 0.18,
        start: noteStart + 0.012,
        type: "triangle",
      });
    }

    playNoise(context, root, {
      bufferDuration: 0.62,
      duration: 0.55,
      filter: [
        { freq: 1800, type: "highpass" },
        {
          freq: { from: 3200, ramp: "exp", to: 6400 },
          q: 1.8,
          type: "bandpass",
        },
      ],
      gain: { attack: 0.06, peak: 0.07 },
      start,
    });

    playTone(context, root, {
      duration: 0.5,
      freq: 3135.96,
      gain: { attack: 0.03, peak: 0.06 },
      pan: 0.12,
      start: start + 0.22,
      type: "sine",
    });
  }

  playCorePrisonDomeBreak() {
    const shot = this.#beginOneShot(this.#scaledGain("break", 0.98), 1.65);

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;

    this.#playDullImpact(context, root, start);
    this.#playGlassBurst(context, root, start);
    this.#playBrightCrack(context, root, start);
    this.#playShardTinkles(context, root, start);
    this.#playResonantGlassRings(context, root, start + 0.09);
  }

  playCorePrisonDomeCrack(hitIndex: number) {
    const shot = this.#beginOneShot(
      this.#scaledGain("crack", 0.48 + Math.min(2, hitIndex) * 0.09),
      0.76
    );

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;

    this.#playDullImpact(context, root, start, {
      duration: 0.18,
      endFrequency: 58,
      startFrequency: 112 + hitIndex * 16,
      volume: 0.11 + hitIndex * 0.025,
    });
    this.#playFractureNoise(context, root, start, hitIndex);
    this.#playSealCrackCluster(context, root, start + 0.014, hitIndex);
    this.#playGlassPing(context, root, start + 0.055, hitIndex);
  }

  playDoorOpen() {
    const shot = this.#beginOneShot(this.#scaledGain("door", 0.82), 1.85);

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;

    this.#playStoneSlideRumble(context, root, start);
    this.#playStoneFrictionCrunches(context, root, start + 0.05);
    this.#playStoneGearTeeth(context, root, start + 0.18);
    this.#playStoneSettleThud(context, root, start + 1.42);
  }

  playEnemyDeath(intensity = 0.5) {
    const shot = this.#beginOneShot(this.#scaledGain("death", 1.05), 0.92);

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;
    const power = clamp01(intensity);

    playTone(context, root, {
      duration: 0.18,
      freq: {
        from: 140 - power * 30,
        over: 0.12,
        ramp: "exp",
        to: 32,
      },
      gain: { attack: 0.002, peak: 0.34 + power * 0.12 },
      start,
      type: "sine",
    });

    playNoise(context, root, {
      bufferDuration: 0.14,
      duration: 0.1,
      filter: [
        { freq: 180, type: "highpass" },
        {
          freq: { from: 360, ramp: "exp", to: 220 },
          q: 2.2,
          type: "bandpass",
        },
      ],
      gain: { attack: 0.001, peak: 0.34 + power * 0.06 },
      playbackRate: 0.85,
      start,
    });

    playNoise(context, root, {
      bufferDuration: 0.45,
      duration: 0.4,
      filter: [
        { freq: 600, type: "highpass" },
        {
          freq: { from: 1900, ramp: "exp", to: 480 },
          q: 9,
          type: "bandpass",
        },
      ],
      gain: { attack: 0.006, peak: 0.26 + power * 0.06 },
      playbackRate: 0.95,
      start: start + 0.005,
    });

    playTone(context, root, {
      duration: 0.32,
      filter: {
        freq: { from: 1200, ramp: "exp", to: 280 },
        q: 11,
        type: "bandpass",
      },
      freq: {
        from: 720 + power * 100,
        over: 0.28,
        ramp: "exp",
        to: 120,
      },
      gain: { attack: 0.004, peak: 0.16 + power * 0.05 },
      pan: randomBetween(-0.18, 0.18),
      start: start + 0.005,
      type: "sawtooth",
    });

    const shardCount = 10;

    for (let index = 0; index < shardCount; index += 1) {
      const shardStart = start + 0.04 + randomBetween(0, 0.46);
      const centerFreq = randomBetween(380, 1600);
      const shardPan = randomBetween(-0.7, 0.7);
      const duration = randomBetween(0.06, 0.14);

      playNoise(context, root, {
        bufferDuration: duration + 0.04,
        duration,
        filter: [
          { freq: 320, type: "highpass" },
          { freq: centerFreq, q: 9, type: "bandpass" },
        ],
        gain: { attack: 0.001, peak: randomBetween(0.09, 0.14) },
        pan: shardPan,
        playbackRate: randomBetween(0.8, 1.1),
        start: shardStart,
      });
    }

    const stressPopCount = 8;

    for (let index = 0; index < stressPopCount; index += 1) {
      const popStart = start + 0.02 + randomBetween(0, 0.44);
      const popFreq = randomBetween(1800, 4200);

      playNoise(context, root, {
        bufferDuration: 0.025,
        duration: 0.014,
        filter: [
          { freq: 1500, type: "highpass" },
          { freq: popFreq, q: 8, type: "bandpass" },
        ],
        gain: { attack: 0.0006, peak: randomBetween(0.07, 0.11) },
        pan: randomBetween(-0.5, 0.5),
        playbackRate: 1.4,
        start: popStart,
      });
    }

    for (let index = 0; index < 3; index += 1) {
      const chunkStart = start + 0.18 + randomBetween(0, 0.4);
      const chunkFreq = randomBetween(60, 140);
      const chunkPan = randomBetween(-0.3, 0.3);

      playTone(context, root, {
        duration: 0.1,
        filter: { freq: 280, type: "lowpass" },
        freq: {
          from: chunkFreq,
          ramp: "exp",
          to: chunkFreq * 0.36,
        },
        gain: { attack: 0.002, peak: randomBetween(0.12, 0.18) },
        pan: chunkPan,
        start: chunkStart,
        type: "triangle",
      });

      playNoise(context, root, {
        bufferDuration: 0.09,
        duration: 0.06,
        filter: [
          { freq: 160, type: "highpass" },
          { freq: 380, q: 1.6, type: "bandpass" },
        ],
        gain: { attack: 0.001, peak: 0.1 },
        pan: chunkPan,
        playbackRate: 0.7,
        start: chunkStart,
      });
    }
  }

  playEnemyHit() {
    if (this.#shouldThrottle("enemyHit", 0.025)) {
      return;
    }

    const shot = this.#beginOneShot(this.#scaledGain("hit", 0.55), 0.18, 0.002);

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;
    const pan = randomBetween(-0.18, 0.18);

    playTone(context, root, {
      duration: 0.08,
      filter: { freq: 720, type: "lowpass" },
      freq: {
        from: 520 + randomBetween(-80, 80),
        ramp: "exp",
        to: 180,
      },
      gain: { attack: 0.002, peak: 0.16 },
      pan,
      start,
      type: "sine",
    });

    playNoise(context, root, {
      bufferDuration: 0.05,
      duration: 0.024,
      filter: [
        { freq: 320, type: "highpass" },
        { freq: 850, q: 1.4, type: "bandpass" },
      ],
      gain: { attack: 0.001, peak: 0.05 },
      pan,
      playbackRate: 0.95,
      start,
    });
  }

  playGearPickup() {
    const shot = this.#beginOneShot(this.#scaledGain("gear", 0.54), 0.62);

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;

    this.#playGearClink(context, root, start);
    this.#playRatchetClicks(context, root, start + 0.035, 4);
  }

  playLaserShot(intensity = 0.5) {
    if (this.#shouldThrottle("laser", 0.06)) {
      return;
    }

    const shot = this.#beginOneShot(this.#scaledGain("laser", 1), 0.84, 0.002);

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;
    const power = clamp01(intensity);
    const pan = randomBetween(-0.12, 0.12);

    playTone(context, root, {
      duration: 0.38,
      filter: {
        freq: { from: 140, over: 0.2, ramp: "exp", to: 42 },
        type: "lowpass",
      },
      freq: { from: 132, over: 0.22, ramp: "exp", to: 38 },
      gain: {
        attack: 0.004,
        peak: 0.28 + power * 0.05,
        release: 0.18,
      },
      start,
      type: "sine",
    });

    playTone(context, root, {
      duration: 0.28 + power * 0.04,
      filter: {
        freq: { from: 3400, ramp: "exp", to: 980 },
        q: 8,
        type: "bandpass",
      },
      freq: {
        from: 2400 + power * 1100,
        over: 0.18,
        ramp: "exp",
        to: 620,
      },
      gain: {
        attack: 0.001,
        peak: 0.2 + power * 0.05,
        release: 0.1,
      },
      pan,
      start,
      type: "sawtooth",
    });

    playTone(context, root, {
      duration: 0.24,
      filter: {
        freq: { from: 6200, ramp: "exp", to: 1800 },
        q: 18,
        type: "bandpass",
      },
      freq: {
        from: 5200 + power * 1400,
        over: 0.15,
        ramp: "exp",
        to: 1450,
      },
      gain: {
        attack: 0.0008,
        peak: 0.12 + power * 0.035,
        release: 0.08,
      },
      pan: -pan * 0.6,
      start: start + 0.002,
      type: "sawtooth",
    });

    playNoise(context, root, {
      bufferDuration: 0.16,
      duration: 0.11,
      filter: [
        { freq: 1500, type: "highpass" },
        {
          freq: { from: 7600, ramp: "exp", to: 2600 },
          q: 2.4,
          type: "bandpass",
        },
      ],
      gain: { attack: 0.0008, peak: 0.26 + power * 0.08, release: 0.06 },
      pan: -pan,
      playbackRate: 1.65,
      start,
    });

    playTone(context, root, {
      duration: 0.18,
      filter: {
        freq: { from: 4800, ramp: "exp", to: 1900 },
        q: 13,
        type: "bandpass",
      },
      freq: {
        from: 3100,
        over: 0.1,
        ramp: "exp",
        to: 980,
      },
      gain: { attack: 0.001, peak: 0.09, release: 0.08 },
      pan: pan * 0.4,
      start: start + 0.005,
      type: "sawtooth",
    });

    this.#playElectricBuzz(context, root, start + 0.012, 0.32, 0.2);
    this.#playElectricBuzz(context, root, start + 0.045, 0.26, 0.13);

    const branchCount = 7;

    for (let index = 0; index < branchCount; index += 1) {
      const branchStart = start + 0.012 + randomBetween(0, 0.26);
      const frequency = randomBetween(1800, 7200);
      const branchDuration = randomBetween(0.035, 0.095);

      playTone(context, root, {
        duration: branchDuration,
        filter: {
          freq: frequency * randomBetween(0.65, 1.15),
          q: randomBetween(9, 18),
          type: "bandpass",
        },
        freq: {
          from: frequency,
          over: branchDuration * 0.7,
          ramp: "exp",
          to: frequency * randomBetween(0.28, 0.62),
        },
        gain: {
          attack: 0.0006,
          peak: randomBetween(0.035, 0.075) + power * 0.02,
          release: branchDuration * 0.45,
        },
        pan: randomBetween(-0.55, 0.55),
        start: branchStart,
        type: index % 2 === 0 ? "sawtooth" : "square",
      });
    }

    const crackleCount = 30;

    for (let index = 0; index < crackleCount; index += 1) {
      const popStart = start + 0.006 + randomBetween(0, 0.38);
      const centerFreq = randomBetween(2400, 9800);

      playNoise(context, root, {
        bufferDuration: 0.035,
        duration: randomBetween(0.006, 0.02),
        filter: [
          { freq: 1800, type: "highpass" },
          { freq: centerFreq, q: randomBetween(5, 12), type: "bandpass" },
        ],
        gain: { attack: 0.0005, peak: randomBetween(0.055, 0.14) },
        pan: randomBetween(-0.65, 0.65),
        playbackRate: randomBetween(1.35, 2.2),
        start: popStart,
      });
    }

    playTone(context, root, {
      duration: 0.16,
      freq: { from: 78, over: 0.08, ramp: "exp", to: 30 },
      gain: { attack: 0.002, peak: 0.12 },
      start: start + 0.32,
      type: "sine",
    });
  }

  playLootSpawn() {
    const shot = this.#beginOneShot(this.#scaledGain("loot", 0.5), 0.76);

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;

    this.#playLootMaterialize(context, root, start);
    this.#playSparkleSpray(context, root, start + 0.08);
  }

  playPlayerDamage() {
    const shot = this.#beginOneShot(
      this.#scaledGain("damage", 0.88),
      0.72,
      0.002
    );

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;

    this.#playDullImpact(context, root, start, {
      duration: 0.24,
      endFrequency: 52,
      startFrequency: 176,
      volume: 0.25,
    });
    this.#playDamageStatic(context, root, start + 0.006);
    this.#playDamageTone(context, root, start + 0.018);
  }

  playReload() {
    const shot = this.#beginOneShot(
      this.#scaledGain("reload", 0.98),
      1.2,
      0.006,
      true
    );

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;

    this.#playReloadMetalMechanism(context, root, start + 0.02);

    playNoise(context, root, {
      bufferDuration: 0.08,
      duration: 0.052,
      filter: [
        { freq: 1100, type: "highpass" },
        { freq: 3200, q: 4.8, type: "bandpass" },
      ],
      gain: { attack: 0.0008, peak: 0.16 },
      pan: -0.16,
      playbackRate: 0.92,
      start,
    });

    playTone(context, root, {
      duration: 0.08,
      filter: { freq: 580, type: "lowpass" },
      freq: { from: 260, over: 0.04, ramp: "exp", to: 84 },
      gain: { attack: 0.0015, peak: 0.12 },
      pan: -0.12,
      start: start + 0.006,
      type: "triangle",
    });

    playNoise(context, root, {
      bufferDuration: 0.24,
      duration: 0.18,
      filter: [
        { freq: 260, type: "highpass" },
        {
          freq: { from: 1250, over: 0.1, ramp: "exp", to: 520 },
          q: 1.5,
          type: "bandpass",
        },
      ],
      gain: { attack: 0.004, peak: 0.13, release: 0.07 },
      pan: -0.18,
      playbackRate: 0.54,
      start: start + 0.13,
    });

    playNoise(context, root, {
      bufferDuration: 0.13,
      duration: 0.095,
      filter: [
        { freq: 780, type: "highpass" },
        { freq: 2100, q: 3.4, type: "bandpass" },
      ],
      gain: { attack: 0.001, peak: 0.18 },
      pan: 0.08,
      playbackRate: 0.78,
      start: start + 0.48,
    });

    playTone(context, root, {
      duration: 0.1,
      filter: { freq: 620, type: "lowpass" },
      freq: { from: 220, over: 0.06, ramp: "exp", to: 72 },
      gain: { attack: 0.0015, peak: 0.2 },
      pan: 0.08,
      start: start + 0.49,
      type: "triangle",
    });

    playNoise(context, root, {
      bufferDuration: 0.18,
      duration: 0.13,
      filter: [
        { freq: 520, type: "highpass" },
        { freq: 2600, q: 5.2, type: "bandpass" },
      ],
      gain: { attack: 0.001, peak: 0.17, release: 0.045 },
      pan: 0.16,
      playbackRate: 0.96,
      start: start + 0.78,
    });

    playTone(context, root, {
      duration: 0.11,
      filter: { freq: 680, type: "lowpass" },
      freq: { from: 280, over: 0.06, ramp: "exp", to: 64 },
      gain: { attack: 0.002, peak: 0.23 },
      pan: 0.16,
      start: start + 0.79,
      type: "triangle",
    });

    playNoise(context, root, {
      bufferDuration: 0.09,
      duration: 0.06,
      filter: [
        { freq: 900, type: "highpass" },
        { freq: 3900, q: 8.5, type: "bandpass" },
      ],
      gain: { attack: 0.0008, peak: 0.11 },
      pan: -0.04,
      playbackRate: 1.06,
      start: start + 0.96,
    });
  }

  playRepairPickup() {
    const shot = this.#beginOneShot(this.#scaledGain("repair", 0.72), 1.04);

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;

    this.#playRepairServo(context, root, start);
    this.#playRepairSweep(context, root, start + 0.018);
    this.#playRepairChimes(context, root, start + 0.055);
    this.#playRepairSparkleTail(context, root, start + 0.19);
  }

  playSwordSwing(swingId: number) {
    const shot = this.#beginOneShot(
      this.#scaledGain("sword", 0.42),
      0.52,
      0.004
    );

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;
    const variant = Math.abs(swingId) % 3;

    this.#playSwordWhoosh(context, root, start, variant);
    this.#playSwordEdgeTone(context, root, start + 0.012, variant);
  }

  #applyOutputVolume() {
    if (!this.#output) {
      return;
    }

    const context = this.#getContext();

    if (!context) {
      return;
    }

    this.#output.gain.setTargetAtTime(
      this.#targetOutputVolume(),
      context.currentTime,
      0.018
    );
  }

  #beginOneShot(
    rootGain: number,
    lifetimeSeconds: number,
    startOffsetSeconds = 0.006,
    sustainRoot = false
  ): OneShotGraph | null {
    if (
      typeof window === "undefined" ||
      !this.#mix.masterSoundEnabled ||
      !this.#mix.sfxSoundEnabled ||
      this.#mix.masterVolume <= 0 ||
      this.#mix.sfxVolume <= 0
    ) {
      return null;
    }

    const context = this.#getContext();
    const output = this.#getOutput();

    if (!(context && output)) {
      return null;
    }

    if (context.state === "suspended") {
      context.resume().catch(() => undefined);
    }

    const start = context.currentTime + startOffsetSeconds;
    const root = context.createGain();
    const fadeOutAt = Math.max(start + 0.014, start + lifetimeSeconds - 0.08);
    const releaseStart = Math.max(start + 0.014, fadeOutAt - 0.08);

    root.gain.setValueAtTime(silentLevel, start);
    root.gain.exponentialRampToValueAtTime(rootGain, start + 0.012);

    if (sustainRoot) {
      root.gain.setValueAtTime(rootGain, releaseStart);
    }

    root.gain.exponentialRampToValueAtTime(silentLevel, fadeOutAt);
    root.connect(output);

    window.setTimeout(() => {
      root.disconnect();
    }, lifetimeSeconds * 1000);

    return { context, root, start };
  }

  #getContext() {
    Howler.volume(Howler.volume());
    return Howler.ctx ?? null;
  }

  #getOutput() {
    const context = this.#getContext();

    if (!context) {
      return null;
    }

    if (this.#output) {
      return this.#output;
    }

    const output = context.createGain();
    const compressor = context.createDynamicsCompressor();

    output.gain.setValueAtTime(this.#targetOutputVolume(), context.currentTime);

    compressor.attack.setValueAtTime(
      compressorSettings.attack,
      context.currentTime
    );
    compressor.knee.setValueAtTime(
      compressorSettings.knee,
      context.currentTime
    );
    compressor.ratio.setValueAtTime(
      compressorSettings.ratio,
      context.currentTime
    );
    compressor.release.setValueAtTime(
      compressorSettings.release,
      context.currentTime
    );
    compressor.threshold.setValueAtTime(
      compressorSettings.threshold,
      context.currentTime
    );

    output.connect(compressor);
    compressor.connect(Howler.masterGain);
    this.#output = output;
    return output;
  }

  #shouldThrottle(key: string, intervalSeconds: number) {
    const now =
      (typeof performance === "undefined" ? Date.now() : performance.now()) /
      1000;
    const last = this.#lastFiredAt.get(key) ?? Number.NEGATIVE_INFINITY;

    if (now - last < intervalSeconds) {
      return true;
    }

    this.#lastFiredAt.set(key, now);
    return false;
  }

  #targetOutputVolume() {
    return this.#mix.sfxSoundEnabled ? this.#mix.sfxVolume * sfxOutputBoost : 0;
  }

  #playBrightCrack(context: AudioContext, root: GainNode, start: number) {
    for (const offset of [0, 0.018, 0.043]) {
      const crackStart = start + offset;
      const frequency = randomBetween(1800, 3900);

      playTone(context, root, {
        duration: 0.085,
        filter: {
          freq: frequency * 1.05,
          q: 3.4,
          type: "bandpass",
        },
        freq: {
          from: frequency,
          over: 0.055,
          ramp: "exp",
          to: frequency * randomBetween(0.58, 0.78),
        },
        gain: { attack: 0.003, peak: randomBetween(0.04, 0.08) },
        start: crackStart,
        type: "sawtooth",
      });
    }
  }

  #playElectricBuzz(
    context: AudioContext,
    root: GainNode,
    start: number,
    duration: number,
    peak: number
  ) {
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const amRate = 78;
    const amHalfPeriod = 1 / (amRate * 2);
    const lowAm = peak * 0.08;

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(820, start);
    oscillator.frequency.exponentialRampToValueAtTime(280, start + duration);

    filter.type = "bandpass";
    filter.Q.setValueAtTime(15, start);
    filter.frequency.setValueAtTime(1600, start);
    filter.frequency.exponentialRampToValueAtTime(560, start + duration);

    const attack = 0.04;
    const release = 0.12;
    const sustainEnd = start + duration - release;

    gain.gain.setValueAtTime(silentLevel, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);

    let t = start + attack;
    let high = false;

    while (t < sustainEnd) {
      gain.gain.linearRampToValueAtTime(high ? peak : lowAm, t);
      t += amHalfPeriod;
      high = !high;
    }

    gain.gain.setValueAtTime(peak, sustainEnd);
    gain.gain.exponentialRampToValueAtTime(silentLevel, start + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(root);
    oscillator.start(start);
    oscillator.stop(start + duration + stopTailSeconds);
  }

  #playDamageStatic(context: AudioContext, root: GainNode, start: number) {
    const duration = 0.19;

    playNoise(context, root, {
      bufferDuration: duration + 0.03,
      duration,
      filter: [
        { freq: 720, type: "highpass" },
        {
          freq: { from: 1800, ramp: "exp", to: 520 },
          q: 1.7,
          type: "bandpass",
        },
      ],
      gain: { attack: 0.004, peak: 0.24 },
      playbackRate: 1.32,
      start,
    });
  }

  #playDamageTone(context: AudioContext, root: GainNode, start: number) {
    const duration = 0.24;

    playTone(context, root, {
      duration,
      filter: {
        freq: { from: 900, ramp: "exp", to: 260 },
        q: 5.2,
        type: "bandpass",
      },
      freq: { from: 620, ramp: "exp", to: 152 },
      gain: { attack: 0.01, peak: 0.17 },
      pan: { from: -0.08, to: 0.09 },
      start,
      type: "sawtooth",
    });
  }

  #playStoneFrictionCrunches(
    context: AudioContext,
    root: GainNode,
    start: number
  ) {
    for (let index = 0; index < 5; index += 1) {
      const crunchStart = start + index * 0.24 + randomBetween(-0.03, 0.03);
      const frequency = randomBetween(60, 110);

      playTone(context, root, {
        duration: 0.09,
        filter: { freq: 320, type: "lowpass" },
        freq: {
          from: frequency,
          ramp: "exp",
          to: frequency * 0.55,
        },
        gain: { attack: 0.003, peak: randomBetween(0.16, 0.24) },
        pan: randomBetween(-0.18, 0.18),
        start: crunchStart,
        type: "triangle",
      });

      playNoise(context, root, {
        bufferDuration: 0.08,
        duration: 0.06,
        filter: [
          { freq: 980, type: "lowpass" },
          { freq: 620, q: 1.8, type: "bandpass" },
        ],
        gain: { attack: 0.002, peak: 0.1 },
        playbackRate: 0.85,
        start: crunchStart,
      });
    }
  }

  #playStoneGearTeeth(context: AudioContext, root: GainNode, start: number) {
    for (let index = 0; index < 8; index += 1) {
      const tickStart = start + index * 0.14 + randomBetween(-0.012, 0.012);
      const baseFreq = index % 2 === 0 ? 240 : 180;

      playTone(context, root, {
        duration: 0.06,
        filter: {
          freq: baseFreq * 1.4,
          q: 3.8,
          type: "bandpass",
        },
        freq: {
          from: baseFreq + randomBetween(-30, 50),
          ramp: "exp",
          to: baseFreq * 0.75,
        },
        gain: { attack: 0.002, peak: randomBetween(0.06, 0.1) },
        pan: index % 2 === 0 ? -0.18 : 0.16,
        start: tickStart,
        type: "square",
      });
    }
  }

  #playStoneSettleThud(context: AudioContext, root: GainNode, start: number) {
    this.#playDullImpact(context, root, start, {
      duration: 0.36,
      endFrequency: 32,
      startFrequency: 78,
      volume: 0.28,
    });

    playNoise(context, root, {
      bufferDuration: 0.22,
      duration: 0.18,
      filter: [
        { freq: 380, type: "lowpass" },
        { freq: 140, q: 1.6, type: "bandpass" },
      ],
      gain: { attack: 0.005, peak: 0.16 },
      playbackRate: 0.7,
      start,
    });
  }

  #playStoneSlideRumble(context: AudioContext, root: GainNode, start: number) {
    playNoise(context, root, {
      bufferDuration: 1.4,
      duration: 1.3,
      filter: [
        { freq: 520, q: 0.7, type: "lowpass" },
        {
          freq: { from: 180, over: 0.6, ramp: "exp", to: 240 },
          q: 1.6,
          type: "bandpass",
        },
      ],
      gain: { attack: 0.18, peak: 0.38, release: 0.32 },
      playbackRate: 0.62,
      start,
    });

    playTone(context, root, {
      duration: 1.25,
      filter: { freq: 180, type: "lowpass" },
      freq: { from: 38, over: 0.6, ramp: "linear", to: 32 },
      gain: { attack: 0.15, peak: 0.16, release: 0.28 },
      start,
      type: "sawtooth",
    });
  }

  #playDullImpact(
    context: AudioContext,
    root: GainNode,
    start: number,
    options: {
      duration?: number;
      endFrequency?: number;
      startFrequency?: number;
      volume?: number;
    } = {}
  ) {
    const duration = options.duration ?? 0.26;

    playTone(context, root, {
      duration,
      filter: { freq: 360, type: "lowpass" },
      freq: {
        from: options.startFrequency ?? 132,
        over: duration * 0.8,
        ramp: "exp",
        to: options.endFrequency ?? 46,
      },
      gain: { attack: 0.01, peak: options.volume ?? 0.18 },
      start,
      type: "triangle",
    });
  }

  #playFractureNoise(
    context: AudioContext,
    root: GainNode,
    start: number,
    hitIndex: number
  ) {
    const duration = 0.16 + hitIndex * 0.035;

    playNoise(context, root, {
      bufferDuration: duration,
      duration,
      filter: [
        { freq: 1180 + hitIndex * 180, type: "highpass" },
        {
          freq: 2700 + hitIndex * 520,
          q: 1.1 + hitIndex * 0.25,
          type: "bandpass",
        },
      ],
      gain: { attack: 0.006, peak: 0.11 + hitIndex * 0.035 },
      playbackRate: 0.96 + hitIndex * 0.08,
      start,
    });
  }

  #playGearClink(context: AudioContext, root: GainNode, start: number) {
    const frequencies = [740, 1180, 1860];

    for (const [index, frequency] of frequencies.entries()) {
      const clinkStart = start + index * 0.018;
      const duration = 0.18 + index * 0.035;

      playTone(context, root, {
        duration,
        freq: frequency * randomBetween(0.96, 1.04),
        gain: { attack: 0.006, peak: 0.08 - index * 0.014 },
        pan: (index - 1) * 0.12,
        start: clinkStart,
        type: index === 0 ? "triangle" : "sine",
      });
    }
  }

  #playGlassBurst(context: AudioContext, root: GainNode, start: number) {
    const duration = 0.34;

    playNoise(context, root, {
      bufferDuration: 0.42,
      duration,
      filter: [
        { freq: 1050, type: "highpass" },
        { freq: 10_800, type: "lowpass" },
      ],
      gain: { attack: 0.004, peak: 0.42 },
      playbackRate: 1.12,
      start,
    });
  }

  #playGlassPing(
    context: AudioContext,
    root: GainNode,
    start: number,
    hitIndex: number
  ) {
    for (let index = 0; index < 2; index += 1) {
      const pingStart = start + index * 0.032;
      const frequency = 2100 + hitIndex * 620 + index * 940;

      playTone(context, root, {
        duration: 0.28,
        freq: { from: frequency, ramp: "exp", to: frequency * 0.86 },
        gain: { attack: 0.006, peak: 0.024 + hitIndex * 0.007 },
        pan: index === 0 ? -0.18 : 0.22,
        start: pingStart,
        type: "sine",
      });
    }
  }

  #playLootMaterialize(context: AudioContext, root: GainNode, start: number) {
    for (let index = 0; index < 4; index += 1) {
      const toneStart = start + index * 0.045;
      const frequency = 620 + index * 260;

      playTone(context, root, {
        duration: 0.32,
        filter: { freq: 360, type: "highpass" },
        freq: { from: frequency, over: 0.24, ramp: "exp", to: frequency * 1.8 },
        gain: { attack: 0.014, peak: 0.034 + index * 0.006 },
        start: toneStart,
        type: "sine",
      });
    }
  }

  #playRatchetClicks(
    context: AudioContext,
    root: GainNode,
    start: number,
    count: number
  ) {
    for (let index = 0; index < count; index += 1) {
      const clickStart = start + index * 0.038;

      playTone(context, root, {
        duration: 0.032,
        filter: { freq: 980, type: "highpass" },
        freq: 420 + index * 95,
        gain: { attack: 0.003, peak: 0.035 },
        start: clickStart,
        type: "square",
      });
    }
  }

  #playReloadMetalMechanism(
    context: AudioContext,
    root: GainNode,
    start: number
  ) {
    const slideDuration = 0.78;

    playNoise(context, root, {
      bufferDuration: slideDuration + 0.06,
      duration: slideDuration,
      filter: [
        { freq: 180, type: "highpass" },
        { freq: 4600, type: "lowpass" },
        {
          freq: { from: 1600, over: 0.42, ramp: "exp", to: 720 },
          q: 1.25,
          type: "bandpass",
        },
      ],
      gain: { attack: 0.018, peak: 0.105, release: 0.22 },
      pan: { from: -0.16, to: 0.1 },
      playbackRate: 0.6,
      start,
    });

    playNoise(context, root, {
      bufferDuration: 0.42,
      duration: 0.34,
      filter: [
        { freq: 880, type: "highpass" },
        {
          freq: { from: 3400, over: 0.2, ramp: "exp", to: 1300 },
          q: 5.5,
          type: "bandpass",
        },
      ],
      gain: { attack: 0.006, peak: 0.045, release: 0.1 },
      pan: { from: -0.06, to: 0.12 },
      playbackRate: 0.68,
      start: start + 0.12,
    });

    for (let index = 0; index < 12; index += 1) {
      const tickStart =
        start + 0.035 + index * 0.066 + randomBetween(-0.006, 0.007);
      const baseFreq = [960, 1320, 1780][index % 3];

      playTone(context, root, {
        duration: 0.018,
        filter: {
          freq: baseFreq * randomBetween(0.95, 1.15),
          q: 10,
          type: "bandpass",
        },
        freq: {
          from: baseFreq + randomBetween(-60, 70),
          ramp: "exp",
          to: baseFreq * randomBetween(0.78, 0.94),
        },
        gain: { attack: 0.0006, peak: randomBetween(0.026, 0.05) },
        pan: index % 2 === 0 ? -0.18 : 0.16,
        start: tickStart,
        type: "triangle",
      });

      playNoise(context, root, {
        bufferDuration: 0.028,
        duration: 0.016,
        filter: [
          { freq: 900, type: "highpass" },
          { freq: baseFreq * 1.8, q: 4.2, type: "bandpass" },
        ],
        gain: { attack: 0.0005, peak: index % 4 === 0 ? 0.052 : 0.03 },
        pan: index % 2 === 0 ? -0.12 : 0.12,
        playbackRate: randomBetween(0.82, 1.1),
        start: tickStart,
      });
    }

    for (const [index, scrapeOffset] of [0.18, 0.58].entries()) {
      playNoise(context, root, {
        bufferDuration: 0.24,
        duration: 0.17 + index * 0.03,
        filter: [
          { freq: 760, type: "highpass" },
          {
            freq: {
              from: 2900 - index * 500,
              over: 0.1,
              ramp: "exp",
              to: 1100 + index * 180,
            },
            q: 7.2 - index,
            type: "bandpass",
          },
        ],
        gain: { attack: 0.004, peak: 0.052 - index * 0.01, release: 0.06 },
        pan: index % 2 === 0 ? 0.16 : -0.14,
        playbackRate: 0.72 + index * 0.1,
        start: start + scrapeOffset,
      });
    }
  }

  #playRepairChimes(context: AudioContext, root: GainNode, start: number) {
    const frequencies = [620, 930, 1240, 1660, 2480];

    for (const [index, frequency] of frequencies.entries()) {
      const toneStart = start + index * 0.046;
      const duration = 0.24 + index * 0.045;

      playTone(context, root, {
        duration,
        freq: { from: frequency, ramp: "exp", to: frequency * 1.04 },
        gain: { attack: 0.012, peak: 0.052 - index * 0.003 },
        start: toneStart,
        type: "sine",
      });
    }
  }

  #playRepairServo(context: AudioContext, root: GainNode, start: number) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(180, start);
    oscillator.frequency.exponentialRampToValueAtTime(360, start + 0.18);
    oscillator.frequency.exponentialRampToValueAtTime(220, start + 0.36);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, start);
    gain.gain.setValueAtTime(silentLevel, start);
    gain.gain.exponentialRampToValueAtTime(0.085, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(silentLevel, start + 0.4);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(root);
    oscillator.start(start);
    oscillator.stop(start + 0.42);
  }

  #playRepairSparkleTail(context: AudioContext, root: GainNode, start: number) {
    for (let index = 0; index < 8; index += 1) {
      const sparkleStart = start + randomBetween(0, 0.38);
      const duration = randomBetween(0.09, 0.2);
      const frequency = randomBetween(1800, 5200);

      playTone(context, root, {
        duration,
        freq: { from: frequency, ramp: "exp", to: frequency * 1.18 },
        gain: { attack: 0.01, peak: randomBetween(0.018, 0.04) },
        pan: randomBetween(-0.34, 0.34),
        start: sparkleStart,
        type: "sine",
      });
    }
  }

  #playRepairSweep(context: AudioContext, root: GainNode, start: number) {
    const duration = 0.46;

    playTone(context, root, {
      duration,
      filter: {
        freq: { from: 520, ramp: "exp", to: 2100 },
        q: 4.4,
        type: "bandpass",
      },
      freq: { from: 240, ramp: "exp", to: 1080 },
      gain: { attack: 0.055, peak: 0.13 },
      start,
      type: "triangle",
    });
  }

  #playResonantGlassRings(
    context: AudioContext,
    root: GainNode,
    start: number
  ) {
    const ringFrequencies = [1280, 1930, 2870, 4210, 5340];

    for (const [index, frequency] of ringFrequencies.entries()) {
      const ringStart = start + index * 0.036;
      const duration = 0.62 + index * 0.08;

      playTone(context, root, {
        duration,
        freq: frequency * randomBetween(0.96, 1.04),
        gain: { attack: 0.012, peak: 0.028 - index * 0.002 },
        pan: randomBetween(-0.48, 0.48),
        start: ringStart,
        type: "sine",
      });
    }
  }

  #playSealCrackCluster(
    context: AudioContext,
    root: GainNode,
    start: number,
    hitIndex: number
  ) {
    const crackCount = hitIndex <= 1 ? 2 : 4;

    for (let index = 0; index < crackCount; index += 1) {
      const crackStart = start + randomBetween(0, 0.05 + hitIndex * 0.012);
      const frequency = randomBetween(1450, 4300 + hitIndex * 550);
      const duration = randomBetween(0.045, 0.095);

      playTone(context, root, {
        duration,
        filter: {
          freq: frequency,
          q: 3.8,
          type: "bandpass",
        },
        freq: {
          from: frequency,
          ramp: "exp",
          to: frequency * randomBetween(0.62, 0.84),
        },
        gain: {
          attack: 0.003,
          peak: randomBetween(0.026, 0.058) + hitIndex * 0.006,
        },
        start: crackStart,
        type: index % 2 === 0 ? "sawtooth" : "triangle",
      });
    }
  }

  #playShardTinkles(context: AudioContext, root: GainNode, start: number) {
    for (let index = 0; index < 18; index += 1) {
      const shardStart = start + randomBetween(0.035, 0.32);
      const duration = randomBetween(0.055, 0.24);
      const frequency = 1150 + Math.random() ** 1.8 * 6900;

      playTone(context, root, {
        duration,
        freq: {
          from: frequency,
          ramp: "exp",
          to: frequency * randomBetween(0.72, 0.94),
        },
        gain: { attack: 0.006, peak: randomBetween(0.012, 0.054) },
        pan: randomBetween(-0.62, 0.62),
        start: shardStart,
        type: Math.random() > 0.35 ? "sine" : "triangle",
      });
    }
  }

  #playSparkleSpray(context: AudioContext, root: GainNode, start: number) {
    for (let index = 0; index < 10; index += 1) {
      const sparkleStart = start + randomBetween(0, 0.24);
      const duration = randomBetween(0.055, 0.16);
      const frequency = randomBetween(1600, 5200);

      playTone(context, root, {
        duration,
        freq: frequency,
        gain: { attack: 0.006, peak: randomBetween(0.012, 0.032) },
        pan: randomBetween(-0.55, 0.55),
        start: sparkleStart,
        type: "sine",
      });
    }
  }

  #playSwordEdgeTone(
    context: AudioContext,
    root: GainNode,
    start: number,
    variant: number
  ) {
    const duration = 0.13 + variant * 0.025;
    const startFrequency = [620, 760, 910][variant] ?? 720;

    playTone(context, root, {
      duration,
      filter: { freq: 420, type: "highpass" },
      freq: { from: startFrequency, ramp: "exp", to: startFrequency * 0.54 },
      gain: { attack: 0.01, peak: 0.045 },
      start,
      type: variant === 1 ? "triangle" : "sine",
    });
  }

  #playSwordWhoosh(
    context: AudioContext,
    root: GainNode,
    start: number,
    variant: number
  ) {
    const duration = [0.18, 0.23, 0.2][variant] ?? 0.2;
    const peak = [0.22, 0.18, 0.24][variant] ?? 0.21;
    const startFrequency = [840, 620, 1020][variant] ?? 860;
    const endFrequency = [2600, 2050, 3200][variant] ?? 2600;
    const startPan = variant === 1 ? 0.26 : -0.24;

    playNoise(context, root, {
      bufferDuration: duration + 0.04,
      duration,
      filter: [
        { freq: 360 + variant * 120, type: "highpass" },
        {
          freq: { from: startFrequency, ramp: "exp", to: endFrequency },
          q: 0.72 + variant * 0.14,
          type: "bandpass",
        },
      ],
      gain: { attack: 0.018, peak },
      pan: { from: startPan, to: -startPan * randomBetween(0.6, 0.95) },
      playbackRate: 1 + variant * 0.08,
      start,
    });
  }
}

export const gameSfx = new GameSfxManager();
