import { MobilityProfileCode, Place, SavedRoute, IceContact } from '../types';

const MIGRATION_KEY = 'accessroute_v1_migration_done';
const SAVED_PLACES_KEY = 'accessroute_saved_places';
const RECENT_TRIPS_KEY = 'accessroute_recent_trips';
const SAVED_ROUTES_KEY = 'accessroute_saved_routes';
const ICE_CONTACT_KEY = 'accessroute_ice_contact';
const PREFERRED_PROFILE_KEY = 'accessroute_preferred_profile';
const VOICE_ONBOARDING_DONE_KEY = 'accessroute_voice_onboarding_completed';
const VOICE_ENABLED_KEY = 'accessroute_voice_enabled';
const SIDEBAR_COLLAPSED_KEY = 'accessroute_sidebar_collapsed';
const SPEECH_RATE_KEY = 'accessroute_speech_rate';
const SPEECH_MUTED_KEY = 'accessroute_speech_muted';
const PREFERRED_VOICE_KEY = 'accessroute_preferred_voice';

/**
 * One-time legacy cleanup to safely remove old demo/dev keys without
 * clearing legitimate production user data on every reload.
 */
export function migrateLegacyStorage(): void {
  try {
    if (typeof window === 'undefined') return;
    
    // Check if migration has already run
    const migrated = localStorage.getItem(MIGRATION_KEY);
    if (migrated === 'true') return;

    // List of known legacy / demo / development keys to purge
    const legacyKeysToPurge = [
      'accessroute_demo_routes',
      'accessroute_demo_places',
      'accessroute_dev_mode',
      'accessroute_mock_data',
      'accessroute_sample_trips',
      'old_accessroute_state',
      'accessroute_voice_first_mode',
      'voiceEnabled',
      'voiceAssistantEnabled',
      'voiceMode',
      'voiceOnboardingComplete',
      'voicePreference',
      'microphoneEnabled',
      'speechEnabled',
    ];

    // Remove legacy keys
    legacyKeysToPurge.forEach((k) => localStorage.removeItem(k));

    // Also remove any key matching demo/mock pattern
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('accessroute_demo_') ||
        key.startsWith('accessroute_dev_') ||
        key.startsWith('accessroute_mock_') ||
        key.startsWith('accessroute_sample_') ||
        key.startsWith('old_accessroute_')
      )) {
        localStorage.removeItem(key);
      }
    }

    localStorage.setItem(MIGRATION_KEY, 'true');
  } catch (e) {
    console.debug('Storage migration exception:', e);
  }
}

// Saved Places
export function getSavedPlaces(): Place[] {
  try {
    const raw = localStorage.getItem(SAVED_PLACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePlaceToStorage(place: Place): Place[] {
  try {
    const current = getSavedPlaces();
    const existingIndex = current.findIndex((p) => p.id === place.id);
    let updated: Place[];
    if (existingIndex >= 0) {
      updated = current.map((p) => (p.id === place.id ? place : p));
    } else {
      updated = [place, ...current];
    }
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeSavedPlaceFromStorage(placeId: string): Place[] {
  try {
    const current = getSavedPlaces();
    const updated = current.filter((p) => p.id !== placeId);
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

// Recent Trips
export function getRecentTrips(): Place[] {
  try {
    const raw = localStorage.getItem(RECENT_TRIPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentTripToStorage(place: Place): Place[] {
  try {
    const current = getRecentTrips();
    const filtered = current.filter((p) => p.id !== place.id);
    const updated = [place, ...filtered].slice(0, 10);
    localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

// Preferred Mobility Profile
export function getSavedProfile(): MobilityProfileCode | null {
  try {
    const saved = localStorage.getItem(PREFERRED_PROFILE_KEY) as MobilityProfileCode;
    if (saved && ['wheelchair', 'vision', 'pram_elderly', 'walking', 'car', 'scooter'].includes(saved)) {
      return saved;
    }
  } catch {}
  return null;
}

export function saveProfileToStorage(profile: MobilityProfileCode): void {
  try {
    localStorage.setItem(PREFERRED_PROFILE_KEY, profile);
  } catch {}
}

// Voice Onboarding State
export function isVoiceOnboardingComplete(): boolean {
  try {
    return localStorage.getItem(VOICE_ONBOARDING_DONE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setVoiceOnboardingComplete(completed: boolean): void {
  try {
    localStorage.setItem(VOICE_ONBOARDING_DONE_KEY, String(completed));
  } catch {}
}

// Voice Enabled Preference
export function isVoiceEnabled(): boolean {
  try {
    const val = localStorage.getItem(VOICE_ENABLED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export function setVoiceEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(VOICE_ENABLED_KEY, String(enabled));
  } catch {}
}

// Sidebar Collapsed
export function isSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  } catch {}
}

const HIGH_CONTRAST_KEY = 'accessroute_high_contrast';
const FONT_SCALE_KEY = 'accessroute_font_scale';

export function getSavedHighContrast(): boolean {
  try {
    return localStorage.getItem(HIGH_CONTRAST_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveHighContrastToStorage(enabled: boolean): void {
  try {
    localStorage.setItem(HIGH_CONTRAST_KEY, String(enabled));
  } catch {}
}

export function getSavedFontScale(): number {
  try {
    const val = localStorage.getItem(FONT_SCALE_KEY);
    if (val) {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0.75 && num <= 1.6) {
        return num;
      }
    }
  } catch {}
  return 1.0;
}

export function saveFontScaleToStorage(scale: number): void {
  try {
    localStorage.setItem(FONT_SCALE_KEY, scale.toFixed(2));
  } catch {}
}

// Offline Saved Routes Storage
export function getSavedRoutes(): SavedRoute[] {
  try {
    const raw = localStorage.getItem(SAVED_ROUTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRouteToStorage(savedRoute: SavedRoute): SavedRoute[] {
  try {
    const current = getSavedRoutes();
    const existingIndex = current.findIndex((r) => r.id === savedRoute.id);
    let updated: SavedRoute[];
    if (existingIndex >= 0) {
      updated = current.map((r) => (r.id === savedRoute.id ? savedRoute : r));
    } else {
      updated = [savedRoute, ...current];
    }
    localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeSavedRouteFromStorage(routeId: string): SavedRoute[] {
  try {
    const current = getSavedRoutes();
    const updated = current.filter((r) => r.id !== routeId);
    localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function isRouteSaved(routeId: string): boolean {
  try {
    const current = getSavedRoutes();
    return current.some((r) => r.id === routeId);
  } catch {
    return false;
  }
}

// Emergency ICE (In Case of Emergency) Contact Storage
export function getIceContact(): IceContact | null {
  try {
    const raw = localStorage.getItem(ICE_CONTACT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.name && parsed.phone) {
      return parsed;
    }
  } catch {}
  return null;
}

export function saveIceContact(contact: IceContact): void {
  try {
    localStorage.setItem(ICE_CONTACT_KEY, JSON.stringify(contact));
  } catch {}
}


