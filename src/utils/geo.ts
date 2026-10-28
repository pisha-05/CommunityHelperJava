/**
 * Geospatial Utilities for AccessRoute Live
 * Uses local Haversine formula to compute distances locally without making extra API calls.
 */

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates minimum distance in meters from a point to a polyline.
 */
export function distanceToPolylineMeters(
  point: [number, number],
  polyline: [number, number][]
): number {
  if (polyline.length === 0) return Infinity;
  let minDistance = Infinity;

  for (let i = 0; i < polyline.length; i++) {
    const d = calculateDistanceMeters(point[0], point[1], polyline[i][0], polyline[i][1]);
    if (d < minDistance) {
      minDistance = d;
    }
  }

  return minDistance;
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm <= 0) return '';
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

/**
 * Formats duration into human-readable format:
 * "45 min" for short trips.
 * "1 hr 20 min", "2 hr 05 min", "3 hr 40 min", "5 hr 15 min" for longer trips.
 */
export function formatTravelDuration(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '< 1 min';
  const mins = Math.round(totalMinutes);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) {
    return `${hours} hr`;
  }
  const paddedMins = remainingMins < 10 ? `0${remainingMins}` : `${remainingMins}`;
  return `${hours} hr ${paddedMins} min`;
}

export function formatTravelSeconds(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '< 1 min';
  const mins = Math.ceil(totalSeconds / 60);
  return formatTravelDuration(mins);
}


