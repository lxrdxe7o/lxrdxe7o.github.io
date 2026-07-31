import type { PreferenceAdapter, StoredSoundPreference } from './types';

const SOUND_PREFERENCE_KEY = 'lxrdxe7o:sound-preference';

export class BrowserPreferenceAdapter implements PreferenceAdapter {
  readSoundPreference(): StoredSoundPreference {
    if (typeof window === 'undefined') return null;
    try {
      const preference = window.localStorage.getItem(SOUND_PREFERENCE_KEY);
      return preference === 'sound' || preference === 'silent' ? preference : null;
    } catch {
      return null;
    }
  }

  writeSoundPreference(preference: 'sound' | 'silent'): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SOUND_PREFERENCE_KEY, preference);
    } catch {
      // Storage can be unavailable in private or restricted browsing contexts.
    }
  }
}
