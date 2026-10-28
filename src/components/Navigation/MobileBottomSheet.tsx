import React, { useState, useEffect } from 'react';
import {
  MapPin, Navigation,
  ChevronDown, AlertTriangle,
  X, Check, Accessibility, Eye, Baby, Footprints, Car, Bike
} from 'lucide-react';
import { Place, RouteResult, MobilityProfileCode, RouteTrafficResponse } from '../../types';
import { formatTravelDuration } from '../../utils/geo';

export type SheetSnapState = 'COLLAPSED' | 'HALF' | 'FULL';

interface MobileBottomSheetProps {
  selectedPlace: Place | null;
  routes: RouteResult[];
  selectedRouteId: string | null;
  onSelectRouteId: (id: string) => void;
  onCalculateRoute: (place: Place) => void;
  onStartNavigation: () => void;
  onClearSelection: () => void;
  activeProfile: MobilityProfileCode | null;
  onSelectProfile: (p: MobilityProfileCode) => void;
  onOpenReportModal: () => void;
  onOpenSavedPlaces: () => void;
  isCalculatingRoutes: boolean;
  trafficData?: RouteTrafficResponse | null;
  trafficLastUpdatedText?: string;
  highContrast: boolean;
  isNavigating: boolean;
}

const PROFILE_OPTIONS: Array<{
  id: MobilityProfileCode;
  label: string;
  icon: React.ReactNode;
  desc: string;
}> = [
  { id: 'wheelchair', label: 'Wheelchair', icon: <Accessibility className="w-4 h-4 text-emerald-500" />, desc: 'Step-free paths, ADA ramps, max 5% slope' },
  { id: 'vision', label: 'Visual Assist', icon: <Eye className="w-4 h-4 text-purple-500" />, desc: 'Tactile paving, voice guidance, audio beacons' },
  { id: 'pram_elderly', label: 'Pram / Walker', icon: <Baby className="w-4 h-4 text-indigo-500" />, desc: 'Gentle curb ramps, wide pavements, no stairs' },
  { id: 'walking', label: 'Walking', icon: <Footprints className="w-4 h-4 text-blue-500" />, desc: 'Standard pedestrian sidewalks & crossings' },
  { id: 'car', label: 'Vehicle', icon: <Car className="w-4 h-4 text-sky-500" />, desc: 'Real vehicle road network & live traffic integration' },
  { id: 'scooter', label: 'Scooter / Bike', icon: <Bike className="w-4 h-4 text-amber-500" />, desc: 'Low curb drops & paved pathways' },
];

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  selectedPlace,
  routes,
  selectedRouteId,
  onSelectRouteId,
  onCalculateRoute,
  onStartNavigation,
  onClearSelection,
  activeProfile,
  onSelectProfile,
  onOpenReportModal,
  onOpenSavedPlaces,
  isCalculatingRoutes,
  trafficData,
  trafficLastUpdatedText,
  highContrast,
  isNavigating,
}) => {
  const [snapState, setSnapState] = useState<SheetSnapState>('COLLAPSED');
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [isWarningExpanded, setIsWarningExpanded] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // When a new place or route is selected, auto-snap to HALF for user clarity
  useEffect(() => {
    if (selectedPlace || routes.length > 0) {
      setSnapState('HALF');
    } else {
      setSnapState('COLLAPSED');
    }
  }, [selectedPlace, routes.length]);

  if (isNavigating) return null;

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0] || null;
  const currentProfile = activeProfile
    ? PROFILE_OPTIONS.find((p) => p.id === activeProfile) || PROFILE_OPTIONS[0]
    : { id: 'wheelchair' as MobilityProfileCode, label: 'Choose Profile', icon: <Accessibility className="w-4 h-4 text-emerald-500" />, desc: 'Select your mobility preference' };

  // Touch drag handlers for natural mobile bottom sheet sliding
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;

    if (diff > 50) {
      if (snapState === 'COLLAPSED') setSnapState('HALF');
      else if (snapState === 'HALF') setSnapState('FULL');
    } else if (diff < -50) {
      if (snapState === 'FULL') setSnapState('HALF');
      else if (snapState === 'HALF') setSnapState('COLLAPSED');
    }
    setTouchStartY(null);
  };

  const getSheetHeightClass = () => {
    switch (snapState) {
      case 'COLLAPSED':
        return 'max-h-[96px]';
      case 'HALF':
        return 'max-h-[46vh]';
      case 'FULL':
        return 'max-h-[85vh]';
    }
  };

  const hasLiveTraffic = trafficData && trafficData.status === 'success';
  const delaySec = trafficData?.delay_seconds || 0;
  const delayMin = Math.ceil(delaySec / 60);
  const currentEstMin = trafficData && trafficData.current_time_seconds > 0 
    ? Math.round(trafficData.current_time_seconds / 60) 
    : (activeRoute ? activeRoute.duration_minutes + delayMin : 0);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden flex flex-col transition-all duration-300 ease-out safe-bottom rounded-t-2xl border-t shadow-xl pointer-events-auto ${getSheetHeightClass()} ${
        highContrast
          ? 'bg-black text-yellow-300 border-yellow-400'
          : 'bg-white/98 backdrop-blur-xl text-slate-900 border-slate-200'
      }`}
      role="region"
      aria-label="Mobile Navigation Sheet"
    >
      {/* 1. Drag Handle & Sheet Header */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (snapState === 'COLLAPSED') setSnapState('HALF');
          else if (snapState === 'FULL') setSnapState('HALF');
        }}
        className="w-full flex flex-col items-center pt-2.5 pb-2 cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className={`w-12 h-1.5 rounded-full transition-colors ${
          highContrast ? 'bg-yellow-400' : 'bg-slate-300 hover:bg-slate-400'
        }`} />
      </div>

      {/* 2. Sheet Content Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {/* CASE A: ROUTES COMPUTED -> SHOW COMPACT BEST ROUTE SUMMARY */}
        {routes.length > 0 && activeRoute ? (
          <div className="space-y-3 animate-fade-in">
            {/* Top Stats Row */}
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[11px] font-extrabold uppercase tracking-wider block ${
                  highContrast ? 'text-yellow-400' : 'text-blue-600'
                }`}>
                  Best Accessible Route
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black font-mono-nums text-slate-900">
                    {formatTravelDuration(hasLiveTraffic ? currentEstMin : activeRoute.duration_minutes)}
                  </span>
                  <span className="text-sm font-semibold font-mono-nums text-slate-500">
                    ({(activeRoute.distance_meters / 1000).toFixed(1)} km)
                  </span>
                </div>
              </div>

              {/* Profile Badge Button (tap to switch) */}
              <button
                onClick={() => setShowProfileDrawer((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer ${
                  highContrast
                    ? 'bg-black border-yellow-400 text-yellow-300'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span>{currentProfile.icon}</span>
                <span>{currentProfile.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Step-Free Accessibility Breakdown & Traffic Pills */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold ${
                activeRoute.is_step_free 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <Check className="w-3.5 h-3.5" />
                <span>{activeRoute.is_step_free ? '✓ 100% Step-free' : '⚠ Caution: Steps on path'}</span>
              </span>

              {hasLiveTraffic && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-700">
                  <span>
                    {trafficData.overall_congestion_level === 'severe' ? '🔴' :
                     trafficData.overall_congestion_level === 'heavy' ? '🟠' :
                     trafficData.overall_congestion_level === 'moderate' ? '🟡' : '🟢'}
                  </span>
                  <span>
                    {delayMin > 0 ? `+${delayMin}m traffic delay` : 'Traffic: Free'}
                  </span>
                </span>
              )}
              {activeRoute.accessibility_breakdown && (
                <>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                    <span>♿ {activeRoute.accessibility_breakdown.ramps_count} ramp{activeRoute.accessibility_breakdown.ramps_count !== 1 ? 's' : ''}</span>
                  </span>
                  {activeRoute.accessibility_breakdown.elevators_count > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-semibold">
                      <span>🛗 {activeRoute.accessibility_breakdown.elevators_count} lift</span>
                    </span>
                  )}
                  {activeRoute.accessibility_breakdown.stairs_count > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-800 font-semibold">
                      <span>🪜 {activeRoute.accessibility_breakdown.stairs_count} stairs</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-semibold">
                      <span>🪜 0 stairs</span>
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Primary Action Button: Start Navigation */}
            <button
              onClick={onStartNavigation}
              className="w-full h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm shadow-blue-600/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <Navigation className="w-4 h-4 transform rotate-45" />
              <span>Start Navigation</span>
            </button>

            {/* Alternative Routes & Turn Maneuvers when expanded */}
            {snapState !== 'COLLAPSED' && (
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                {routes.length > 1 && (
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-1.5">
                      Alternative Routes ({routes.length})
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {routes.map((r, idx) => (
                        <button
                          key={r.id}
                          onClick={() => onSelectRouteId(r.id)}
                          className={`p-2 rounded-xl border text-left text-xs transition cursor-pointer ${
                            r.id === selectedRouteId
                              ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500/20'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="truncate">{`Route Option ${idx + 1}`}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {formatTravelDuration(r.duration_minutes)} • {(r.distance_meters / 1000).toFixed(1)} km
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Maneuver Steps Preview */}
                {activeRoute.steps && activeRoute.steps.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-1.5">
                      Route Maneuvers ({activeRoute.steps.length} turns)
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {activeRoute.steps.slice(0, 5).map((step, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2 text-slate-700"
                        >
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {sIdx + 1}
                          </span>
                          <span className="truncate flex-1">{step.instruction}</span>
                          <span className="text-[10px] text-slate-400 font-mono-nums shrink-0">
                            {step.distance_meters}m
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : selectedPlace ? (
          /* CASE B: DESTINATION SELECTED -> SHOW COMPACT DESTINATION CARD */
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm text-slate-900 truncate">
                    {selectedPlace.name}
                  </h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {selectedPlace.address}
                  </p>
                </div>
              </div>

              <button
                onClick={onClearSelection}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-100 shrink-0 cursor-pointer"
                aria-label="Clear selected destination"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Collapsible Accessibility Warning / Audit Status */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
              <button
                onClick={() => setIsWarningExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    {selectedPlace.accessibility?.details?.toLowerCase().includes('unavailable')
                      ? 'Accessibility information unavailable'
                      : 'Verified accessible infrastructure'}
                  </span>
                </div>
              </button>

              {isWarningExpanded && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                  <p className="text-[11px] leading-relaxed">
                    {selectedPlace.accessibility?.details ||
                      'Standard pedestrian path data will be used. Verified ADA ramps will be prioritized where data exists.'}
                  </p>
                </div>
              )}
            </div>

            {/* Compact Profile Selector Pill */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Mobility Profile</span>
              <button
                onClick={() => setShowProfileDrawer((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 active:scale-95 cursor-pointer"
              >
                <span>{currentProfile.icon}</span>
                <span>{currentProfile.label}</span>
                <ChevronDown className="w-3 h-3 text-blue-600" />
              </button>
            </div>

            {/* Primary Action Button: Calculate Accessible Route */}
            <button
              onClick={() => onCalculateRoute(selectedPlace)}
              disabled={isCalculatingRoutes}
              className="w-full h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-sm shadow-blue-600/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {isCalculatingRoutes ? (
                <span>Calculating accessible route...</span>
              ) : (
                <>
                  <Navigation className="w-4 h-4 transform rotate-45" />
                  <span>Find Accessible Route</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* CASE C: DEFAULT HOMESCREEN STATE -> CLEAN FRESH APP PEEK */
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">
                  Choose a destination to find an accessible route
                </span>
              </div>

              {/* Compact Profile Indicator */}
              <button
                onClick={() => setShowProfileDrawer((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 cursor-pointer"
              >
                <span>{currentProfile.icon}</span>
                <span>{currentProfile.label}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            {/* Quick Action Buttons (Saved Places, Report) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={onOpenSavedPlaces}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left flex items-center gap-2 text-xs font-semibold text-slate-700 active:scale-98 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">Saved Places</span>
              </button>

              <button
                onClick={onOpenReportModal}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left flex items-center gap-2 text-xs font-semibold text-slate-700 active:scale-98 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">Report Issue</span>
              </button>
            </div>
          </div>
        )}

        {/* PROGRESSIVE DISCLOSURE: MOBILITY PROFILE SELECTION DRAWER */}
        {showProfileDrawer && (
          <div className="pt-3 border-t border-slate-200 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                How will you be travelling?
              </span>
              <button
                onClick={() => setShowProfileDrawer(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {PROFILE_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProfile(p.id);
                    setShowProfileDrawer(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                    activeProfile === p.id
                      ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500/20'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base">{p.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-none">{p.label}</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">{p.desc}</div>
                    </div>
                  </div>
                  {activeProfile === p.id && (
                    <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
