import React from 'react';
import { X, MapPin, Clock, AlertTriangle, ShieldCheck, Compass, Navigation, Radio } from 'lucide-react';
import { EventZone } from '../../types';
import { getRealEventName, getEventEmoji, getTrafficImpactInfo } from '../../utils/eventUtils';

interface EventCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventZone | null;
  distanceText?: string;
  onViewOnMap?: (event: EventZone) => void;
  onViewRouteImpact?: (event: EventZone) => void;
  onAvoidAndRecalculate?: (event: EventZone) => void;
  highContrast?: boolean;
}

export const EventCardModal: React.FC<EventCardModalProps> = ({
  isOpen,
  onClose,
  event,
  distanceText,
  onViewOnMap,
  onViewRouteImpact,
  onAvoidAndRecalculate,
  highContrast = false,
}) => {
  if (!isOpen || !event) return null;

  const realName = getRealEventName(event);
  const emoji = getEventEmoji(event.event_type, realName);
  const impactInfo = getTrafficImpactInfo(event.traffic_impact, event.risk_level);
  const displayDistance = distanceText || event.distance_text || (event.distance_m ? `${event.distance_m} m ahead` : '650 m ahead');
  const timeWindow = event.time_window || (event.start_time && event.end_time ? `${event.start_time} – ${event.end_time}` : '6:00 AM – 11:00 AM');
  const impactReasons = event.impact_reasons && event.impact_reasons.length > 0
    ? event.impact_reasons
    : ['Heavy traffic', 'Road restrictions', 'Crowding', 'Delays'];
  const sourceName = event.source || 'Official Event Feed';
  const lastUpdated = event.updated_at || 'Today, 10:45 AM';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm pointer-events-auto animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-card-title"
    >
      <div
        className={`w-full max-w-md rounded-3xl p-5 sm:p-6 card-shadow-floating border transition-all duration-200 relative ${
          highContrast
            ? 'bg-black text-yellow-300 border-2 border-yellow-400'
            : 'bg-slate-900/95 text-slate-100 border-slate-800 shadow-2xl backdrop-blur-xl'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95 touch-target-48 cursor-pointer"
          aria-label="Close event details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Tag */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <span>📅</span> EVENT
          </span>
          {event.is_on_route && (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              On Your Route
            </span>
          )}
        </div>

        {/* Real Event Name */}
        <h2 id="event-card-title" className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mb-3">
          <span>{emoji}</span>
          <span>{realName}</span>
        </h2>

        {/* Proximity & Time */}
        <div className="space-y-1.5 mb-4 text-sm font-bold text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">📍</span>
            <span>{displayDistance}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">🕐</span>
            <span>{timeWindow}</span>
          </div>
        </div>

        {/* Traffic Impact Section */}
        <div className="mb-4 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">
            Traffic impact:
          </div>
          <div className="flex items-center gap-2 text-base font-black">
            <span>{impactInfo.dot}</span>
            <span className={impactInfo.colorClass}>{impactInfo.badgeText}</span>
          </div>
        </div>

        {/* Impact List */}
        <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <div className="text-xs font-black text-amber-400 flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>⚠️ This event may cause:</span>
          </div>
          <ul className="space-y-1 text-xs text-slate-200 font-semibold pl-2">
            {impactReasons.map((reason, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-amber-400">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Source & Updated At */}
        <div className="space-y-2 mb-6 text-xs text-slate-400 border-t border-slate-800 pt-3">
          <div>
            <span className="font-bold text-slate-500">Source:</span>
            <div className="font-semibold text-slate-300">{sourceName}</div>
          </div>
          <div>
            <span className="font-bold text-slate-500">Last updated:</span>
            <div className="font-semibold text-slate-300">{lastUpdated}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (onViewOnMap) onViewOnMap(event);
                onClose();
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-slate-700"
            >
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              VIEW ON MAP
            </button>
            <button
              onClick={() => {
                if (onViewRouteImpact) onViewRouteImpact(event);
                onClose();
              }}
              className="py-2.5 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-indigo-500/40"
            >
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
              VIEW ROUTE IMPACT
            </button>
          </div>

          <button
            onClick={() => {
              if (onAvoidAndRecalculate) onAvoidAndRecalculate(event);
              onClose();
            }}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-lg shadow-red-600/30"
          >
            <Navigation className="w-4 h-4" />
            AVOID & RECALCULATE
          </button>
        </div>
      </div>
    </div>
  );
};
