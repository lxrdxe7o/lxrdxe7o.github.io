import type { CapabilityFlags, PointerCapability, QualityTier } from '../core/types';
import type { DeviceHints } from './types';

/**
 * The subset of `navigator` this module reads, declared as an interface so
 * tests supply plain objects and the module never touches a browser global
 * at import time.
 */
export interface DeviceEnvironment {
  readonly deviceMemory?: number;
  readonly hardwareConcurrency?: number;
  readonly saveData?: boolean;
  readonly batterySensitive?: boolean;
}

export function readDeviceEnvironment(): DeviceEnvironment {
  if (typeof navigator === 'undefined') return {};

  const candidate = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };

  return {
    deviceMemory:
      typeof candidate.deviceMemory === 'number' ? candidate.deviceMemory : undefined,
    hardwareConcurrency:
      typeof candidate.hardwareConcurrency === 'number'
        ? candidate.hardwareConcurrency
        : undefined,
    saveData: candidate.connection?.saveData === true,
  };
}

export function createDeviceHints(
  capabilities: CapabilityFlags,
  environment: DeviceEnvironment = {},
): DeviceHints {
  return Object.freeze({
    webgl: capabilities.webgl,
    reducedData: capabilities.reducedData,
    reducedMotion: capabilities.reducedMotion,
    pointer: capabilities.pointer,
    deviceMemoryGb:
      typeof environment.deviceMemory === 'number' ? environment.deviceMemory : null,
    hardwareConcurrency:
      typeof environment.hardwareConcurrency === 'number'
        ? environment.hardwareConcurrency
        : null,
    saveData: environment.saveData === true,
    batterySensitive: environment.batterySensitive === true,
  });
}

function isConstrained(hints: DeviceHints): boolean {
  if (hints.batterySensitive) return true;
  if (hints.deviceMemoryGb !== null && hints.deviceMemoryGb <= 4) return true;
  if (hints.hardwareConcurrency !== null && hints.hardwareConcurrency <= 4) return true;
  return false;
}

/**
 * Conservative opening tier derived only from capability hints. Measured
 * frame behaviour, not this function, is what earns a higher tier later.
 */
export function selectStartupTier(hints: DeviceHints): QualityTier {
  if (!hints.webgl || hints.reducedData || hints.saveData) return 'static';
  if (isConstrained(hints)) return 'low';

  const pointer: PointerCapability = hints.pointer;
  if (pointer === 'coarse' || pointer === 'none') return 'low';

  // A capable desktop still opens at medium and must prove it can hold 60 FPS.
  return 'medium';
}

/** The best tier this device is ever allowed to reach. */
export function selectCeilingTier(hints: DeviceHints): QualityTier {
  if (!hints.webgl || hints.reducedData || hints.saveData) return 'static';
  if (hints.pointer === 'coarse' || hints.pointer === 'none') return 'medium';
  if (isConstrained(hints)) return 'medium';
  return 'high';
}
