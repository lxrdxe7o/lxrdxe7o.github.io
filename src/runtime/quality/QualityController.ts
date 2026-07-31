import type { CapabilityFlags, QualityTier } from '../core/types';
import { FrameBudgetMonitor } from './FrameBudgetMonitor';
import { createDeviceHints, selectCeilingTier, selectStartupTier } from './device-hints';
import { higherTier, lowerTier, profileFor, tierIndex } from './quality-presets';
import {
  isStaticForced,
  type DeviceHints,
  type QualityClock,
  type QualityControllerOptions,
  type QualityMetrics,
  type QualityProfile,
  type QualityProfileListener,
} from './types';

const DEFAULT_DOWNGRADE_AFTER_MS = 1_200;
/** Deliberately ~7x the downgrade window: recovery must be clearly earned. */
const DEFAULT_UPGRADE_AFTER_MS = 8_000;

/**
 * Owns the active rendering tier. It opens conservatively from capability
 * hints, then only moves on sustained measured evidence: one tier down after
 * continuous pressure, one tier up after a much longer continuous stable
 * interval. Reduced data and missing WebGL lock static regardless of GPU
 * behaviour.
 */
export class QualityController {
  private readonly clock: QualityClock;
  private readonly downgradeAfterMs: number;
  private readonly upgradeAfterMs: number;
  private readonly listeners = new Set<QualityProfileListener>();
  private readonly monitor: FrameBudgetMonitor;
  private hints: DeviceHints;
  private ceiling: QualityTier;
  private tier: QualityTier;
  private pressureSince: number | null = null;
  private stableSince: number | null = null;
  private destroyed = false;

  constructor(private readonly options: QualityControllerOptions) {
    this.clock = options.clock;
    this.hints = options.hints;
    this.downgradeAfterMs = options.downgradeAfterMs ?? DEFAULT_DOWNGRADE_AFTER_MS;
    this.upgradeAfterMs = options.upgradeAfterMs ?? DEFAULT_UPGRADE_AFTER_MS;
    this.ceiling = selectCeilingTier(this.hints);
    this.tier = selectStartupTier(this.hints);
    this.monitor = new FrameBudgetMonitor({
      targetFps: profileFor(this.tier).targetFps,
    });
  }

  getTier(): QualityTier {
    return this.tier;
  }

  getProfile(): QualityProfile {
    return profileFor(this.tier);
  }

  get staticLocked(): boolean {
    return isStaticForced(this.hints);
  }

  subscribe(listener: QualityProfileListener): () => void {
    if (this.destroyed) return () => undefined;
    this.listeners.add(listener);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.listeners.delete(listener);
    };
  }

  /**
   * Feeds one frame duration. Returns true when the tier changed, so callers
   * can apply the new profile at a safe scene boundary.
   */
  sampleFrame(frameMs: number): boolean {
    if (this.destroyed || this.staticLocked) return false;

    this.monitor.sample(frameMs);
    const report = this.monitor.report();
    const now = this.clock.now();

    if (report.pressure === 'pressured') {
      this.stableSince = null;
      this.pressureSince ??= now;
      if (now - this.pressureSince < this.downgradeAfterMs) return false;
      return this.applyTier(lowerTier(this.tier));
    }

    if (report.pressure === 'stable') {
      this.pressureSince = null;
      this.stableSince ??= now;
      if (now - this.stableSince < this.upgradeAfterMs) return false;
      const candidate = higherTier(this.tier, this.ceiling);
      if (candidate === this.tier) {
        // Already at the ceiling: keep the window open rather than churning.
        this.stableSince = now;
        return false;
      }
      return this.applyTier(candidate);
    }

    return false;
  }

  /** Re-evaluates hints when device capabilities change mid-session. */
  setCapabilities(capabilities: CapabilityFlags): boolean {
    if (this.destroyed) return false;
    this.hints = createDeviceHints(capabilities, {
      deviceMemory: this.hints.deviceMemoryGb ?? undefined,
      hardwareConcurrency: this.hints.hardwareConcurrency ?? undefined,
      saveData: this.hints.saveData,
      batterySensitive: this.hints.batterySensitive,
    });
    this.ceiling = selectCeilingTier(this.hints);

    if (this.staticLocked) return this.applyTier('static');

    if (this.tier === 'static') return this.applyTier(selectStartupTier(this.hints));
    if (tierIndex(this.tier) > tierIndex(this.ceiling)) return this.applyTier(this.ceiling);
    return false;
  }

  /** Forces static mode for runtime failures and explicit fallback choices. */
  forceStatic(): boolean {
    return this.applyTier('static');
  }

  getMetrics(): QualityMetrics {
    const profile = this.getProfile();
    return Object.freeze({
      tier: this.tier,
      dprCap: profile.dprCap,
      targetFps: profile.targetFps,
      frame: this.monitor.report(),
      cost: this.options.readCost?.() ?? null,
      staticLocked: this.staticLocked,
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.listeners.clear();
    this.monitor.reset();
  }

  private applyTier(next: QualityTier): boolean {
    if (next === this.tier) return false;
    this.tier = next;
    this.pressureSince = null;
    this.stableSince = null;
    // A fresh window prevents the samples that caused one change from
    // immediately justifying the opposite change.
    this.monitor.setTargetFps(profileFor(next).targetFps);
    this.monitor.reset();

    const profile = profileFor(next);
    for (const listener of [...this.listeners]) {
      try {
        listener(profile);
      } catch {
        this.listeners.delete(listener);
      }
    }
    return true;
  }
}
