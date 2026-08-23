import { AssetManager } from './assets/AssetManager';
import { summarizeFailures } from './assets/fallback-policy';
import { createBrowserImageLoader, createLoaders } from './assets/loaders';
import {
  SHARED_SCOPE,
  assetsForRoute,
  criticalSharedAssets,
  routeScopeFor,
} from './assets/route-assets';
import { AUDIO_MANIFEST } from './audio/audio-manifest';
import { AudioManager } from './audio/AudioManager';
import type { AudioEngine } from './audio/types';
import { getFrameBus } from './core/frame-bus';
import { getExperienceRuntime } from './core/runtime-singleton';
import type { RuntimeSnapshot } from './core/types';
import { InputManager, createBrowserInputEnvironment } from './input/InputManager';
import { connectAstroNavigation } from './navigation/astro-events';
import {
  FocusManager,
  createLiveRegionAnnouncer,
  type FocusDocument,
} from './navigation/focus-manager';
import { HistoryState, createBrowserHistoryAdapter } from './navigation/history-state';
import { NavigationController } from './navigation/NavigationController';
import { createDeviceHints, readDeviceEnvironment } from './quality/device-hints';
import { QualityController } from './quality/QualityController';
import { ScrollManager, createBrowserScrollEnvironment } from './scroll/ScrollManager';
import type { SmoothScrollInstance } from './scroll/ScrollManager';
import {
  createImmediateAnimator,
  createMotionAnimator,
  type AnimationTarget,
  type DomAnimator,
} from './transitions/DomTransition';
import { createInertBlendTarget } from './transitions/RenderTransition';
import { TransitionController } from './transitions/TransitionController';

const BOOTSTRAP_FLAG = 'experienceBootstrap';

/**
 * Wires the client runtime into the persistent shell exactly once.
 *
 * The renderer and its single animation frame loop are owned by
 * `ExperienceCanvas`; this connects everything else — input, scroll, adaptive
 * quality, real asset loading, opt-in audio, and route transitions — to the
 * one authoritative runtime state machine.
 *
 * Every listener created here is registered as a runtime teardown, so
 * `runtime.destroy()` fully detaches the experience.
 */
export function bootstrapExperience(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const root = document.documentElement;
  if (root.dataset[BOOTSTRAP_FLAG] === 'true') return;
  root.dataset[BOOTSTRAP_FLAG] = 'true';

  const runtime = getExperienceRuntime();
  // Idempotent: ExperienceCanvas may already have booted the runtime.
  runtime.boot();

  // The Site Index component reads this bridge to keep modal state inside the
  // one authoritative runtime instead of a second competing boolean.
  (window as unknown as { __lxrdxe7oRuntime?: unknown }).__lxrdxe7oRuntime = {
    setIndexOpen: (open: boolean) => runtime.setIndexOpen(open),
  };

  const frameBus = getFrameBus();
  const readSnapshot = (): RuntimeSnapshot => runtime.getSnapshot();

  /* ---------------------------------------------------------------- input */

  const input = new InputManager(createBrowserInputEnvironment());
  input.start();

  /* -------------------------------------------------------------- quality */

  const quality = new QualityController({
    hints: createDeviceHints(readSnapshot().capabilities, readDeviceEnvironment()),
    onChange: (profile) => {
      runtime.setQualityTier(profile.tier);
    },
  });
  runtime.setQualityTier(quality.profile.tier);

  /* --------------------------------------------------------------- scroll */

  // Declared before `scroll` because the policy callback reads it during
  // `scroll.start()`; Lenis is assigned later, after its dynamic import.
  let smoothScrollFactory: (() => SmoothScrollInstance) | null = null;

  const scroll = new ScrollManager({
    environment: createBrowserScrollEnvironment(() => readSections()),
    readPolicyInput: () => ({
      capabilities: readSnapshot().capabilities,
      modality: input.getSnapshot().modality,
      smoothScrollSupported: smoothScrollFactory !== null,
      nestedScrollRegionActive: document.querySelector('[data-nested-scroll]:hover') !== null,
      scrollLocked: readSnapshot().indexState === 'open',
    }),
    createSmoothScroll: () => smoothScrollFactory?.() ?? null,
  });
  scroll.start();

  /* --------------------------------------------------------------- assets */

  const assets = new AssetManager({
    loaders: createLoaders({
      fetch: window.fetch.bind(window),
      loadImage: createBrowserImageLoader(),
    }),
    reducedData: readSnapshot().capabilities.reducedData,
  });

  const releaseProgress = assets.onProgress((progress) => {
    const percent = Math.round(progress.ratio * 100);
    for (const element of document.querySelectorAll<HTMLElement>('[data-loader]')) {
      element.dataset.loaderState = progress.ratio >= 1 ? 'complete' : 'loading';
      element.dataset.loaderDeterminate = String(progress.determinate);
      const bar = element.querySelector<HTMLElement>('[data-loader-bar]');
      if (bar) {
        bar.style.setProperty('--loader-progress', String(progress.ratio));
        bar.setAttribute('aria-valuenow', String(percent));
      }
      const value = element.querySelector<HTMLElement>('[data-loader-value]');
      if (value) value.textContent = `${percent}`;
    }
  });

  /* ---------------------------------------------------------------- audio */

  let audioEngineFactory: (() => AudioEngine) | null = null;
  const audio = new AudioManager({
    manifest: AUDIO_MANIFEST,
    createEngine: () => {
      if (!audioEngineFactory) throw new Error('Audio engine is not loaded');
      return audioEngineFactory();
    },
    onFailure: (clipId, reason) => {
      root.dataset.audioFailure = `${clipId}:${reason}`;
    },
  });

  /* --------------------------------------------------- focus and history */

  const announcerElement = document.querySelector<HTMLElement>('[data-runtime-announcer]');
  const focus = new FocusManager(
    document as unknown as FocusDocument,
    announcerElement ? createLiveRegionAnnouncer(announcerElement) : undefined,
  );
  const history = new HistoryState(createBrowserHistoryAdapter());

  /* ----------------------------------------------------------- transitions */

  let animator: DomAnimator = createImmediateAnimator();
  const transitions = new TransitionController({
    animator: (target, keyframes, options) => animator(target, keyframes, options),
    // The persistent canvas blends scene state rather than compositing a
    // second renderer; static and low tiers use an inert target.
    blendTarget: createInertBlendTarget(),
    clock: {
      now: () => performance.now(),
      requestFrame: (callback) => window.requestAnimationFrame(callback),
      cancelFrame: (handle) => window.cancelAnimationFrame(handle),
    },
    resolveContentTarget: () =>
      document.querySelector<HTMLElement>('#main-content') as AnimationTarget | null,
    setInteractionBlocked: (blocked) => {
      const layer = document.querySelector<HTMLElement>('[data-transition-layer]');
      if (layer) layer.dataset.blocking = String(blocked);
      root.toggleAttribute('data-navigating', blocked);
    },
  });

  const navigation = new NavigationController({
    runtime,
    transitions,
    focus,
    history,
    assets,
    scroll,
    audio,
    resolveAssets: (route) => assetsForRoute(route),
    resolveScope: (route) => routeScopeFor(route),
    readDocumentTitle: () => document.title,
  });

  const releaseAstro = connectAstroNavigation({
    target: document as unknown as Parameters<typeof connectAstroNavigation>[0]['target'],
    navigation,
    history,
    readLocation: () => ({ pathname: location.pathname, hash: location.hash }),
    onError: (reason) => {
      root.dataset.navigationFailure = reason;
    },
  });

  /* ------------------------------------------------------------ frame work */

  const releaseFrames = frameBus.subscribe((frame) => {
    input.tick(frame.time);
    scroll.tick(frame.time);
    if (quality.sampleFrame(frame.time)) {
      root.dataset.qualityTier = quality.profile.tier;
    }
  });

  /* ----------------------------------------------------- runtime reactions */

  let lastPhase = readSnapshot().phase;
  let lastIndexOpen = readSnapshot().indexState === 'open';
  const releaseRuntime = runtime.subscribe((snapshot) => {
    root.dataset.runtimePhase = snapshot.phase;
    root.dataset.qualityTier = snapshot.qualityTier;
    assets.setReducedData(snapshot.capabilities.reducedData);
    quality.setCapabilities(snapshot.capabilities);

    const indexOpen = snapshot.indexState === 'open';
    if (indexOpen !== lastIndexOpen) {
      lastIndexOpen = indexOpen;
      scroll.setScrollLocked(indexOpen);
    }

    if (snapshot.phase !== lastPhase) {
      lastPhase = snapshot.phase;
      if (snapshot.phase === 'entry-gate') revealEntryGate();
      if (snapshot.phase === 'active') hideLoaderAndGate();
      if (snapshot.phase === 'degraded') {
        hideLoaderAndGate();
        revealRuntimeFallback();
      }
    }

    audio.setMuted(snapshot.audioState === 'muted');
    syncMuteControls(snapshot);
  });

  /* ------------------------------------------------------- visibility/audio */

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') audio.suspend();
    else audio.resume();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  /* --------------------------------------------------- interactive sound cues */

  const onSoundHover = (event: Event) => {
    const el = event.target as Element;
    if (el && typeof el.closest === 'function') {
      const target = el.closest<HTMLElement>('[data-sound]');
      if (target) {
        audio.playCue('cue-hover');
      }
    }
  };

  const onSoundClick = (event: Event) => {
    const el = event.target as Element;
    if (el && typeof el.closest === 'function') {
      const target = el.closest<HTMLElement>('[data-sound-click]');
      if (target) {
        audio.playCue('cue-select');
      }
    }
  };

  document.addEventListener('mouseenter', onSoundHover, { capture: true, passive: true });
  document.addEventListener('click', onSoundClick, { capture: true, passive: true });

  /* --------------------------------------------------------- entry gate UI */

  function revealEntryGate(): void {
    const gate = document.querySelector<HTMLElement>('[data-entry-gate]');
    if (!gate) {
      // Without a gate the silent path is the only honest default.
      runtime.enter('silent');
      return;
    }
    gate.hidden = false;
    gate.dataset.state = 'open';
    gate.querySelector<HTMLElement>('[data-entry="silent"]')?.focus();
  }

  function revealRuntimeFallback(): void {
    const fallback = document.querySelector<HTMLElement>('[data-runtime-fallback]');
    if (!fallback) return;
    // `hidden` has an !important rule in base.css; remove the attribute so
    // the degraded-phase layout can actually show the notice.
    fallback.hidden = false;
  }

  function hideLoaderAndGate(): void {
    const gate = document.querySelector<HTMLElement>('[data-entry-gate]');
    if (gate) {
      gate.hidden = true;
      gate.dataset.state = 'closed';
    }
    // The loader has served its purpose; remove it rather than leaving a
    // hidden progressbar with stale semantics in the accessibility tree.
    for (const loader of document.querySelectorAll<HTMLElement>('[data-loader]')) {
      loader.remove();
    }
    // Focus leaves the removed gate and returns to the document start, so
    // the first tab stop is the skip link and keyboard users land where the
    // document begins. FocusManager restores focus on navigation afterward.
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('[data-entry-gate]')) {
      active.blur();
    }
  }

  const onEntryClick = (event: Event) => {
    const el = event.target as Element; const control = (el && typeof el.closest === 'function') ? el.closest<HTMLElement>('[data-entry]') : null;
    if (!control) return;
    const mode = control.dataset.entry === 'sound' ? 'sound' : 'silent';
    void enter(mode);
  };
  document.addEventListener('click', onEntryClick);

  async function enter(mode: 'sound' | 'silent'): Promise<void> {
    if (mode === 'sound') {
      try {
        // Loaded only after an explicit choice, so silent entry never
        // downloads or initialises the audio library at all.
        const module = await import('./audio/howler-engine');
        audioEngineFactory = module.createHowlerEngine;
      } catch {
        audioEngineFactory = null;
      }
    }

    runtime.enter(mode);
    
    // Prevent ghost clicks on touch devices that might activate the center-cta underneath
    document.body.style.pointerEvents = 'none';
    setTimeout(() => {
      document.body.style.pointerEvents = '';
    }, 400);

    if (mode !== 'sound') return;

    audio.setMode('enabled');
    if (audio.unlock()) audio.crossfadeRoute(readSnapshot().route);
  }


  /* ------------------------------------------------------------ mute control */

  const onMuteClick = (event: Event) => {
    const el2 = event.target as Element; const control = (el2 && typeof el2.closest === 'function') ? el2.closest<HTMLElement>('[data-mute-control]') : null;
    if (!control) return;
    runtime.setMuted(readSnapshot().audioState !== 'muted');
  };
  document.addEventListener('click', onMuteClick);

  function syncMuteControls(snapshot: RuntimeSnapshot): void {
    const muted = snapshot.audioState === 'muted';
    const available = snapshot.entryMode === 'sound';
    for (const control of document.querySelectorAll<HTMLElement>('[data-mute-control]')) {
      control.hidden = !available;
      control.setAttribute('aria-pressed', String(muted));
      control.dataset.muted = String(muted);
      const label = muted ? 'Unmute sound' : 'Mute sound';
      control.setAttribute('aria-label', label);
      const text = control.querySelector<HTMLElement>('[data-mute-label]');
      if (text) text.textContent = muted ? 'Sound off' : 'Sound on';
    }
  }

  function readSections() {
    return [...document.querySelectorAll<HTMLElement>('[data-scroll-section]')].map(
      (element) => ({
        id: element.dataset.scrollSection ?? element.id,
        start: element.offsetTop,
        end: element.offsetTop + element.offsetHeight,
      }),
    );
  }

  /* --------------------------------------------------------- critical load */

  void (async () => {
    try {
      const module = await import('motion');
      animator = createMotionAnimator(
        module.animate as unknown as Parameters<typeof createMotionAnimator>[0],
      );
    } catch {
      // Immediate animator already provides an accessible, working fallback.
    }

    try {
      const lenis = await import('lenis');
      const Lenis = lenis.default;
      smoothScrollFactory = () =>
        new Lenis({ autoRaf: false }) as unknown as SmoothScrollInstance;
      scroll.applyPolicy();
    } catch {
      smoothScrollFactory = null;
    }

    const controller = new AbortController();
    runtime.registerTeardown(() => controller.abort());

    const result = await assets.loadScope(
      SHARED_SCOPE,
      criticalSharedAssets(),
      controller.signal,
    );

    if (result.cancelled) return;
    const notice = summarizeFailures(result.failures);
    if (notice) root.dataset.assetNotice = notice;

    // Only now can the gate open: progress reflected real bytes settling.
    runtime.completeLoading();
  })();

  /* -------------------------------------------------------------- teardown */

  runtime.registerTeardown(() => {
    releaseFrames();
    releaseRuntime();
    releaseProgress();
    releaseAstro();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    document.removeEventListener('click', onEntryClick);
    document.removeEventListener('click', onMuteClick);
    navigation.destroy();
    transitions.destroy();
    scroll.destroy();
    input.destroy();
    assets.destroy();
    audio.destroy();
    quality.destroy();
    delete root.dataset[BOOTSTRAP_FLAG];
  });
}
