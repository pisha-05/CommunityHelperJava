/**
 * Formats duration in human-readable notation (Requirement 11).
 * e.g., 45 -> "45 min", 80 -> "1 hr 20 min", 125 -> "2 hr 05 min"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;

  const hours = Math.floor(minutes / 60);
  const remMinutes = Math.round(minutes % 60);
  const remStr = remMinutes.toString().padStart(2, '0');

  return `${hours} hr ${remStr} min`;
}

/**
 * Spoken duration for Web Speech synthesis voice prompts.
 */
export function formatDurationSpoken(minutes: number): string {
  if (minutes < 1) return 'less than a minute';
  if (minutes < 60) {
    const m = Math.round(minutes);
    return `${m} minute${m === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(minutes / 60);
  const remMinutes = Math.round(minutes % 60);
  const hrStr = `${hours} hour${hours > 1 ? 's' : ''}`;

  if (remMinutes === 0) return hrStr;
  return `${hrStr} and ${remMinutes} minute${remMinutes === 1 ? '' : 's'}`;
}

/**
 * Formats distance in meters or kilometers.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
