import { 
  Place, RouteResult, CommunityReport, EventZone, 
  MobilityProfileCode, SearchResult, AccessibilityLookupResult,
  ConstructionSite, RouteTrafficResponse
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Short-lived search suggestion cache (60 seconds TTL)
const searchCache = new Map<string, { timestamp: number; data: SearchResult[] }>();
const CACHE_TTL_MS = 60 * 1000;

export async function searchLocationsApi(
  query: string,
  lat?: number,
  lon?: number,
  limit: number = 8,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  // Generate cache key based on query + rounded proximity coordinates
  const latKey = lat !== undefined ? lat.toFixed(2) : 'none';
  const lonKey = lon !== undefined ? lon.toFixed(2) : 'none';
  const cacheKey = `${cleanQuery.toLowerCase()}_${latKey}_${lonKey}_${limit}`;

  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const params = new URLSearchParams({
      text: cleanQuery,
      limit: Math.min(Math.max(limit, 1), 8).toString(),
    });
    if (lat !== undefined && lon !== undefined) {
      params.append('lat', lat.toString());
      params.append('lon', lon.toString());
    }

    const res = await fetch(`${API_BASE}/search/suggest?${params.toString()}`, { signal });
    if (!res.ok) throw new Error(`Search request failed with status: ${res.status}`);

    const data = await res.json();
    const results: SearchResult[] = data.results || [];

    // Store in cache
    searchCache.set(cacheKey, { timestamp: Date.now(), data: results });

    // Evict oldest entries if cache exceeds 100 entries
    if (searchCache.size > 100) {
      const firstKey = searchCache.keys().next().value;
      if (firstKey) searchCache.delete(firstKey);
    }

    return results;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err;
    }
    console.warn('Search API call failed:', err);
    return [];
  }
}

export async function lookupAccessibilityApi(
  lat: number,
  lon: number,
  name?: string
): Promise<AccessibilityLookupResult> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
    });
    if (name) params.append('name', name);

    const res = await fetch(`${API_BASE}/search/accessibility?${params.toString()}`);
    if (!res.ok) throw new Error('Accessibility lookup failed');
    return await res.json();
  } catch (err) {
    return {
      has_data: false,
      verified: false,
      name: name,
      message: 'Accessibility information unavailable',
      nearby_ramps: 0,
      nearby_elevators: 0,
      nearby_tactile_paths: 0,
    };
  }
}

export async function reverseGeocodeApi(
  lat: number,
  lon: number
): Promise<{ label: string; city: string; name: string }> {
  try {
    const res = await fetch(`${API_BASE}/search/reverse?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.label) {
        return {
          label: data.label || 'Current location',
          city: data.city || '',
          name: data.name || data.label || 'Current location'
        };
      }
    }
  } catch (err) {
    console.debug('Backend reverse geocode fallback:', err);
  }

  // Fallback to OpenStreetMap Nominatim reverse geocode
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const suburb = addr.suburb || addr.neighbourhood || addr.city_district || addr.district;
      const city = addr.city || addr.town || addr.municipality || addr.county || '';
      const label = suburb || city || 'Current location';
      return { label, city, name: label };
    }
  } catch (e) {
    console.debug('Nominatim fallback reverse geocode failed:', e);
  }

  return { label: 'Current location', city: '', name: 'Current location' };
}

export async function fetchPlaces(query?: string, city?: string): Promise<Place[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (city) params.append('city', city);
    const res = await fetch(`${API_BASE}/places?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch places');
    return await res.json();
  } catch (err) {
    console.debug('No places found / backend offline:', err);
    return [];
  }
}

export async function fetchReports(lat?: number, lng?: number): Promise<CommunityReport[]> {
  try {
    const params = new URLSearchParams();
    if (lat) params.append('lat', lat.toString());
    if (lng) params.append('lng', lng.toString());
    const res = await fetch(`${API_BASE}/reports?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch reports');
    return await res.json();
  } catch (err) {
    console.debug('No reports found / backend offline:', err);
    return [];
  }
}

export async function submitReportApi(data: {
  category: string;
  title: string;
  description: string;
  severity: string;
  lat: number;
  lng: number;
  photo_url?: string;
  reporter_name?: string;
  source?: string;
}): Promise<CommunityReport> {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit report');
  return await res.json();
}

export async function uploadPhotoApi(file: File): Promise<{ photo_url: string }> {
  // If online, upload to server
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/reports/upload-photo`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.debug('Upload photo endpoint fallback to local Data URL:', e);
  }

  // Resilient fallback: convert directly to base64 Data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ photo_url: reader.result as string });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function voteReportApi(
  reportId: string, 
  voteType: 'upvote' | 'downvote' | 'resolve' | 'verify' | 'dispute'
): Promise<CommunityReport> {
  const res = await fetch(`${API_BASE}/reports/${reportId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vote_type: voteType }),
  });
  if (!res.ok) throw new Error('Failed to vote');
  return await res.json();
}

export async function fetchEvents(
  lat?: number, 
  lng?: number, 
  radiusKm?: number, 
  bbox?: string
): Promise<EventZone[]> {
  try {
    const params = new URLSearchParams();
    if (lat !== undefined) params.append('lat', lat.toString());
    if (lng !== undefined) params.append('lng', lng.toString());
    if (radiusKm !== undefined) params.append('radius_km', radiusKm.toString());
    if (bbox !== undefined) params.append('bbox', bbox);
    const res = await fetch(`${API_BASE}/events?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return await res.json();
  } catch (err) {
    return [];
  }
}


export async function calculateRoutesApi(
  origin: [number, number],
  destination: [number, number],
  profile: MobilityProfileCode,
  originName?: string,
  destinationName?: string
): Promise<{ routes: RouteResult[] }> {
  const res = await fetch(`${API_BASE}/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination,
      profile,
      origin_name: originName || 'Origin',
      destination_name: destinationName || 'Destination',
    }),
  });

  if (!res.ok) {
    let errorDetail = 'Unable to calculate a route right now. Please check your connection and try again.';
    try {
      const errorJson = await res.json();
      if (errorJson?.detail) errorDetail = errorJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  const data = await res.json();
  if (!data?.routes || data.routes.length === 0) {
    throw new Error('No accessible routes found for the selected locations.');
  }
  return data;
}

export async function calculateRerouteApi(
  currentLocation: [number, number],
  destination: [number, number],
  profile: MobilityProfileCode
): Promise<RouteResult> {
  const res = await fetch(`${API_BASE}/routes/reroute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_location: currentLocation,
      destination,
      profile,
    }),
  });

  if (!res.ok) {
    let errorDetail = 'Unable to calculate a detour route right now.';
    try {
      const errorJson = await res.json();
      if (errorJson?.detail) errorDetail = errorJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  return await res.json();
}

export async function fetchRouteConstructionApi(
  coordinates: [number, number][],
  maxCorridorM: number = 50,
  profile: MobilityProfileCode = 'wheelchair'
): Promise<{ status: 'success' | 'empty' | 'unavailable'; count: number; corridor_m: number; sites: ConstructionSite[]; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/routes/construction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coordinates,
        max_corridor_m: maxCorridorM,
        profile,
      }),
    });

    if (!res.ok) {
      return {
        status: 'unavailable',
        count: 0,
        corridor_m: maxCorridorM,
        sites: [],
        message: 'Construction data is currently unavailable.',
      };
    }

    return await res.json();
  } catch (err) {
    console.debug('Construction search notice:', err);
    return {
      status: 'unavailable',
      count: 0,
      corridor_m: maxCorridorM,
      sites: [],
      message: 'Construction data is currently unavailable.',
    };
  }
}

export async function fetchRouteTrafficApi(
  origin: [number, number],
  destination: [number, number],
  coordinates?: [number, number][],
  profile: MobilityProfileCode = 'wheelchair'
): Promise<RouteTrafficResponse> {
  try {
    const res = await fetch(`${API_BASE}/routes/traffic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin,
        destination,
        coordinates,
        profile,
      }),
    });

    if (!res.ok) {
      return {
        status: 'unavailable',
        provider: 'Geoapify Traffic Engine',
        free_flow_time_seconds: 0,
        current_time_seconds: 0,
        delay_seconds: 0,
        overall_congestion_level: 'free',
        overall_status_label: 'Live traffic temporarily unavailable',
        segments: [],
        incidents: [],
        last_updated_iso: new Date().toISOString(),
        message: 'Live traffic temporarily unavailable',
      };
    }

    return await res.json();
  } catch (err) {
    console.debug('Traffic fetch notice:', err);
    return {
      status: 'unavailable',
      provider: 'Geoapify Traffic Engine',
      free_flow_time_seconds: 0,
      current_time_seconds: 0,
      delay_seconds: 0,
      overall_congestion_level: 'free',
      overall_status_label: 'Live traffic temporarily unavailable',
      segments: [],
      incidents: [],
      last_updated_iso: new Date().toISOString(),
      message: 'Live traffic temporarily unavailable',
    };
  }
}
