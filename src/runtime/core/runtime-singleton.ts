import { BrowserCapabilityAdapter } from './capabilities';
import { ExperienceRuntime, type ExperienceRuntimeOptions } from './ExperienceRuntime';
import { BrowserPreferenceAdapter } from './preferences';

let runtime: ExperienceRuntime | null = null;

function defaultOptions(): ExperienceRuntimeOptions {
  return {
    route: '/',
    adapters: {
      capabilities: new BrowserCapabilityAdapter(),
      preferences: new BrowserPreferenceAdapter(),
    },
  };
}

export function getExperienceRuntime(
  options?: ExperienceRuntimeOptions,
): ExperienceRuntime {
  if (runtime === null) runtime = new ExperienceRuntime(options ?? defaultOptions());
  return runtime;
}

export function resetExperienceRuntimeForTests(): void {
  runtime?.destroy();
  runtime = null;
}
