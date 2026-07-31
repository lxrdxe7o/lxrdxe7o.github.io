import { clampGain, type AudioBusId } from './types';

/**
 * Bounded gain staging. Every clip's output is the product of its own gain,
 * its bus gain and the master gain, so no combination can exceed the ceiling
 * set here.
 */
export class AudioBus {
  private gain: number;

  constructor(
    readonly id: AudioBusId,
    initialGain: number,
    /** Hard ceiling so a mixing mistake cannot produce a painful level. */
    readonly ceiling: number = 1,
  ) {
    this.gain = Math.min(clampGain(initialGain), clampGain(ceiling));
  }

  get value(): number {
    return this.gain;
  }

  set(value: number): number {
    this.gain = Math.min(clampGain(value), clampGain(this.ceiling));
    return this.gain;
  }
}

export class AudioBusGraph {
  private readonly buses: Map<AudioBusId, AudioBus>;

  constructor() {
    this.buses = new Map<AudioBusId, AudioBus>([
      ['master', new AudioBus('master', 0.85, 0.9)],
      // Ambience stays well below interface cues so it never masks feedback.
      ['ambience', new AudioBus('ambience', 0.4, 0.55)],
      ['interface', new AudioBus('interface', 0.6, 0.75)],
      ['transition', new AudioBus('transition', 0.5, 0.7)],
    ]);
  }

  bus(id: AudioBusId): AudioBus {
    const bus = this.buses.get(id);
    if (!bus) throw new Error(`Unknown audio bus: ${id}`);
    return bus;
  }

  /** Final output gain for a clip on the given bus. */
  resolve(busId: Exclude<AudioBusId, 'master'>, clipGain: number): number {
    return clampGain(clampGain(clipGain) * this.bus(busId).value * this.bus('master').value);
  }

  setBusGain(busId: AudioBusId, value: number): number {
    return this.bus(busId).set(value);
  }
}
