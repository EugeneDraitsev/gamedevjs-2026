import { Howler } from "howler";

export interface SfxMixSettings {
  masterSoundEnabled: boolean;
  masterVolume: number;
  sfxSoundEnabled: boolean;
  sfxVolume: number;
}

const defaultSfxMix: SfxMixSettings = {
  masterSoundEnabled: true,
  masterVolume: 0.86,
  sfxSoundEnabled: true,
  sfxVolume: 0.8,
};

const clamp01 = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

const randomBetween = (min: number, max: number) =>
  min + Math.random() * (max - min);

class GameSfxManager {
  #mix: SfxMixSettings = defaultSfxMix;
  #output: GainNode | null = null;

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

  playCorePrisonDomeBreak() {
    if (
      typeof window === "undefined" ||
      !this.#mix.masterSoundEnabled ||
      !this.#mix.sfxSoundEnabled ||
      this.#mix.masterVolume <= 0 ||
      this.#mix.sfxVolume <= 0
    ) {
      return;
    }

    const context = this.#getContext();
    const output = this.#getOutput();

    if (!(context && output)) {
      return;
    }

    if (context.state === "suspended") {
      context.resume().catch(() => undefined);
    }

    const start = context.currentTime + 0.006;
    const root = context.createGain();

    root.gain.setValueAtTime(0.0001, start);
    root.gain.exponentialRampToValueAtTime(0.94, start + 0.012);
    root.gain.exponentialRampToValueAtTime(0.0001, start + 1.18);
    root.connect(output);

    this.#playDullImpact(context, root, start);
    this.#playGlassBurst(context, root, start);
    this.#playBrightCrack(context, root, start);
    this.#playShardTinkles(context, root, start);

    window.setTimeout(() => {
      root.disconnect();
    }, 1400);
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
      this.#mix.sfxSoundEnabled ? this.#mix.sfxVolume : 0,
      context.currentTime,
      0.018
    );
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

    output.gain.setValueAtTime(
      this.#mix.sfxSoundEnabled ? this.#mix.sfxVolume : 0,
      context.currentTime
    );
    output.connect(Howler.masterGain);
    this.#output = output;
    return output;
  }

  #createNoiseBuffer(context: AudioContext, durationSeconds: number) {
    const length = Math.max(
      1,
      Math.floor(context.sampleRate * durationSeconds)
    );
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < length; index += 1) {
      const fade = 1 - index / length;
      data[index] = (Math.random() * 2 - 1) * (0.35 + fade * fade * 0.65);
    }

    return buffer;
  }

  #playDullImpact(context: AudioContext, root: GainNode, start: number) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(132, start);
    oscillator.frequency.exponentialRampToValueAtTime(46, start + 0.21);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(360, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(root);
    oscillator.start(start);
    oscillator.stop(start + 0.28);
  }

  #playGlassBurst(context: AudioContext, root: GainNode, start: number) {
    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = this.#createNoiseBuffer(context, 0.42);
    source.playbackRate.setValueAtTime(1.12, start);
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(1050, start);
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(10_800, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.42, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(root);
    source.start(start);
    source.stop(start + 0.44);
  }

  #playBrightCrack(context: AudioContext, root: GainNode, start: number) {
    for (const offset of [0, 0.018, 0.043]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const crackStart = start + offset;
      const frequency = randomBetween(1800, 3900);

      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(frequency, crackStart);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * randomBetween(0.58, 0.78),
        crackStart + 0.055
      );
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(frequency * 1.05, crackStart);
      filter.Q.setValueAtTime(3.4, crackStart);
      gain.gain.setValueAtTime(0.0001, crackStart);
      gain.gain.exponentialRampToValueAtTime(
        randomBetween(0.04, 0.08),
        crackStart + 0.003
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, crackStart + 0.085);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(root);
      oscillator.start(crackStart);
      oscillator.stop(crackStart + 0.095);
    }
  }

  #playShardTinkles(context: AudioContext, root: GainNode, start: number) {
    for (let index = 0; index < 18; index += 1) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const panner = context.createStereoPanner();
      const shardStart = start + randomBetween(0.035, 0.32);
      const duration = randomBetween(0.055, 0.24);
      const frequency = 1150 + Math.random() ** 1.8 * 6900;

      oscillator.type = Math.random() > 0.35 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, shardStart);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * randomBetween(0.72, 0.94),
        shardStart + duration
      );
      panner.pan.setValueAtTime(randomBetween(-0.62, 0.62), shardStart);
      gain.gain.setValueAtTime(0.0001, shardStart);
      gain.gain.exponentialRampToValueAtTime(
        randomBetween(0.012, 0.054),
        shardStart + 0.006
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, shardStart + duration);

      oscillator.connect(gain);
      gain.connect(panner);
      panner.connect(root);
      oscillator.start(shardStart);
      oscillator.stop(shardStart + duration + 0.02);
    }
  }
}

export const gameSfx = new GameSfxManager();
