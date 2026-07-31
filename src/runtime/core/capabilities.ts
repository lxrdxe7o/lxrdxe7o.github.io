import type {
  CapabilityAdapter,
  CapabilityFlags,
  PointerCapability,
  RuntimeVisibility,
} from './types';

function mediaMatches(query: string): boolean {
  return typeof window !== 'undefined' && window.matchMedia(query).matches;
}

export function readCapabilityFlags(adapter: CapabilityAdapter): CapabilityFlags {
  return {
    reducedMotion: adapter.readReducedMotion(),
    reducedData: adapter.readReducedData(),
    pointer: adapter.readPointer(),
    webgl: adapter.readWebGL(),
    visibility: adapter.readVisibility(),
  };
}

export class BrowserCapabilityAdapter implements CapabilityAdapter {
  readReducedMotion(): boolean {
    return mediaMatches('(prefers-reduced-motion: reduce)');
  }

  readReducedData(): boolean {
    return mediaMatches('(prefers-reduced-data: reduce)');
  }

  readPointer(): PointerCapability {
    if (mediaMatches('(pointer: fine)')) return 'fine';
    if (mediaMatches('(pointer: coarse)')) return 'coarse';
    return 'none';
  }

  readWebGL(): boolean {
    if (typeof document === 'undefined') return false;
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (!context) return false;

      context.getExtension('WEBGL_lose_context')?.loseContext();
      return true;
    } catch {
      return false;
    }
  }

  readVisibility(): RuntimeVisibility {
    if (typeof document === 'undefined') return 'visible';
    return document.visibilityState === 'hidden' ? 'hidden' : 'visible';
  }

  subscribe(listener: () => void): () => void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return () => undefined;
    }

    const queries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-reduced-data: reduce)'),
      window.matchMedia('(pointer: fine)'),
      window.matchMedia('(pointer: coarse)'),
    ];

    for (const query of queries) query.addEventListener('change', listener);
    document.addEventListener('visibilitychange', listener);

    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const query of queries) query.removeEventListener('change', listener);
      document.removeEventListener('visibilitychange', listener);
    };
  }
}
