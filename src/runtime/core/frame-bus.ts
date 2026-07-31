import type { Frame } from '../rendering/types';

export type FrameSubscriber = (frame: Frame) => void;

/**
 * The renderer owns the only `requestAnimationFrame` loop in the application.
 * Everything else that needs per-frame work — pointer decay, smooth scrolling,
 * quality sampling — subscribes here instead of starting its own loop.
 */
export class FrameBus {
  private readonly subscribers = new Set<FrameSubscriber>();

  subscribe(subscriber: FrameSubscriber): () => void {
    this.subscribers.add(subscriber);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.subscribers.delete(subscriber);
    };
  }

  publish(frame: Frame): void {
    for (const subscriber of [...this.subscribers]) {
      try {
        subscriber(frame);
      } catch {
        // One misbehaving consumer must not stop the render loop.
        this.subscribers.delete(subscriber);
      }
    }
  }

  get size(): number {
    return this.subscribers.size;
  }

  clear(): void {
    this.subscribers.clear();
  }
}

let sharedFrameBus: FrameBus | null = null;

export function getFrameBus(): FrameBus {
  sharedFrameBus ??= new FrameBus();
  return sharedFrameBus;
}

export function resetFrameBusForTests(): void {
  sharedFrameBus?.clear();
  sharedFrameBus = null;
}
