import React, { useState } from 'react';
import { 
  Layers, ShieldAlert, Accessibility, AlertOctagon, 
  Plus, Minus, X, Check, Eye, LocateFixed, Construction, Activity
} from 'lucide-react';
import { MapLayerConfig } from '../../types';

interface MapControlsProps {
  layers: MapLayerConfig;
  onToggleLayer: (layer: keyof MapLayerConfig) => void;
  onRecenter: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onOpenScreenReaderTable: () => void;
  highContrast: boolean;
  isNavigating: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  layers,
  onToggleLayer,
  onRecenter,
  onZoomIn,
  onZoomOut,
  onOpenScreenReaderTable,
  highContrast,
  isNavigating,
}) => {
  const [showLayerDrawer, setShowLayerDrawer] = useState(false);

  if (isNavigating) return null;

  return (
    <div className="absolute right-4 sm:right-5 top-4 sm:top-5 flex flex-col items-end gap-2 z-30 pointer-events-auto">
      {/* 1. Zoom Controls Group (Zoom In & Zoom Out unified) */}
      <div 
        className={`flex flex-col rounded-xl border shadow-xs overflow-hidden ${
          highContrast
            ? 'bg-black border-yellow-400 text-yellow-300'
            : 'bg-white border-slate-200 text-slate-700'
        }`}
        role="group"
        aria-label="Map zoom controls"
      >
        <button
          type="button"
          onClick={onZoomIn}
          className={`w-11 h-11 flex items-center justify-center transition-colors cursor-pointer border-b focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:z-10 ${
            highContrast
              ? 'border-yellow-400 hover:bg-yellow-950/40 text-yellow-300 active:bg-yellow-900/50'
              : 'border-slate-200 hover:bg-slate-50 hover:text-blue-600 active:bg-slate-100 text-slate-700'
          }`}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <Plus className="w-5 h-5 shrink-0" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className={`w-11 h-11 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:z-10 ${
            highContrast
              ? 'hover:bg-yellow-950/40 text-yellow-300 active:bg-yellow-900/50'
              : 'hover:bg-slate-50 hover:text-blue-600 active:bg-slate-100 text-slate-700'
          }`}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <Minus className="w-5 h-5 shrink-0" strokeWidth={2} />
        </button>
      </div>

      {/* 2. Locate My Position */}
      <button
        type="button"
        onClick={onRecenter}
        className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          highContrast
            ? 'bg-black border-yellow-400 text-yellow-300 hover:bg-yellow-950/40'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-slate-300'
        }`}
        title="Locate my position"
        aria-label="Locate my position"
      >
        <LocateFixed className="w-5 h-5 shrink-0" strokeWidth={2} />
      </button>

      {/* 3. Map Layers Toggle */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowLayerDrawer(!showLayerDrawer)}
          className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
            showLayerDrawer
              ? highContrast
                ? 'bg-yellow-400 text-black border-yellow-400 font-bold'
                : 'bg-blue-50 text-blue-600 border-blue-400 ring-2 ring-blue-500/20'
              : highContrast
              ? 'bg-black border-yellow-400 text-yellow-300 hover:bg-yellow-950/40'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-slate-300'
          }`}
          title="Map layers"
          aria-label="Map layers"
          aria-expanded={showLayerDrawer}
        >
          <Layers className="w-5 h-5 shrink-0" strokeWidth={2} />
        </button>

        {/* Map Layers Flyout Menu Card */}
        {showLayerDrawer && (
          <div
            className={`absolute top-0 right-[52px] rounded-2xl p-4 border shadow-lg w-64 sm:w-72 flex flex-col gap-3 animate-fade-in z-40 max-w-[calc(100vw-80px)] ${
              highContrast
                ? 'bg-black text-yellow-300 border-yellow-400'
                : 'bg-white text-slate-900 border-slate-200'
            }`}
            role="dialog"
            aria-label="Accessibility map layers"
          >
            <div className={`flex items-center justify-between border-b pb-2 ${
              highContrast ? 'border-yellow-400/30 text-yellow-300' : 'border-slate-100 text-slate-900'
            }`}>
              <span className={`font-extrabold text-xs tracking-tight flex items-center gap-1.5 ${
                highContrast ? 'text-yellow-300' : 'text-slate-900'
              }`}>
                <Layers className={`w-4 h-4 shrink-0 ${highContrast ? 'text-yellow-400' : 'text-blue-600'}`} strokeWidth={2} />
                <span>Accessibility Map Layers</span>
              </span>
              <button
                type="button"
                onClick={() => setShowLayerDrawer(false)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  highContrast
                    ? 'text-yellow-400 hover:bg-yellow-950/60'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
                aria-label="Close layers menu"
              >
                <X className="w-4 h-4 shrink-0" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {/* ADA Ramps Layer */}
              <button
                type="button"
                onClick={() => onToggleLayer('showRamps')}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                  highContrast
                    ? layers.showRamps
                      ? 'bg-yellow-400 text-black border-yellow-400 font-bold'
                      : 'bg-black text-yellow-300 border-yellow-400/40 hover:bg-yellow-950/40'
                    : layers.showRamps
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Accessibility className={`w-4 h-4 shrink-0 ${
                    highContrast
                      ? layers.showRamps ? 'text-black' : 'text-yellow-400'
                      : 'text-emerald-600'
                  }`} strokeWidth={2} />
                  <span className="text-xs">ADA Step-Free Ramps</span>
                </div>
                {layers.showRamps && (
                  <Check className={`w-3.5 h-3.5 shrink-0 ${
                    highContrast ? 'text-black' : 'text-emerald-600'
                  }`} />
                )}
              </button>

              {/* Barriers & Hazards Layer */}
              <button
                type="button"
                onClick={() => onToggleLayer('showHazards')}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                  highContrast
                    ? layers.showHazards
                      ? 'bg-yellow-400 text-black border-yellow-400 font-bold'
                      : 'bg-black text-yellow-300 border-yellow-400/40 hover:bg-yellow-950/40'
                    : layers.showHazards
                    ? 'bg-red-50 border-red-400 text-red-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className={`w-4 h-4 shrink-0 ${
                    highContrast
                      ? layers.showHazards ? 'text-black' : 'text-yellow-400'
                      : 'text-red-500'
                  }`} strokeWidth={2} />
                  <span className="text-xs">Barriers & Obstacles</span>
                </div>
                {layers.showHazards && (
                  <Check className={`w-3.5 h-3.5 shrink-0 ${
                    highContrast ? 'text-black' : 'text-red-600'
                  }`} />
                )}
              </button>

              {/* Live Traffic Overlay */}
              <button
                type="button"
                onClick={() => onToggleLayer('showTraffic')}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                  highContrast
                    ? layers.showTraffic !== false
                      ? 'bg-yellow-400 text-black border-yellow-400 font-bold'
                      : 'bg-black text-yellow-300 border-yellow-400/40 hover:bg-yellow-950/40'
                    : layers.showTraffic !== false
                    ? 'bg-sky-50 border-sky-400 text-sky-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className={`w-4 h-4 shrink-0 ${
                    highContrast
                      ? layers.showTraffic !== false ? 'text-black' : 'text-yellow-400'
                      : 'text-sky-600'
                  }`} strokeWidth={2} />
                  <span className="text-xs">Live Traffic Overlay</span>
                </div>
                {layers.showTraffic !== false && (
                  <Check className={`w-3.5 h-3.5 shrink-0 ${
                    highContrast ? 'text-black' : 'text-sky-600'
                  }`} />
                )}
              </button>

              {/* Civic Events Layer */}
              <button
                type="button"
                onClick={() => onToggleLayer('showEvents')}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                  highContrast
                    ? layers.showEvents
                      ? 'bg-yellow-400 text-black border-yellow-400 font-bold'
                      : 'bg-black text-yellow-300 border-yellow-400/40 hover:bg-yellow-950/40'
                    : layers.showEvents
                    ? 'bg-purple-50 border-purple-400 text-purple-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertOctagon className={`w-4 h-4 shrink-0 ${
                    highContrast
                      ? layers.showEvents ? 'text-black' : 'text-yellow-400'
                      : 'text-purple-600'
                  }`} strokeWidth={2} />
                  <span className="text-xs">Civic Gatherings (150m)</span>
                </div>
                {layers.showEvents && (
                  <Check className={`w-3.5 h-3.5 shrink-0 ${
                    highContrast ? 'text-black' : 'text-purple-600'
                  }`} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Visibility / Accessible Directions Table View */}
      <button
        type="button"
        onClick={onOpenScreenReaderTable}
        className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          highContrast
            ? 'bg-black border-yellow-400 text-yellow-300 hover:bg-yellow-950/40'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-slate-300'
        }`}
        title="View accessible directions table"
        aria-label="View accessible directions table"
      >
        <Eye className="w-5 h-5 shrink-0" strokeWidth={2} />
      </button>
    </div>
  );
};
