import { EventZone } from '../types';

/**
 * Extracts and normalizes the REAL event name from source data.
 * Supports fields: name, event_name, title, name:en, name:local.
 * 
 * NEVER returns generic labels like "Event", "Public Event", "Rally", "Traffic Event".
 * If the source only provides a category and no real name, clearly returns "Unnamed <Category>".
 * NEVER invents fake names.
 */
export function getRealEventName(
  ev: EventZone | { [key: string]: any } | null | undefined
): string {
  if (!ev) return 'Unnamed Event';

  const candidates: Array<string | undefined> = [
    ev.event_name,
    ev.name,
    ev.title,
    ev['name:en'],
    ev['name:local'],
  ];

  const genericWords = new Set([
    'event',
    'public event',
    'rally',
    'traffic event',
    'gathering',
    'unnamed',
    'civic gathering',
    'road event',
  ]);

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const cleaned = candidate.trim();
      if (cleaned.length > 0 && !genericWords.has(cleaned.toLowerCase())) {
        return cleaned;
      }
    }
  }

  // Fallback if source provides only category without a name
  const cat = (ev.event_type || 'event').toLowerCase();
  if (cat.includes('rally') || cat.includes('protest')) return 'Unnamed Rally';
  if (cat.includes('sports') || cat.includes('cricket') || cat.includes('match')) return 'Unnamed Sports Event';
  if (cat.includes('road') || cat.includes('closure') || cat.includes('construction')) return 'Unnamed Road Event';
  if (cat.includes('marathon') || cat.includes('run')) return 'Unnamed Marathon';
  if (cat.includes('festival') || cat.includes('fest')) return 'Unnamed Festival';
  if (cat.includes('college') || cat.includes('university') || cat.includes('annual')) return 'Unnamed College Function';
  if (cat.includes('concert') || cat.includes('music')) return 'Unnamed Concert';
  if (cat.includes('procession')) return 'Unnamed Procession';

  return 'Unnamed Event';
}

/**
 * Returns matching icon or emoji for event based on its real name & type
 * Examples:
 * 📢 Mumbai Marathon
 * 🏟 India vs Australia Cricket Match
 * 🎵 Sunburn Festival
 * 📢 Farmers' Rally
 * 🎪 Ganesh Festival
 * 🎓 College Annual Function
 */
export function getEventEmoji(
  eventType?: string,
  eventName?: string
): string {
  const name = (eventName || '').toLowerCase();
  const type = (eventType || '').toLowerCase();

  if (name.includes('cricket') || name.includes('vs') || name.includes('match') || type.includes('sports')) {
    return '🏟';
  }
  if (name.includes('sunburn') || name.includes('music') || name.includes('concert') || type.includes('concert')) {
    return '🎵';
  }
  if (name.includes('ganesh') || name.includes('carnival') || name.includes('fair') || name.includes('circus')) {
    return '🎪';
  }
  if (name.includes('college') || name.includes('university') || name.includes('school') || name.includes('function') || type.includes('college')) {
    return '🎓';
  }
  if (name.includes('marathon') || name.includes('run') || name.includes('race') || type.includes('marathon')) {
    return '📢';
  }
  if (name.includes('rally') || name.includes('farmers') || name.includes('protest') || type.includes('rally')) {
    return '📢';
  }
  return '📢';
}

/**
 * Traffic impact badge configuration
 */
export function getTrafficImpactInfo(impact?: string, riskLevel?: string): {
  badgeText: string;
  dot: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
} {
  const imp = (impact || (riskLevel === 'extreme' ? 'CRITICAL' : riskLevel === 'high' ? 'HIGH' : 'MEDIUM')).toUpperCase();

  if (imp === 'CRITICAL' || imp === 'HIGH') {
    return {
      badgeText: imp === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      dot: '🔴',
      colorClass: 'text-red-500',
      bgClass: 'bg-red-950/40 text-red-300',
      borderClass: 'border-red-500/40',
    };
  }
  if (imp === 'MEDIUM' || imp === 'MODERATE') {
    return {
      badgeText: 'MEDIUM',
      dot: '🟠',
      colorClass: 'text-amber-500',
      bgClass: 'bg-amber-950/40 text-amber-300',
      borderClass: 'border-amber-500/40',
    };
  }
  return {
    badgeText: 'LOW',
    dot: '🟢',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-950/40 text-emerald-300',
    borderClass: 'border-emerald-500/40',
  };
}

/**
 * Natural voice text for live navigation announcement
 * Examples:
 * "Mumbai Marathon is 650 meters ahead and may cause heavy traffic."
 * "Farmers' Rally is 500 meters ahead and may cause road restrictions and delays."
 * Fallback when name unavailable:
 * "Unnamed event ahead."
 */
export function buildEventVoiceAnnouncement(
  ev: EventZone,
  distanceMeters?: number
): string {
  const realName = getRealEventName(ev);
  const dist = distanceMeters || ev.distance_m || 650;
  const isUnnamed = realName.toLowerCase().startsWith('unnamed');

  if (isUnnamed) {
    return `${realName} is ${dist} meters ahead and may cause delays.`;
  }

  // Construct impact summary
  const causes = ev.impact_reasons && ev.impact_reasons.length > 0
    ? ev.impact_reasons.map((r) => r.toLowerCase()).join(' and ')
    : 'heavy traffic and road restrictions';

  return `${realName} is ${dist} meters ahead and may cause ${causes}.`;
}
