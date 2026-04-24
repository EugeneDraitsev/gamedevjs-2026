import { Howl, Howler } from "howler";

export type MusicTrackId = "boss" | "level" | "menu";
export type MusicCue = MusicTrackId | "silence";

export interface AudioMixSettings {
  masterSoundEnabled: boolean;
  masterVolume: number;
  musicSoundEnabled: boolean;
  musicVolume: number;
}

interface MusicTrackConfig {
  baseVolume: number;
  src: string[];
}

interface ActiveMusic {
  howl: Howl;
  id: number;
  trackId: MusicTrackId;
}

export interface MusicTransitionOptions {
  fadeInMs?: number;
  fadeOutMs?: number;
  restart?: boolean;
  startDelayMs?: number;
}

const musicTracks: Record<MusicTrackId, MusicTrackConfig> = {
  boss: {
    baseVolume: 0.82,
    src: ["/audio/music/boss-cold-gear-override.mp3"],
  },
  level: {
    baseVolume: 0.78,
    src: ["/audio/music/level-industrial-ambient.mp3"],
  },
  menu: {
    baseVolume: 0.7,
    src: ["/audio/music/menu-colossal-weight.mp3"],
  },
};

const defaultAudioMix: AudioMixSettings = {
  masterSoundEnabled: true,
  masterVolume: 0.86,
  musicSoundEnabled: true,
  musicVolume: 0.72,
};

const clamp01 = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

class GameMusicManager {
  #active: ActiveMusic | null = null;
  readonly #howls = new Map<MusicTrackId, Howl>();
  #mix: AudioMixSettings = defaultAudioMix;
  #pendingTrackId: MusicTrackId | null = null;
  #transitionToken = 0;

  syncMix(settings: AudioMixSettings) {
    this.#mix = {
      masterSoundEnabled: settings.masterSoundEnabled,
      masterVolume: clamp01(settings.masterVolume),
      musicSoundEnabled: settings.musicSoundEnabled,
      musicVolume: clamp01(settings.musicVolume),
    };

    if (typeof window === "undefined") {
      return;
    }

    Howler.volume(this.#mix.masterSoundEnabled ? this.#mix.masterVolume : 0);
    this.#applyActiveVolume();
  }

  preload() {
    if (typeof window === "undefined") {
      return;
    }

    for (const trackId of Object.keys(musicTracks) as MusicTrackId[]) {
      this.#getHowl(trackId);
    }
  }

  async unlock() {
    if (typeof window === "undefined") {
      return;
    }

    const context = Howler.ctx;

    if (context?.state === "suspended") {
      await context.resume();
    }
  }

  playCue(cue: MusicCue, options: MusicTransitionOptions = {}) {
    if (cue === "silence") {
      this.stop(options.fadeOutMs ?? 900);
      return;
    }

    this.play(cue, options);
  }

  play(trackId: MusicTrackId, options: MusicTransitionOptions = {}) {
    if (typeof window === "undefined") {
      return;
    }

    const fadeInMs = options.fadeInMs ?? 1100;
    const fadeOutMs = options.fadeOutMs ?? 850;
    const startDelayMs = options.startDelayMs ?? 0;
    const active = this.#active;

    if (
      (active?.trackId === trackId || this.#pendingTrackId === trackId) &&
      !options.restart
    ) {
      this.#applyActiveVolume();
      return;
    }

    this.#transitionToken += 1;
    const token = this.#transitionToken;

    this.#pendingTrackId = null;

    if (active) {
      this.#fadeOut(active, fadeOutMs, token);
    }

    if (active?.trackId === trackId && options.restart) {
      this.#scheduleStart(
        trackId,
        fadeInMs,
        Math.max(startDelayMs, Math.min(fadeOutMs, 520)),
        token
      );
      return;
    }

    this.#scheduleStart(trackId, fadeInMs, startDelayMs, token);
  }

  stop(fadeOutMs = 850) {
    if (typeof window === "undefined" || !this.#active) {
      return;
    }

    this.#transitionToken += 1;
    const token = this.#transitionToken;
    const active = this.#active;

    this.#active = null;
    this.#pendingTrackId = null;
    this.#fadeOut(active, fadeOutMs, token);
  }

  #applyActiveVolume() {
    if (!this.#active) {
      return;
    }

    this.#active.howl.volume(
      this.#targetVolume(this.#active.trackId),
      this.#active.id
    );
  }

  #fadeOut(active: ActiveMusic, fadeOutMs: number, token: number) {
    const currentVolume = active.howl.volume(active.id);

    if (fadeOutMs <= 0) {
      active.howl.stop(active.id);
      return;
    }

    active.howl.fade(
      typeof currentVolume === "number" ? currentVolume : 0,
      0,
      fadeOutMs,
      active.id
    );

    window.setTimeout(() => {
      active.howl.stop(active.id);

      if (this.#active === active && this.#transitionToken === token) {
        this.#active = null;
      }
    }, fadeOutMs + 80);
  }

  #getHowl(trackId: MusicTrackId) {
    const cached = this.#howls.get(trackId);

    if (cached) {
      return cached;
    }

    let howl: Howl;

    howl = new Howl({
      loop: true,
      onplayerror: (soundId) => {
        howl.once("unlock", () => {
          howl.play(soundId);
        });
      },
      preload: true,
      src: musicTracks[trackId].src,
      volume: 0,
    });

    this.#howls.set(trackId, howl);
    return howl;
  }

  #scheduleStart(
    trackId: MusicTrackId,
    fadeInMs: number,
    startDelayMs: number,
    token: number
  ) {
    this.#pendingTrackId = trackId;

    if (startDelayMs <= 0) {
      this.#start(trackId, fadeInMs);
      return;
    }

    window.setTimeout(() => {
      if (this.#transitionToken !== token) {
        return;
      }

      this.#start(trackId, fadeInMs);
    }, startDelayMs);
  }

  #start(trackId: MusicTrackId, fadeInMs: number) {
    const howl = this.#getHowl(trackId);
    const soundId = howl.play();
    const targetVolume = this.#targetVolume(trackId);

    howl.seek(0, soundId);
    howl.volume(0, soundId);
    this.#pendingTrackId = null;

    this.#active = {
      howl,
      id: soundId,
      trackId,
    };

    if (fadeInMs <= 0) {
      howl.volume(targetVolume, soundId);
      return;
    }

    howl.fade(0, targetVolume, fadeInMs, soundId);
  }

  #targetVolume(trackId: MusicTrackId) {
    if (!this.#mix.musicSoundEnabled) {
      return 0;
    }

    return clamp01(this.#mix.musicVolume) * musicTracks[trackId].baseVolume;
  }
}

export const gameMusic = new GameMusicManager();
