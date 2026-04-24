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
const sfxOutputBoost = 3;

const clamp01 = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

const randomBetween = (min: number, max: number) =>
  min + Math.random() * (max - min);

interface OneShotGraph {
  context: AudioContext;
  root: GainNode;
  start: number;
}

interface RollingLoop {
  filter: BiquadFilterNode;
  gain: GainNode;
  oscillator: OscillatorNode;
}

class GameSfxManager {
  #mix: SfxMixSettings = defaultSfxMix;
  #output: GainNode | null = null;
  #rollingLoop: RollingLoop | null = null;

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
      attackMode === "beam" ? 0.72 : 0.78,
      attackMode === "beam" ? 620 : 420,
      0.003
    );

    if (!shot) {
      return;
    }

    const { context, root, start } = shot;
    const variant = Math.abs(shotId) % 4;

    this.#playBlasterZap(context, root, start, variant, attackMode);
    this.#playBlasterSnap(context, root, start + 0.004, variant, attackMode);
    this.#playBlasterBody(context, root, start, variant, attackMode);
  }

  playPlayerDamage() {
    const shot = this.#beginOneShot(0.88, 720, 0.002);

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

  setPlayerRolling(amount: number) {
    if (typeof window === "undefined") {
      return;
    }

    const normalizedAmount = clamp01(amount);

    if (normalizedAmount <= 0.012 && !this.#rollingLoop) {
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

    this.#rollingLoop ??= this.#createRollingLoop(context, output);

    const { filter, gain, oscillator } = this.#rollingLoop;
    const now = context.currentTime;
    const active =
      normalizedAmount > 0.045 &&
      this.#mix.masterSoundEnabled &&
      this.#mix.sfxSoundEnabled &&
      this.#mix.masterVolume > 0 &&
      this.#mix.sfxVolume > 0;
    const targetGain = active ? 0.055 + normalizedAmount * 0.18 : 0;

    gain.gain.setTargetAtTime(targetGain, now, active ? 0.055 : 0.16);
    oscillator.frequency.setTargetAtTime(42 + normalizedAmount * 78, now, 0.08);
    filter.frequency.setTargetAtTime(230 + normalizedAmount * 860, now, 0.09);
    filter.Q.setTargetAtTime(0.8 + normalizedAmount * 1.1, now, 0.1);
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
      this.#targetOutputVolume(),
      context.currentTime,
      0.018
    );
  }

  #targetOutputVolume() {
    return this.#mix.sfxSoundEnabled ? this.#mix.sfxVolume * sfxOutputBoost : 0;
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

    output.gain.setValueAtTime(this.#targetOutputVolume(), context.currentTime);
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

  #createRollingLoop(context: AudioContext, output: GainNode): RollingLoop {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    const oscillator = context.createOscillator();
    const oscillatorGain = context.createGain();
    const gain = context.createGain();

    source.buffer = this.#createNoiseBuffer(context, 0.38);
    source.loop = true;
    source.playbackRate.setValueAtTime(0.82, context.currentTime);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(320, context.currentTime);
    filter.Q.setValueAtTime(0.85, context.currentTime);
    noiseGain.gain.setValueAtTime(0.68, context.currentTime);

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(48, context.currentTime);
    oscillatorGain.gain.setValueAtTime(0.055, context.currentTime);
    gain.gain.setValueAtTime(0, context.currentTime);

    source.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(gain);
    oscillator.connect(oscillatorGain);
    oscillatorGain.connect(gain);
    gain.connect(output);
    source.start();
    oscillator.start();

    return { filter, gain, oscillator };
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

  #playDamageStatic(context: AudioContext, root: GainNode, start: number) {
    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const bandpass = context.createBiquadFilter();
    const gain = context.createGain();
    const duration = 0.19;

    source.buffer = this.#createNoiseBuffer(context, duration + 0.03);
    source.playbackRate.setValueAtTime(1.32, start);
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(720, start);
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(1800, start);
    bandpass.frequency.exponentialRampToValueAtTime(520, start + duration);
    bandpass.Q.setValueAtTime(1.7, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.24, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(root);
    source.start(start);
    source.stop(start + duration + 0.03);
  }

  #playDamageTone(context: AudioContext, root: GainNode, start: number) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const panner = context.createStereoPanner();
    const duration = 0.24;

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(620, start);
    oscillator.frequency.exponentialRampToValueAtTime(152, start + duration);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, start);
    filter.frequency.exponentialRampToValueAtTime(260, start + duration);
    filter.Q.setValueAtTime(5.2, start);
    panner.pan.setValueAtTime(-0.08, start);
    panner.pan.linearRampToValueAtTime(0.09, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.17, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(root);
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
      attackMode === "beam" ? 0.18 : 0.25,
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
      attackMode === "beam" ? 2300 + variant * 180 : 3250 + variant * 240;
    const peakFrequency =
      attackMode === "beam" ? 5200 + variant * 260 : 7200 + variant * 310;
    const endFrequency =
      attackMode === "beam" ? 520 + variant * 38 : 430 + variant * 42;
    const duration = attackMode === "beam" ? 0.32 : 0.21;

    oscillator.type = variant % 2 === 0 ? "square" : "sawtooth";
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
    filter.frequency.setValueAtTime(2400 + variant * 320, start);
    filter.frequency.exponentialRampToValueAtTime(7600, start + 0.052);
    filter.frequency.exponentialRampToValueAtTime(900, start + duration);
    filter.Q.setValueAtTime(6.4, start);
    panner.pan.setValueAtTime((variant - 1.5) * 0.08, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      attackMode === "beam" ? 0.2 : 0.28,
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

  #playBlasterSnap(
    context: AudioContext,
    root: GainNode,
    start: number,
    variant: number,
    attackMode: "beam" | "projectile"
  ) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const duration = attackMode === "beam" ? 0.07 : 0.052;
    const frequency =
      attackMode === "beam" ? 4300 + variant * 420 : 5600 + variant * 560;

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * 0.42,
      start + duration
    );
    filter.type = "highpass";
    filter.frequency.setValueAtTime(2100, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      attackMode === "beam" ? 0.1 : 0.17,
      start + 0.003
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(root);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
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
