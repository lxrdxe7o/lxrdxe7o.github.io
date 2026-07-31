import { Howl, Howler } from 'howler';
import type { AudioClipDefinition, AudioClipHandle, AudioEngine } from './types';

/**
 * Howler-backed engine. This module is imported dynamically from the audio
 * bootstrap so that choosing silent entry never downloads or initialises the
 * audio library at all.
 */
export function createHowlerEngine(): AudioEngine {
  const created: Howl[] = [];

  return {
    createClip(definition: AudioClipDefinition): AudioClipHandle {
      const howl = new Howl({
        src: [...definition.sources],
        loop: definition.loop,
        volume: 0,
        // Ambience streams; short cues are decoded fully for tight timing.
        html5: definition.loop,
        preload: definition.preload,
      });
      created.push(howl);

      let activeId: number | null = null;

      return {
        play: () => {
          activeId = howl.play(activeId ?? undefined);
          return activeId;
        },
        stop: () => {
          howl.stop();
          activeId = null;
        },
        fade: (from, to, durationMs) => {
          if (durationMs <= 0) {
            howl.volume(to);
            return;
          }
          howl.fade(from, to, durationMs);
        },
        volume: (value) => howl.volume(value),
        playing: () => howl.playing(),
        unload: () => {
          howl.stop();
          howl.unload();
        },
      };
    },
    setMuted(muted: boolean) {
      Howler.mute(muted);
    },
    suspend() {
      // Howler exposes the shared context; suspending stops all output.
      void Howler.ctx?.suspend();
    },
    resume() {
      void Howler.ctx?.resume();
    },
    destroy() {
      for (const howl of created.splice(0)) {
        try {
          howl.stop();
          howl.unload();
        } catch {
          // Continue unloading the rest.
        }
      }
      Howler.unload();
    },
  };
}
