import React, { useState } from 'react';
import { 
  Navigation, ShieldCheck, CheckCircle2, AlertTriangle, 
  Sparkles, X, Check, ChevronUp, ChevronDown, Clock, Activity, 
  HardDriveDownload, Footprints, CornerUpLeft, CornerUpRight, ArrowUp,
  CircleHelp, SlidersHorizontal, MapPin
} from 'lucide-react';
import { RouteResult, MobilityProfileCode, RouteTrafficResponse } from '../../types';
import { formatTravelDuration } from '../../utils/geo';

interface RouteResultsSheetProps {
  routes: RouteResult[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  onStartNavigation: () => void;
  onClose: () => void;
  profile: MobilityProfileCode;
  destinationName: string;
  trafficData?: RouteTrafficResponse | null;
  trafficLastUpdatedText?: string;
  highContrast: boolean;
  isSavedOffline?: boolean;
  onToggleSaveOffline?: () => void;
  isDesktopPanel?: boolean;
}

export const RouteResultsSheet: React.FC<RouteResultsSheetProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  onStartNavigation,
  onClose,
  profile,
  destinationName,
  trafficData,
  trafficLastUpdatedText,
  highContrast,
  isSavedOffline = false,
  onToggleSaveOffline,
  isDesktopPanel = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  if (!activeRoute) return null;

  // Real Traffic Stats for Active Route
  const hasLiveTraffic = trafficData && trafficData.status === 'success';
  const delaySec = trafficData?.delay_seconds || 0;
  const delayMin = Math.ceil(delaySec / 60);
  const freeFlowMin = trafficData && trafficData.free_flow_time_seconds > 0 
    ? Math.round(trafficData.free_flow_time_seconds / 60) 
    : activeRoute.duration_minutes;
  const currentEstMin = trafficData && trafficData.current_time_seconds > 0 
    ? Math.round(trafficData.current_time_seconds / 60) 
    : activeRoute.duration_minutes + delayMin;
  const congLevel = trafficData?.overall_congestion_level || 'free';
  
  const congBadgeColor = 
    congLevel === 'severe' ? 'bg-red-50 text-red-800 border-red-200' :
    congLevel === 'heavy' ? 'bg-orange-50 text-orange-800 border-orange-200' :
    congLevel === 'moderate' ? 'bg-amber-50 text-amber-800 border-amber-200' :
    'bg-emerald-50 text-emerald-800 border-emerald-200';

  const congLabel = 
    congLevel === 'severe' ? 'Severe traffic' :
    congLevel === 'heavy' ? 'Heavy traffic' :
    congLevel === 'moderate' ? 'Moderate traffic' : 'Free-flow traffic';

  const containerClasses = isDesktopPanel
    ? `w-full h-full flex flex-col p-5 sm:p-6 bg-white text-slate-900 overflow-y-auto`
    : `fixed bottom-0 left-0 right-0 z-40 max-w-xl mx-auto rounded-t-3xl border-t border-x p-4 sm:p-5 card-shadow-floating safe-bottom transition-all duration-300 ease-in-out ${
        highContrast
          ? 'bg-black text-yellow-300 border-yellow-400'
          : 'bg-white/98 backdrop-blur-lg text-slate-900 border-slate-200'
      }`;

  return (
    <div className={containerClasses} role="region" aria-label="Route Results and Accessible Alternatives">
      {/* Mobile Drag Handle */}
      {!isDesktopPanel && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center py-1 -mt-2 mb-1 text-slate-400 hover:text-slate-600 transition touch-target-48 cursor-pointer"
          aria-label={isExpanded ? 'Collapse route details' : 'Expand route details'}
        >
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mb-1"></div>
        </button>
      )}

      {/* Header: Destination & Close */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
        <div className="min-w-0 pr-2">
          {isDesktopPanel ? (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-1 cursor-pointer transition"
              title="Return to route planning"
            >
              <span>&larr; Edit Journey</span>
            </button>
          ) : (
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              {routes.length} Route Alternative{routes.length > 1 ? 's' : ''} Available
            </span>
          )}
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
            {destinationName}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {!isDesktopPanel && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition touch-target-48 cursor-pointer"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition touch-target-48 cursor-pointer"
            aria-label="Close route results"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Primary Route Summary Hero Card */}
      <div className="flex flex-col gap-2.5 pt-2.5 shrink-0">
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono-nums text-slate-900">
                {formatTravelDuration(hasLiveTraffic ? currentEstMin : activeRoute.duration_minutes)}
              </span>
              <span className="text-xs font-bold text-slate-500 font-mono-nums">
                ({activeRoute.distance_km} km)
              </span>
            </div>
            {hasLiveTraffic && freeFlowMin !== currentEstMin && (
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Normal free-flow: {formatTravelDuration(freeFlowMin)}</span>
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{Math.round(activeRoute.accessibility_score)}/100 Score</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {hasLiveTraffic ? `Live traffic • ${trafficLastUpdatedText || 'updated just now'}` : 'Live traffic unavailable'}
            </span>
          </div>
        </div>

        {/* Traffic Status Bar */}
        {hasLiveTraffic ? (
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${congBadgeColor}`}>
              Traffic: {congLabel}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${delayMin > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              {delayMin > 0 ? `+${delayMin} min delay` : '✓ Free Flow'}
            </span>
            {trafficData?.incidents && trafficData.incidents.length > 0 && (
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                ⚠️ {trafficData.incidents.length} alert{trafficData.incidents.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 font-medium px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>Traffic telemetry unavailable — navigation active on road network</span>
          </div>
        )}

        {/* Verification Status Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {activeRoute.is_step_free ? (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Step-Free Data Verified
            </span>
          ) : (
            <span className="text-xs font-bold text-red-800 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Possible Stairs Ahead
            </span>
          )}

          <span className="text-xs font-semibold text-emerald-900 bg-emerald-50/80 px-2.5 py-0.5 rounded-lg border border-emerald-200">
            ♿ {activeRoute.accessibility_breakdown?.ramps_count || 0} Verified Ramps
          </span>

          <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
            Slope &lt; {activeRoute.accessibility_breakdown?.max_slope_percent || 5}%
          </span>
        </div>

        {activeRoute.tradeoff_warning && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{activeRoute.tradeoff_warning}</span>
          </div>
        )}
      </div>

      {/* Route Alternatives Selection List */}
      <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 mt-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
          Compare Route Corridors
        </span>
        <div className="flex flex-col gap-2">
          {routes.map((rt) => {
            const isSelected = rt.id === activeRoute.id;

            return (
              <button
                key={rt.id}
                type="button"
                onClick={() => onSelectRoute(rt.id)}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  isSelected
                    ? 'bg-blue-50/90 border-blue-600 text-blue-950 ring-2 ring-blue-500/25 shadow-xs'
                    : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: rt.is_step_free ? '#16A34A' : '#2563EB' }}
                    />
                    <span className="font-extrabold text-xs text-slate-900">{rt.title}</span>
                  </div>
                  {rt.is_recommended ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      RECOMMENDED
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                      ALTERNATIVE
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-extrabold font-mono-nums text-slate-900">
                    {formatTravelDuration(rt.duration_minutes)} <span className="text-xs font-semibold text-slate-500 font-mono-nums">({rt.distance_km} km)</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    {Math.round(rt.accessibility_score)}/100 Score
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                  <span>{rt.is_step_free ? '✓ Step-free verified' : '⚠️ Has stairs'}</span>
                  {isSelected && hasLiveTraffic && delayMin > 0 && (
                    <span className="text-red-600 font-bold">• +{delayMin} min traffic</span>
                  )}
                </div>

                {rt.tradeoff_warning && (
                  <p className="text-[10px] text-amber-800 font-medium bg-amber-50 px-2 py-1 rounded-lg">
                    {rt.tradeoff_warning}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded Section: Telemetry & Turn-by-Turn Maneuvers */}
      {isExpanded && (
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-100 mt-2">
          {/* Telemetry Breakdown Card */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Why This Route? (Accessibility Data)</span>
              </span>
              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {activeRoute.accessibility_breakdown?.confidence_level || 'HIGH'} CONFIDENCE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 text-[11px]">Ramps:</span>
                <span className="font-extrabold text-emerald-700 font-mono-nums">
                  {activeRoute.accessibility_breakdown?.ramps_count || 0}
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 text-[11px]">Stairs:</span>
                <span className={`font-extrabold font-mono-nums ${
                  (activeRoute.accessibility_breakdown?.stairs_count || 0) === 0 ? 'text-emerald-700' : 'text-red-600'
                }`}>
                  {activeRoute.accessibility_breakdown?.stairs_count || 0}
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 text-[11px]">Max Incline:</span>
                <span className="font-extrabold text-slate-800 font-mono-nums">
                  {activeRoute.accessibility_breakdown?.max_slope_percent || 5}%
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 text-[11px]">Tactile Path:</span>
                <span className="font-extrabold text-blue-700 font-mono-nums">
                  {activeRoute.accessibility_breakdown?.tactile_paved_pct || 0}%
                </span>
              </div>
            </div>

            {/* Confidence Reasons */}
            {activeRoute.accessibility_breakdown?.confidence_reasons && activeRoute.accessibility_breakdown.confidence_reasons.length > 0 && (
              <div className="flex flex-col gap-1 text-[11px] text-slate-700 pt-1 border-t border-slate-200">
                {activeRoute.accessibility_breakdown.confidence_reasons.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Turn-by-Turn Maneuvers */}
          {activeRoute.steps && activeRoute.steps.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Turn-by-Turn Maneuvers ({activeRoute.steps.length} steps)
              </span>
              <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
                {activeRoute.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px]">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 leading-snug">{step.instruction}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono-nums">
                        <span>{step.distance_meters} m</span>
                        {step.street_name && (
                          <span className="text-slate-400 font-sans truncate">• {step.street_name}</span>
                        )}
                      </div>
                      {step.accessibility_note && (
                        <div className="mt-1 text-[11px] text-emerald-700 font-semibold">
                          {step.accessibility_note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Start Navigation & Save Offline CTAs */}
      <div className="pt-3.5 mt-auto flex flex-col sm:flex-row gap-2 shrink-0">
        <button
          type="button"
          onClick={onStartNavigation}
          className="flex-1 h-11 px-4 rounded-xl font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm shadow-blue-600/20 transition active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label={`Start accessible navigation to ${destinationName}`}
        >
          <Navigation className="w-4 h-4 transform rotate-45" />
          <span>START ACCESSIBLE NAVIGATION</span>
        </button>

        {onToggleSaveOffline && (
          <button
            type="button"
            onClick={onToggleSaveOffline}
            className={`h-11 px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition active:scale-95 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              isSavedOffline
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title={isSavedOffline ? 'Route saved for offline use' : 'Save route for offline navigation'}
            aria-label={isSavedOffline ? 'Route saved offline' : 'Save route offline'}
          >
            {isSavedOffline ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>SAVED ✓</span>
              </>
            ) : (
              <>
                <HardDriveDownload className="w-4 h-4 text-slate-600" />
                <span>SAVE OFFLINE</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
