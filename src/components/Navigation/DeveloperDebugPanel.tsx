import React from 'react';
import { Activity, X } from 'lucide-react';
import { RouteResult, MobilityProfileCode } from '../../types';
import { VoiceState } from '../../services/voiceAssistant';

interface DeveloperDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoute: RouteResult | null;
  userLocation: [number, number] | null;
  destination: [number, number] | null;
  profile: MobilityProfileCode | null;
  voiceState: VoiceState;
  isListening: boolean;
  isVoiceSupported: boolean;
  voiceName: string;
  highContrast: boolean;
}

export const DeveloperDebugPanel: React.FC<DeveloperDebugPanelProps> = ({
  isOpen,
  onClose,
  activeRoute,
  userLocation,
  destination,
  profile,
  voiceState,
  isListening,
  isVoiceSupported,
  voiceName,
  highContrast,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-24 right-4 z-50 w-96 max-w-[90vw] rounded-3xl p-4 bg-slate-900/95 backdrop-blur-xl border border-slate-700 text-white card-shadow-floating animate-fade-in font-mono text-xs"
      role="dialog"
      aria-label="Developer Routing and Diagnostics Panel"
    >
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 font-bold text-slate-200">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Real Routing Diagnostics</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
        {/* GPS Coordinates */}
        <div className="p-2 rounded-xl bg-slate-800/80 flex flex-col gap-1">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">GPS & Destination</div>
          <div className="flex justify-between">
            <span className="text-slate-400">Origin GPS:</span>
            <span className={userLocation ? "text-blue-400 font-bold" : "text-amber-400 font-semibold"}>
              {userLocation ? `${userLocation[0].toFixed(5)}, ${userLocation[1].toFixed(5)}` : 'Not acquired yet'}
            </span>
          </div>
          {destination && (
            <div className="flex justify-between">
              <span className="text-slate-400">Destination:</span>
              <span className="text-blue-400 font-bold">{destination[0].toFixed(5)}, {destination[1].toFixed(5)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400">Profile:</span>
            <span className="text-emerald-400 font-bold">{profile || 'Unselected'}</span>
          </div>
        </div>

        {/* Route Geometry */}
        <div className="p-2 rounded-xl bg-slate-800/80 flex flex-col gap-1">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Routing Engine & Precision</div>
          <div className="flex justify-between">
            <span className="text-slate-400">Polyline Precision:</span>
            <span className="text-emerald-400 font-bold">6-Decimal (Valhalla 1e-6)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Points Decoded:</span>
            <span className="text-slate-200 font-bold">{activeRoute?.coordinates.length || 0} pts</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Distance / Time:</span>
            <span className="text-slate-200 font-bold">
              {activeRoute ? `${activeRoute.distance_km} km (${activeRoute.duration_minutes} min)` : 'No active route'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Maneuvers:</span>
            <span className="text-slate-200 font-bold">{activeRoute?.steps.length || 0} steps</span>
          </div>
        </div>

        {/* Voice Assistant State */}
        <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-800/40 flex flex-col gap-1">
          <div className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Voice Assistant Telemetry</div>
          <div className="flex justify-between">
            <span className="text-slate-400">Voice State:</span>
            <span className="text-purple-300 font-bold">{voiceState}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Recognition API:</span>
            <span className={isVoiceSupported ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
              {isVoiceSupported ? 'Supported (WebSpeech)' : 'Unsupported'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Active Voice:</span>
            <span className="text-slate-200 font-bold truncate max-w-[160px]">{voiceName || 'System Default'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
