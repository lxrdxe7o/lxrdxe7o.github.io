import type { CapabilityFlags, QualityTier } from '../core/types';
import { FrameBudgetMonitor } from './FrameBudgetMonitor';
import { createDeviceHints, selectCeilingTier, selectStartupTier } from './device-hints';
import { higherTier, lowerTier, profileFor, tierIndex } from './quality-presets';
import {
  isStaticForced,
  type DeviceHints,
  type FrameBudgetReport,
  type QualityControllerOptions,
  type QualityProfile,
} from './types';

const DEFAULT_DOWNGRADE_AFTER_MS = 1_200;
/** Deliberately ~7x the downgrade window: recovery must be clearly earned. */
const DEFAULT_RECOVERY_AFTER_MS = 8_000;
/** Evidence ignored after each tier change so one change never chases the next. */
const DEFAULT_COOLDOWN_MS = 500;

/**
 * Owns the active rendering tier. It opens conservatively from capability
 * hints, then only moves on sustained measured evidence: one tier down after
 * continuous pressure, one tier up after a much longer continuous stable
 * interval. `neutral` windows clear accumulated evidence, and a cooldown
 * after each change keeps the controller from oscillating. Reduced data and
 * missing WebGL lock static regardless of GPU behaviour.
 */
export class QualityController {
  private readonly downgradeAfterMs: number;
  private readonly recoveryAfterMs: number;
  private readonly cooldownMs: number;
  private readonly ceiling: QualityTier;
  private readonly monitor: FrameBudgetMonitor;
  private hints: DeviceHints;
  private tier: QualityTier;
  private pressureSince: number | null = null;
  private stableSince: number | null = null;
  private cooldownUntil = 0;
  private destroyed = false;

  constructor(private readonly options: QualityControllerOptions) {
    this.hints = options.hints;
    this.downgradeAfterMs = options.downgradeAfterMs ?? DEFAULT_DOWNGRADE_AFTER_MS;
    this.recoveryAfterMs = options.recoveryAfterMs ?? DEFAULT_RECOVERY_AFTER_MS;
    this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.ceiling = selectCeilingTier(this.hints);
    this.tier = this.resolveInitialTier();
    this.monitor = new FrameBudgetMonitor({
      targetFps: profileFor(this.tier).targetFps,
    });
  }

  get profile(): QualityProfile {
    return profileFor(this.tier);
  }

  get staticLocked(): boolean {
    return isStaticForced(this.hints);
  }

  /** Feeds one frame-budget report and applies the profile when it changes. */
  observe(report: FrameBudgetReport): boolean {
    if (this.destroyed || this.staticLocked) return false;
    if (report.timestamp < this.cooldownUntil) return false;

    if (report.state === 'pressured') {
      this.stableSince = null;
      this.pressureSince ??= report.timestamp;
      if (report.timestamp - this.pressureSince < this.downgradeAfterMs) return false;
      return this.applyTier(lowerTier(this.tier), report.timestamp);
    }

    if (report.state === 'stable') {
      this.pressureSince = null;
      this.stableSince ??= report.timestamp;
      if (report.timestamp - this.stableSince < this.recoveryAfterMs) return false;
      const candidate = higherTier(this.tier, this.ceiling);
      if (candidate === this.tier) {
        // Already at the ceiling: keep the window open rather than churning.
        this.stableSince = report.timestamp;
        return false;
      }
      return this.applyTier(candidate, report.timestamp);
    }

    // `unknown` and `neutral` windows hold no directional evidence; they
    // reset accumulated pressure/stability so a tier move must be continuous.
    this.pressureSince = null;
    this.stableSince = null;
    return false;
  }

  /** Re-evaluates hints when device capabilities change mid-session. */
  updateHints(hints: DeviceHints, timestamp: number): boolean {
    if (this.destroyed) return false;
    const changed = JSON.stringify(hints) !== JSON.stringify(this.hints);
    this.hints = hints;
    if (!changed) return false;

    this.cooldownUntil = timestamp + this.cooldownMs;
    if (this.staticLocked) return this.applyTier('static', timestamp);
    if (tierIndex(this.tier) > tierIndex(selectCeilingTier(hints))) {
      return this.applyTier(selectCeilingTier(hints), timestamp);
    }
    if (this.tier === 'static') return this.applyTier(selectStartupTier(hints), timestamp);
    return false;
  }

  setCapabilities(capabilities: CapabilityFlags): boolean {
    return this.updateHints(
      createDeviceHints(capabilities, {
        deviceMemory: this.hints.deviceMemoryGb ?? undefined,
        hardwareConcurrency: this.hints.hardwareConcurrency ?? undefined,
        saveData: this.hints.saveData,
        batterySensitive: this.hints.batterySensitive,
      }),
      Date.now(),
    );
  }

  /** Forces static mode for runtime failures and explicit fallback choices. */
  forceStatic(): boolean {
    return this.applyTier('static', Date.now());
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.monitor.reset();
  }

  /** Records one frame timestamp into the internal monitor and observes it. */
  sampleFrame(timestamp: number): boolean {
    return this.observe(this.monitor.record(timestamp));
  }

  private resolveInitialTier(): QualityTier {
    if (this.staticLocked) return 'static';
    const requested = this.options.initialTier;
    if (requested === undefined) return this.ceiling;
    const ceilingIndex = tierIndex(this.ceiling);
    return tierIndex(requested) > ceilingIndex ? this.ceiling : requested;
  }

  private applyTier(next: QualityTier, timestamp: number): boolean {
    if (next === this.tier) return false;
    const previous = profileFor(this.tier);
    this.tier = next;
    this.pressureSince = null;
    this.stableSince = null;
    this.cooldownUntil = timestamp + this.cooldownMs;
    this.monitor.setTargetFps(profileFor(next).targetFps);
    this.monitor.reset();

    const profile = profileFor(next);
    try {
      this.options.onChange?.(profile, previous);
    } catch {
      // A listener failure must not corrupt adaptation state.
    }
    return true;
  }
}
