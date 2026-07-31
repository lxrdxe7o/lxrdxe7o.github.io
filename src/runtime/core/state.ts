import type {
  CapabilityFlags,
  QualityTier,
  RecoverableRuntimeError,
  RuntimeSnapshot,
} from './types';

export const DEFAULT_CAPABILITIES: CapabilityFlags = Object.freeze({
  reducedMotion: true,
  reducedData: true,
  pointer: 'none',
  webgl: false,
  visibility: 'visible',
});

export function selectQualityTier(capabilities: CapabilityFlags): QualityTier {
  if (!capabilities.webgl || capabilities.reducedData) return 'static';
  if (capabilities.reducedMotion || capabilities.pointer === 'none') return 'low';
  if (capabilities.pointer === 'coarse') return 'medium';
  return 'high';
}

export function freezeRuntimeSnapshot(snapshot: RuntimeSnapshot): RuntimeSnapshot {
  const capabilities = Object.freeze({ ...snapshot.capabilities });
  const recoverableError = snapshot.recoverableError
    ? Object.freeze({ ...snapshot.recoverableError })
    : null;

  return Object.freeze({ ...snapshot, capabilities, recoverableError });
}

export function createInitialRuntimeState(route: string): RuntimeSnapshot {
  return freezeRuntimeSnapshot({
    phase: 'idle',
    route,
    entryMode: null,
    entryPreference: null,
    audioState: 'unknown',
    indexState: 'closed',
    navigationTarget: null,
    qualityTier: 'static',
    capabilities: DEFAULT_CAPABILITIES,
    recoverableError: null,
  });
}

export function sameCapabilities(
  left: CapabilityFlags,
  right: CapabilityFlags,
): boolean {
  return (
    left.reducedMotion === right.reducedMotion &&
    left.reducedData === right.reducedData &&
    left.pointer === right.pointer &&
    left.webgl === right.webgl &&
    left.visibility === right.visibility
  );
}

export function copyError(error: RecoverableRuntimeError): RecoverableRuntimeError {
  return { code: error.code, message: error.message };
}
