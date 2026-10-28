import React from 'react';
import { X, AlertTriangle, RotateCcw, MapPin, ExternalLink, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ConstructionSite } from '../../types';

interface ConstructionDetailsModalProps {
  isOpen: boolean;
  site: ConstructionSite | null;
  onClose: () => void;
  onRecalculate?: (site: ConstructionSite) => void;
  onFocusOnMap?: (site: ConstructionSite) => void;
  highContrast: boolean;
}

export const ConstructionDetailsModal: React.FC<ConstructionDetailsModalProps> = ({
  isOpen,
  site,
  onClose,
  onRecalculate,
  onFocusOnMap,
  highContrast,
}) => {
  if (!isOpen || !site) return null;

  const distFromRouteText = site.is_on_route
    ? 'Directly on route'
    : `${Math.round(site.distance_from_route_m)} m from route`;

  const distAlongText = `${site.distance_along_route_m} m ahead from route origin`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="construction-modal-title"
    >
      <div
        className={`w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-xl border transition-all ${
          highContrast
            ? 'bg-black text-yellow-300 border-2 border-yellow-400'
            : 'bg-white text-slate-900 border-slate-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                LIVE CONSTRUCTION DATA
              </span>
              <h3 id="construction-modal-title" className="text-base sm:text-lg font-extrabold truncate text-slate-900 mt-0.5">
                {site.name || 'Road Construction'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close construction details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Route Impact Status Badge */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {site.is_on_route ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 border border-red-200 text-red-700 uppercase tracking-wide">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>Construction directly on route</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800 uppercase tracking-wide">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Construction near route</span>
            </span>
          )}

          {site.affects_pedestrian_path && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 border border-purple-200 text-purple-800">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
              <span>Pedestrian / Accessible path affected</span>
            </span>
          )}
        </div>

        {/* Real Data Details Grid */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs font-sans">
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-bold">Type:</span>
            <span className="font-extrabold text-slate-800">{site.construction_type || 'Road construction'}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-bold">Distance from route:</span>
            <span className={`font-mono-nums font-bold ${site.is_on_route ? 'text-red-700' : 'text-amber-800'}`}>
              {distFromRouteText}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-bold">Distance along route:</span>
            <span className="font-mono-nums font-extrabold text-blue-700">{distAlongText}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-bold">Status:</span>
            <span className="font-extrabold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {site.status || 'Active'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-bold">Geometry:</span>
            <span className="font-extrabold text-slate-700 capitalize">
              {site.geometry_type === 'polygon' ? 'Area zone' : site.geometry_type === 'line' ? 'Road corridor' : 'Specific point'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-bold">Source:</span>
            <span className="font-extrabold text-slate-700">{site.source || 'OpenStreetMap'}</span>
          </div>

          {site.last_updated && (
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-bold">Last updated:</span>
              <span className="font-bold text-slate-600">{site.last_updated}</span>
            </div>
          )}
        </div>

        {/* Accessibility Impact Warning */}
        {site.affects_pedestrian_path && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-900 font-bold">Accessibility Advisory:</strong> This active construction may cause sidewalk closures, uneven terrain, or detours. Wheelchair and stroller navigation may require an alternative step-free corridor.
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {onFocusOnMap && (
            <button
              onClick={() => {
                onFocusOnMap(site);
                onClose();
              }}
              className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <MapPin className="w-4 h-4 text-blue-600" />
              FOCUS ON MAP
            </button>
          )}

          <button
            onClick={() => {
              if (onRecalculate) onRecalculate(site);
              onClose();
            }}
            className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-sm shadow-blue-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <RotateCcw className="w-4 h-4" />
            RECALCULATE ROUTE
          </button>
        </div>
      </div>
    </div>
  );
};
