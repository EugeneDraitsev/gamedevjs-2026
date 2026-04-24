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

interface OneShotGraph {
  context: AudioContext;
  root: GainNode;
  start: number;
}

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

  playCorePrisonDomeCrack(hitIndex: number) {
    const shot = this.#beginOneShot(0.48 + Math.min(2, hitIndex) * 0.09, 760);

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

  playCorePrisonDomeBreak() {
    const shot = this.#beginOneShot(0.98, 1650);

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

  playDoorOpen() {
    const shot = this.#beginOneShot(0.68, 1350);

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;

    this.#playDoorMotorRumble(context, root, start);
    this.#playDoorChainTicks(context, root, start + 0.05);
    this.#playDoorLatchThunk(context, root, start + 0.68);
  }

  playGearPickup() {
    const shot = this.#beginOneShot(0.54, 620);

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;

    this.#playGearClink(context, root, start);
    this.#playRatchetClicks(context, root, start + 0.035, 4);
  }

  playLootSpawn() {
    const shot = this.#beginOneShot(0.5, 760);

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;

    this.#playLootMaterialize(context, root, start);
    this.#playSparkleSpray(context, root, start + 0.08);
  }

  playPlayerLaserShot(shotId: number, attackMode: "beam" | "projectile") {
    const shot = this.#beginOneShot(
      attackMode === "beam" ? 0.52 : 0.46,
      attackMode === "beam" ? 620 : 420,
      0.003
    );

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;
    const variant = Math.abs(shotId) % 4;

    this.#playBlasterZap(context, root, start, variant, attackMode);
    this.#playBlasterBody(context, root, start, variant, attackMode);
  }

  playRepairPickup() {
    const shot = this.#beginOneShot(0.56, 860);

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;

    this.#playRepairServo(context, root, start);
    this.#playRepairChimes(context, root, start + 0.045);
  }

  playSwordSwing(swingId: number) {
    const shot = this.#beginOneShot(0.42, 520, 0.004);

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;
    const variant = Math.abs(swingId) % 3;

    this.#playSwordWhoosh(context, root, start, variant);
    this.#playSwordEdgeTone(context, root, start + 0.012, variant);
  }

  #beginOneShot(
    rootVolume: number,
    disconnectAfterMs: number,
    startOffsetSeconds = 0.006
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

    root.gain.setValueAtTime(0.0001, start);
    root.gain.exponentialRampToValueAtTime(rootVolume, start + 0.012);
    root.gain.exponentialRampToValueAtTime(
      0.0001,
      start + disconnectAfterMs / 1000 - 0.08
    );
    root.connect(output);

    window.setTimeout(() => {
      root.disconnect();
    }, disconnectAfterMs);

    return { context, root, start };
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
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const duration = options.duration ?? 0.26;

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(options.startFrequency ?? 132, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      options.endFrequency ?? 46,
      start + duration * 0.8
    );
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(360, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      options.volume ?? 0.18,
      start + 0.01
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(root);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
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

  #playBlasterBody(
    context: AudioContext,
    root: GainNode,
    start: number,
    variant: number,
    attackMode: "beam" | "projectile"
  ) {
    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const bandpass = context.createBiquadFilter();
    const gain = context.createGain();
    const duration = attackMode === "beam" ? 0.22 : 0.12;

    source.buffer = this.#createNoiseBuffer(context, duration + 0.04);
    source.playbackRate.setValueAtTime(1.35 + variant * 0.08, start);
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(760 + variant * 90, start);
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(2500 + variant * 380, start);
    bandpass.Q.setValueAtTime(1.9, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      attackMode === "beam" ? 0.13 : 0.19,
      start + 0.006
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(root);
    source.start(start);
    source.stop(start + duration + 0.03);
  }

  #playBlasterZap(
    context: AudioContext,
    root: GainNode,
    start: number,
    variant: number,
    attackMode: "beam" | "projectile"
  ) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const panner = context.createStereoPanner();
    const startFrequency =
      attackMode === "beam" ? 1560 + variant * 120 : 1250 + variant * 170;
    const peakFrequency =
      attackMode === "beam" ? 3100 + variant * 210 : 2600 + variant * 260;
    const endFrequency =
      attackMode === "beam" ? 430 + variant * 30 : 360 + variant * 34;
    const duration = attackMode === "beam" ? 0.28 : 0.18;

    oscillator.type = variant % 2 === 0 ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      peakFrequency,
      start + 0.018
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      start + duration
    );
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800 + variant * 260, start);
    filter.frequency.exponentialRampToValueAtTime(5200, start + 0.05);
    filter.frequency.exponentialRampToValueAtTime(900, start + duration);
    filter.Q.setValueAtTime(4.6, start);
    panner.pan.setValueAtTime((variant - 1.5) * 0.08, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      attackMode === "beam" ? 0.11 : 0.16,
      start + 0.006
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(root);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  #playDoorChainTicks(context: AudioContext, root: GainNode, start: number) {
    for (let index = 0; index < 8; index += 1) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const tickStart = start + index * 0.075 + randomBetween(-0.008, 0.006);
      const duration = randomBetween(0.022, 0.042);
      const frequency = randomBetween(430, 840);

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(frequency, tickStart);
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(frequency * 1.8, tickStart);
      filter.Q.setValueAtTime(2.8, tickStart);
      gain.gain.setValueAtTime(0.0001, tickStart);
      gain.gain.exponentialRampToValueAtTime(
        randomBetween(0.026, 0.052),
        tickStart + 0.004
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, tickStart + duration);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(root);
      oscillator.start(tickStart);
      oscillator.stop(tickStart + duration + 0.01);
    }
  }

  #playDoorLatchThunk(context: AudioContext, root: GainNode, start: number) {
    this.#playDullImpact(context, root, start, {
      duration: 0.22,
      endFrequency: 42,
      startFrequency: 84,
      volume: 0.2,
    });

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(112, start);
    oscillator.frequency.exponentialRampToValueAtTime(58, start + 0.16);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.11, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(root);
    oscillator.start(start);
    oscillator.stop(start + 0.2);
  }

  #playDoorMotorRumble(context: AudioContext, root: GainNode, start: number) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(48, start);
    oscillator.frequency.linearRampToValueAtTime(74, start + 0.52);
    oscillator.frequency.exponentialRampToValueAtTime(36, start + 0.94);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(520, start);
    filter.frequency.linearRampToValueAtTime(310, start + 0.9);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.15, start + 0.08);
    gain.gain.linearRampToValueAtTime(0.1, start + 0.72);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.02);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(root);
    oscillator.start(start);
    oscillator.stop(start + 1.04);
  }

  #playFractureNoise(
    context: AudioContext,
    root: GainNode,
    start: number,
    hitIndex: number
  ) {
    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const bandpass = context.createBiquadFilter();
    const gain = context.createGain();
    const duration = 0.16 + hitIndex * 0.035;

    source.buffer = this.#createNoiseBuffer(context, duration);
    source.playbackRate.setValueAtTime(0.96 + hitIndex * 0.08, start);
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(1180 + hitIndex * 180, start);
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(2700 + hitIndex * 520, start);
    bandpass.Q.setValueAtTime(1.1 + hitIndex * 0.25, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      0.11 + hitIndex * 0.035,
      start + 0.006
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(root);
    source.start(start);
    source.stop(start + duration + 0.02);
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

  #playSealCrackCluster(
    context: AudioContext,
    root: GainNode,
    start: number,
    hitIndex: number
  ) {
    const crackCount = hitIndex <= 1 ? 2 : 4;

    for (let index = 0; index < crackCount; index += 1) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const crackStart = start + randomBetween(0, 0.05 + hitIndex * 0.012);
      const frequency = randomBetween(1450, 4300 + hitIndex * 550);
      const duration = randomBetween(0.045, 0.095);

      oscillator.type = index % 2 === 0 ? "sawtooth" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, crackStart);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * randomBetween(0.62, 0.84),
        crackStart + duration
      );
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(frequency, crackStart);
      filter.Q.setValueAtTime(3.8, crackStart);
      gain.gain.setValueAtTime(0.0001, crackStart);
      gain.gain.exponentialRampToValueAtTime(
        randomBetween(0.026, 0.058) + hitIndex * 0.006,
        crackStart + 0.003
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, crackStart + duration);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(root);
      oscillator.start(crackStart);
      oscillator.stop(crackStart + duration + 0.02);
    }
  }

  #playGlassPing(
    context: AudioContext,
    root: GainNode,
    start: number,
    hitIndex: number
  ) {
    for (let index = 0; index < 2; index += 1) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const panner = context.createStereoPanner();
      const pingStart = start + index * 0.032;
      const frequency = 2100 + hitIndex * 620 + index * 940;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, pingStart);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 0.86,
        pingStart + 0.24
      );
      panner.pan.setValueAtTime(index === 0 ? -0.18 : 0.22, pingStart);
      gain.gain.setValueAtTime(0.0001, pingStart);
      gain.gain.exponentialRampToValueAtTime(
        0.024 + hitIndex * 0.007,
        pingStart + 0.006
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, pingStart + 0.28);

      oscillator.connect(gain);
      gain.connect(panner);
      panner.connect(root);
      oscillator.start(pingStart);
      oscillator.stop(pingStart + 0.3);
    }
  }

  #playGearClink(context: AudioContext, root: GainNode, start: number) {
    const frequencies = [740, 1180, 1860];

    for (const [index, frequency] of frequencies.entries()) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const panner = context.createStereoPanner();
      const clinkStart = start + index * 0.018;
      const duration = 0.18 + index * 0.035;

      oscillator.type = index === 0 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(
        frequency * randomBetween(0.96, 1.04),
        clinkStart
      );
      panner.pan.setValueAtTime((index - 1) * 0.12, clinkStart);
      gain.gain.setValueAtTime(0.0001, clinkStart);
      gain.gain.exponentialRampToValueAtTime(
        0.08 - index * 0.014,
        clinkStart + 0.006
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, clinkStart + duration);

      oscillator.connect(gain);
      gain.connect(panner);
      panner.connect(root);
      oscillator.start(clinkStart);
      oscillator.stop(clinkStart + duration + 0.02);
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

  #playLootMaterialize(context: AudioContext, root: GainNode, start: number) {
    for (let index = 0; index < 4; index += 1) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const toneStart = start + index * 0.045;
      const frequency = 620 + index * 260;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, toneStart);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 1.8,
        toneStart + 0.24
      );
      filter.type = "highpass";
      filter.frequency.setValueAtTime(360, toneStart);
      gain.gain.setValueAtTime(0.0001, toneStart);
      gain.gain.exponentialRampToValueAtTime(
        0.034 + index * 0.006,
        toneStart + 0.014
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.32);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(root);
      oscillator.start(toneStart);
      oscillator.stop(toneStart + 0.34);
    }
  }

  #playRatchetClicks(
    context: AudioContext,
    root: GainNode,
    start: number,
    count: number
  ) {
    for (let index = 0; index < count; index += 1) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const clickStart = start + index * 0.038;

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(420 + index * 95, clickStart);
      filter.type = "highpass";
      filter.frequency.setValueAtTime(980, clickStart);
      gain.gain.setValueAtTime(0.0001, clickStart);
      gain.gain.exponentialRampToValueAtTime(0.035, clickStart + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, clickStart + 0.032);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(root);
      oscillator.start(clickStart);
      oscillator.stop(clickStart + 0.04);
    }
  }

  #playRepairChimes(context: AudioContext, root: GainNode, start: number) {
    const frequencies = [520, 780, 1040, 1560];

    for (const [index, frequency] of frequencies.entries()) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const toneStart = start + index * 0.058;
      const duration = 0.26 + index * 0.04;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, toneStart);
      gain.gain.setValueAtTime(0.0001, toneStart);
      gain.gain.exponentialRampToValueAtTime(
        0.038 + index * 0.004,
        toneStart + 0.012
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + duration);

      oscillator.connect(gain);
      gain.connect(root);
      oscillator.start(toneStart);
      oscillator.stop(toneStart + duration + 0.02);
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
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.11, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(root);
    oscillator.start(start);
    oscillator.stop(start + 0.42);
  }

  #playResonantGlassRings(
    context: AudioContext,
    root: GainNode,
    start: number
  ) {
    const ringFrequencies = [1280, 1930, 2870, 4210, 5340];

    for (const [index, frequency] of ringFrequencies.entries()) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const panner = context.createStereoPanner();
      const ringStart = start + index * 0.036;
      const duration = 0.62 + index * 0.08;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        frequency * randomBetween(0.96, 1.04),
        ringStart
      );
      panner.pan.setValueAtTime(randomBetween(-0.48, 0.48), ringStart);
      gain.gain.setValueAtTime(0.0001, ringStart);
      gain.gain.exponentialRampToValueAtTime(
        0.028 - index * 0.002,
        ringStart + 0.012
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, ringStart + duration);

      oscillator.connect(gain);
      gain.connect(panner);
      panner.connect(root);
      oscillator.start(ringStart);
      oscillator.stop(ringStart + duration + 0.03);
    }
  }

  #playSparkleSpray(context: AudioContext, root: GainNode, start: number) {
    for (let index = 0; index < 10; index += 1) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const panner = context.createStereoPanner();
      const sparkleStart = start + randomBetween(0, 0.24);
      const duration = randomBetween(0.055, 0.16);
      const frequency = randomBetween(1600, 5200);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, sparkleStart);
      panner.pan.setValueAtTime(randomBetween(-0.55, 0.55), sparkleStart);
      gain.gain.setValueAtTime(0.0001, sparkleStart);
      gain.gain.exponentialRampToValueAtTime(
        randomBetween(0.012, 0.032),
        sparkleStart + 0.006
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, sparkleStart + duration);

      oscillator.connect(gain);
      gain.connect(panner);
      panner.connect(root);
      oscillator.start(sparkleStart);
      oscillator.stop(sparkleStart + duration + 0.02);
    }
  }

  #playSwordWhoosh(
    context: AudioContext,
    root: GainNode,
    start: number,
    variant: number
  ) {
    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const bandpass = context.createBiquadFilter();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    const duration = [0.18, 0.23, 0.2][variant] ?? 0.2;
    const peak = [0.22, 0.18, 0.24][variant] ?? 0.21;
    const startFrequency = [840, 620, 1020][variant] ?? 860;
    const endFrequency = [2600, 2050, 3200][variant] ?? 2600;
    const startPan = variant === 1 ? 0.26 : -0.24;
    const endPan = -startPan * randomBetween(0.6, 0.95);

    source.buffer = this.#createNoiseBuffer(context, duration + 0.04);
    source.playbackRate.setValueAtTime(1 + variant * 0.08, start);
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(360 + variant * 120, start);
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(startFrequency, start);
    bandpass.frequency.exponentialRampToValueAtTime(
      endFrequency,
      start + duration
    );
    bandpass.Q.setValueAtTime(0.72 + variant * 0.14, start);
    panner.pan.setValueAtTime(startPan, start);
    panner.pan.linearRampToValueAtTime(endPan, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(panner);
    panner.connect(root);
    source.start(start);
    source.stop(start + duration + 0.04);
  }

  #playSwordEdgeTone(
    context: AudioContext,
    root: GainNode,
    start: number,
    variant: number
  ) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const duration = 0.13 + variant * 0.025;
    const startFrequency = [620, 760, 910][variant] ?? 720;

    oscillator.type = variant === 1 ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      startFrequency * 0.54,
      start + duration
    );
    filter.type = "highpass";
    filter.frequency.setValueAtTime(420, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(root);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}

export const gameSfx = new GameSfxManager();
