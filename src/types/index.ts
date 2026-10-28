export type MobilityProfileCode = 
  | 'walking'
  | 'wheelchair'
  | 'vision'
  | 'car'
  | 'scooter'
  | 'pram_elderly';

export interface PlaceAccessibility {
  has_accessible_entrance: boolean;
  has_ramp: boolean;
  has_elevator: boolean;
  has_tactile_paving: boolean;
  elevator_status: 'operational' | 'out_of_service' | 'unknown';
  details?: string;
}

export interface Place {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  accessibility: PlaceAccessibility;
}

export interface RouteStep {
  instruction: string;
  maneuver: string; // 'straight' | 'turn-left' | 'turn-right' | 'arrive' | 'ramp'
  distance_meters: number;
  duration_seconds: number;
  street_name: string;
  accessibility_note?: string;
  hazard_alert?: string;
  coordinates: [number, number][];
}

export interface AccessibilityBreakdown {
  ramps_count: number;
  stairs_count: number;
  elevators_count: number;
  max_slope_percent: number;
  tactile_paved_pct: number;
  step_free_guarantee: boolean;
  major_barriers_count: number;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED';
  confidence_reasons: string[];
}

export interface RouteAccessibilityFeature {
  id: string;
  feature_type: 'ramp' | 'elevator' | 'stairs' | 'slope' | 'crossing' | 'hazard' | 'event' | 'obstruction';
  title: string;
  description: string;
  coordinates: [number, number];
  distance_along_route_m: number;
  distance_from_route_m?: number;
  incline_pct?: number | null;
  incline_text?: string | null;
  wheelchair_status?: 'yes' | 'limited' | 'no' | 'unknown';
  step_count?: number | null;
  has_ramp_alternative?: boolean | null;
  source?: string;
  severity?: 'info' | 'low' | 'moderate' | 'severe' | 'critical';
  status?: string;
  photo_url?: string | null;
  reported_time_ago?: string | null;
  event_name?: string | null;
  event_type?: string | null;
  traffic_impact?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  time_window?: string | null;
  impact_reasons?: string[] | null;
  is_on_route?: boolean | null;
}

export interface RouteResult {
  id: string;
  title: string;
  is_recommended: boolean;
  is_step_free: boolean;
  duration_minutes: number;
  distance_km: number;
  duration_seconds: number;
  distance_meters: number;
  accessibility_score: number;
  accessibility_breakdown: AccessibilityBreakdown;
  features?: RouteAccessibilityFeature[];
  steps: RouteStep[];
  coordinates: [number, number][];
  color: string;
  tradeoff_warning?: string;
}

export type ReportCategory = 
  | 'broken_ramp'
  | 'stairs'
  | 'steep_slope'
  | 'broken_elevator'
  | 'construction'
  | 'road_blockage'
  | 'barricade'
  | 'uneven_surface'
  | 'pothole'
  | 'waterlogging'
  | 'obstacle'
  | 'narrow_path'
  | 'unsafe_crossing'
  | 'crowd'
  | 'rally'
  | 'other'
  | 'blocked_footpath';

export type ReportStatus = 'COMMUNITY_REPORTED' | 'VERIFIED' | 'DISPUTED' | 'RESOLVED' | 'EXPIRED' | 'UNVERIFIED' | 'CONFIRMED';

export interface CommunityReport {
  id: string;
  category: ReportCategory | string;
  title: string;
  description: string;
  severity: 'low' | 'moderate' | 'severe' | 'critical';
  latitude: number;
  longitude: number;
  status: ReportStatus | string;
  verification_status?: string;
  photo_url?: string;
  upvotes: number;
  downvotes: number;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED';
  source?: string;
  reported_at: string;
  last_verified_at: string;
  expires_at: string;
  resolved_at?: string;
}

export interface EventZone {
  id: string;
  title?: string;
  name?: string;
  event_name?: string;
  'name:en'?: string;
  'name:local'?: string;
  event_type: 'rally' | 'marathon' | 'construction' | 'festival' | 'public_event' | 'sports' | 'concert' | 'market' | 'road_closure' | 'barricade' | 'emergency' | 'flooding' | 'crowd' | 'college_function' | 'transit_disruption' | string;
  risk_level: 'moderate' | 'high' | 'extreme';
  traffic_impact?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  crowd_density?: string;
  polygon: [number, number][];
  center?: [number, number];
  latitude?: number;
  longitude?: number;
  detour_corridor?: [number, number][];
  description: string;
  is_active: boolean;
  start_time?: string;
  end_time?: string;
  time_window?: string;
  impact_reasons?: string[];
  source?: string;
  updated_at?: string;
  distance_m?: number;
  distance_text?: string;
  is_on_route?: boolean;
}


export interface MapLayerConfig {
  showHazards: boolean;
  showRamps: boolean;
  showEvents: boolean;
  showTactile: boolean;
  showTraffic: boolean;
  highContrast: boolean;
  satelliteView: boolean;
}

export type TrafficCongestionLevel = 'free' | 'moderate' | 'heavy' | 'severe';

export interface TrafficSegment {
  id: string;
  coordinates: [number, number][];
  distance_meters: number;
  duration_seconds: number;
  free_flow_duration_seconds: number;
  current_speed_kmh: number;
  free_flow_speed_kmh: number;
  congestion_level: TrafficCongestionLevel;
  color: string;
  road_name: string;
  delay_seconds: number;
}

export interface TrafficIncident {
  id: string;
  incident_type: 'accident' | 'road_closure' | 'construction' | 'congestion' | 'blocked_road' | 'slowdown';
  title: string;
  description: string;
  location: [number, number];
  distance_from_route_m: number;
  distance_along_route_m: number;
  severity: 'low' | 'moderate' | 'severe' | 'critical';
  estimated_impact: string;
  source: string;
  last_updated?: string | null;
  is_on_route: boolean;
}

export interface RouteTrafficResponse {
  status: 'success' | 'no_traffic' | 'unavailable';
  provider: string;
  free_flow_time_seconds: number;
  current_time_seconds: number;
  delay_seconds: number;
  overall_congestion_level: TrafficCongestionLevel;
  overall_status_label: string;
  segments: TrafficSegment[];
  incidents: TrafficIncident[];
  last_updated_iso: string;
  message: string;
}

export interface SearchResult {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
  type?: string;
  category?: string;
  distance_meters?: number;
}

export interface AccessibilityLookupResult {
  has_data: boolean;
  verified: boolean;
  place_id?: string;
  name?: string;
  accessibility?: PlaceAccessibility;
  message: string;
  nearby_ramps: number;
  nearby_elevators: number;
  nearby_tactile_paths: number;
}

export interface ConstructionSite {
  id: string;
  name: string;
  construction_type: string;
  geometry_type: 'point' | 'line' | 'polygon';
  coordinates: [number, number];
  geometry: [number, number][];
  distance_from_route_m: number;
  distance_along_route_m: number;
  is_on_route: boolean;
  affects_pedestrian_path: boolean;
  status: string;
  source: string;
  last_updated?: string;
  tags?: Record<string, any>;
  description?: string;
  hazard_level?: 'low' | 'moderate' | 'severe' | 'critical';
}

export interface SavedRoute {
  id: string;
  title: string;
  originName: string;
  destinationName: string;
  destinationPlace?: Place | null;
  route: RouteResult;
  profile: MobilityProfileCode;
  savedAt: string;
  notes?: string;
}

export interface IceContact {
  name: string;
  phone: string;
  relation?: string;
}



