import React, { useState } from 'react';
import { 
  AlertTriangle, RotateCcw, Eye, ShieldAlert, CheckCircle2, 
  ChevronRight, Sliders, X 
} from 'lucide-react';
import { ConstructionSite, MobilityProfileCode } from '../../types';

interface ConstructionWarningBannerProps {
  sites: ConstructionSite[];
  statusMessage: string | null;
  corridorDistanceM: number;
  onChangeCorridorDistance: (dist: number) => void;
  onSelectSite: (site: ConstructionSite) => void;
  onRecalculate: (site?: ConstructionSite) => void;
  mobilityProfile: MobilityProfileCode | null;
  highContrast: boolean;
}

export const ConstructionWarningBanner: React.FC<ConstructionWarningBannerProps> = ({
  sites,
  statusMessage,
  corridorDistanceM,
  onChangeCorridorDistance,
  onSelectSite,
  onRecalculate,
  mobilityProfile,
  highContrast,
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // If no sites and no status message, return null
  if (!sites.length && !statusMessage) return null;

  const onRouteSite = sites.find((s) => s.is_on_route);
  const pedSite = sites.find((s) => s.affects_pedestrian_path);
  const isAccessibleProfile = mobilityProfile === 'wheelchair' || mobilityProfile === 'pram_elderly' || mobilityProfile === 'vision';

  return (
    <div className="w-full flex flex-col gap-2 animate-fade-in">
      {/* 1. If Construction Directly On Route */}
      {onRouteSite ? (
        <div
          className={`rounded-2xl p-3.5 border shadow-md flex flex-col gap-2.5 ${
            highContrast
              ? 'bg-black text-yellow-300 border-2 border-yellow-400'
              : 'bg-red-50 border-red-200 text-red-950'
          }`}
          role="alert"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded">
                    CONSTRUCTION ON ROUTE
                  </span>
                  <span className="text-xs font-bold text-red-700 font-mono-nums">
                    {onRouteSite.distance_along_route_m > 0 ? `${onRouteSite.distance_along_route_m} m ahead` : 'On route'}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-red-950 mt-1 truncate">
                  {onRouteSite.name || 'Road construction'} detected {onRouteSite.distance_along_route_m > 0 ? `${onRouteSite.distance_along_route_m} m ahead.` : 'directly on path.'}
                </h4>
                <p className="text-xs text-red-800 mt-0.5">
                  May cause path obstruction, active roadwork, or heavy delays.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-100 transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              title="Corridor settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-red-200/80">
            <button
              onClick={() => onSelectSite(onRouteSite)}
              className="h-10 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              VIEW CONSTRUCTION
            </button>
            <button
              onClick={() => onRecalculate(onRouteSite)}
              className="h-10 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm shadow-red-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white" />
              RECALCULATE
            </button>
          </div>
        </div>
      ) : pedSite && isAccessibleProfile ? (
        /* 2. Accessibility Warning for Pedestrians / Wheelchairs */
        <div
          className={`rounded-2xl p-3.5 border shadow-md flex flex-col gap-2.5 ${
            highContrast
              ? 'bg-black text-yellow-300 border-2 border-yellow-400'
              : 'bg-purple-50 border-purple-200 text-purple-950'
          }`}
          role="alert"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded">
                  ACCESSIBILITY WARNING
                </span>
                <h4 className="font-extrabold text-sm text-purple-950 mt-1">
                  Construction may block the accessible path ahead.
                </h4>
                <p className="text-xs text-purple-800 mt-0.5">
                  {pedSite.name} ({Math.round(pedSite.distance_from_route_m)} m from route) may affect dropped curbs or sidewalk access.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="p-1.5 rounded-lg text-purple-400 hover:text-purple-700 hover:bg-purple-100 transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              title="Corridor settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-purple-200/80">
            <button
              onClick={() => onSelectSite(pedSite)}
              className="h-10 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              VIEW DETAILS
            </button>
            <button
              onClick={() => onRecalculate(pedSite)}
              className="h-10 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm shadow-purple-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white" />
              RECALCULATE ROUTE
            </button>
          </div>
        </div>
      ) : sites.length > 0 ? (
        /* 3. Construction Near Route (Within Corridor) */
        <div
          className={`rounded-2xl p-3 border shadow-sm flex items-center justify-between gap-3 ${
            highContrast
              ? 'bg-black text-yellow-300 border-2 border-yellow-400'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono-nums">
                  CONSTRUCTION NEAR ROUTE
                </span>
                <span className="text-xs font-bold text-amber-800 font-mono-nums">
                  {Math.round(sites[0].distance_from_route_m)} m from your route
                </span>
              </div>
              <p className="text-xs text-amber-800 truncate mt-0.5">
                {sites[0].name}. Possible traffic or pedestrian disruption.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onSelectSite(sites[0])}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Details
            </button>
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="p-1.5 rounded-lg text-amber-500 hover:text-amber-800 hover:bg-amber-100 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              title="Corridor settings"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : statusMessage ? (
        /* 4. No Construction or Unavailable Message */
        <div
          className={`rounded-2xl p-3 border text-xs font-bold flex items-center justify-between gap-2 ${
            statusMessage.includes('No construction')
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.includes('No construction') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>

          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            title="Adjust search corridor distance"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}

      {/* Configurable Corridor Settings Drawer */}
      {isConfigOpen && (
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-2 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between font-bold text-slate-900">
            <span>Construction Search Corridor Distance</span>
            <span className="font-mono-nums text-blue-600 font-extrabold">{corridorDistanceM} meters</span>
          </div>
          <div className="flex items-center gap-2">
            {[25, 50, 100, 200].map((dist) => (
              <button
                key={dist}
                onClick={() => {
                  onChangeCorridorDistance(dist);
                  setIsConfigOpen(false);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  corridorDistanceM === dist
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {dist}m
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500">
            Real OpenStreetMap construction data (highway, building, landuse, roadworks) is searched along your route within this corridor buffer.
          </p>
        </div>
      )}
    </div>
  );
};
