import React from 'react';
import { EventZone } from '../../types';
import { getRealEventName, getEventEmoji, getTrafficImpactInfo } from '../../utils/eventUtils';
import { Eye, Navigation, X, Radio } from 'lucide-react';

interface EventsAffectingRoutePanelProps {
  events: EventZone[];
  onSelectEvent: (event: EventZone) => void;
  onAvoidEvent: (event: EventZone) => void;
  onClose?: () => void;
  highContrast?: boolean;
}

export const EventsAffectingRoutePanel: React.FC<EventsAffectingRoutePanelProps> = ({
  events,
  onSelectEvent,
  onAvoidEvent,
  onClose,
  highContrast = false,
}) => {
  if (events.length === 0) return null;

  return (
    <div
      className={`rounded-3xl p-4 sm:p-5 border transition-all duration-200 card-shadow-floating ${
        highContrast
          ? 'bg-black text-yellow-300 border-2 border-yellow-400'
          : 'bg-slate-900/95 text-slate-100 border-slate-800 shadow-2xl backdrop-blur-xl'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3.5 pb-2 border-b border-slate-800">
        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
          <span>📅</span>
          <span>EVENTS AFFECTING YOUR ROUTE</span>
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {events.map((ev) => {
          const realName = getRealEventName(ev);
          const emoji = getEventEmoji(ev.event_type, realName);
          const impact = getTrafficImpactInfo(ev.traffic_impact, ev.risk_level);
          const distText = ev.distance_text || (ev.distance_m ? `${ev.distance_m} m ahead` : '650 m ahead');
          const timeText = ev.time_window || (ev.start_time && ev.end_time ? `${ev.start_time} – ${ev.end_time}` : '6:00 AM – 11:00 AM');

          return (
            <div
              key={ev.id}
              className={`p-3.5 rounded-2xl border transition-all hover:border-slate-700 ${
                highContrast
                  ? 'bg-black border-yellow-400 text-yellow-300'
                  : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-950'
              }`}
            >
              {/* Event Name */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="font-extrabold text-sm text-white flex items-center gap-1.5 truncate">
                  <span>{emoji}</span>
                  <span className="truncate">{realName}</span>
                </div>
              </div>

              {/* Distance Ahead */}
              <div className="text-xs font-semibold text-slate-300 mb-1">
                {distText}
              </div>

              {/* Traffic Impact */}
              <div className="flex items-center gap-1.5 text-xs font-bold mb-1.5">
                <span>{impact.dot}</span>
                <span className={impact.colorClass}>{impact.badgeText === 'HIGH' || impact.badgeText === 'CRITICAL' ? 'High traffic impact' : impact.badgeText === 'MEDIUM' ? 'Medium traffic impact' : 'Low traffic impact'}</span>
              </div>

              {/* Time Window */}
              <div className="text-[11px] font-medium text-slate-400 mb-3">
                {timeText}
              </div>

              {/* Actions [View] [Avoid] */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectEvent(ev)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-slate-700"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span>View</span>
                </button>
                <button
                  onClick={() => onAvoidEvent(ev)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-red-500/30"
                >
                  <Navigation className="w-3.5 h-3.5 text-red-400" />
                  <span>Avoid</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
