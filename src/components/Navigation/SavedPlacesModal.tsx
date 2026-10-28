import React, { useState } from 'react';
import { 
  Bookmark, MapPin, X, Navigation, 
  CheckCircle2, Clock, Star, Trash2,
  HardDriveDownload, ShieldCheck, ArrowRight, Compass
} from 'lucide-react';
import { Place, SavedRoute } from '../../types';

interface SavedPlacesModalProps {
  onClose: () => void;
  onSelectPlace: (place: Place) => void;
  savedPlaces: Place[];
  recentTrips: Place[];
  onRemoveSavedPlace?: (id: string) => void;
  savedRoutes?: SavedRoute[];
  onSelectSavedRoute?: (route: SavedRoute) => void;
  onRemoveSavedRoute?: (id: string) => void;
  initialTab?: 'saved' | 'recent' | 'offline';
  highContrast: boolean;
}

export const SavedPlacesModal: React.FC<SavedPlacesModalProps> = ({
  onClose,
  onSelectPlace,
  savedPlaces,
  recentTrips,
  onRemoveSavedPlace,
  savedRoutes = [],
  onSelectSavedRoute,
  onRemoveSavedRoute,
  initialTab = 'saved',
  highContrast,
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'recent' | 'offline'>(initialTab);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-places-title"
    >
      <div
        className={`w-full max-w-lg rounded-2xl p-5 sm:p-6 border flex flex-col gap-4 max-h-[88vh] overflow-y-auto ${
          highContrast
            ? 'bg-black text-yellow-300 border-2 border-yellow-400'
            : 'bg-white text-slate-900 border-slate-200 shadow-xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 id="saved-places-title" className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                Saved Places & Offline Routes
              </h2>
              <p className="text-xs text-slate-500 font-medium">1-click accessible navigation & offline storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close saved places dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition cursor-pointer ${
              activeTab === 'saved' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Saved {savedPlaces.length > 0 && `(${savedPlaces.length})`}</span>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition cursor-pointer ${
              activeTab === 'recent' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Recent {recentTrips.length > 0 && `(${recentTrips.length})`}</span>
          </button>
          <button
            onClick={() => setActiveTab('offline')}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition cursor-pointer ${
              activeTab === 'offline' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDriveDownload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Offline Routes {savedRoutes.length > 0 && `(${savedRoutes.length})`}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex flex-col gap-2 pt-1 min-h-[160px]">
          {activeTab === 'offline' ? (
            /* Offline Routes Tab */
            savedRoutes.length > 0 ? (
              savedRoutes.map((saved) => (
                <div
                  key={saved.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/60 hover:border-emerald-300 text-left flex items-center justify-between gap-3 transition group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <HardDriveDownload className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{saved.destinationName}</span>
                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Offline Ready
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        From: {saved.originName}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-semibold text-slate-600">
                        <span className="text-blue-700 font-bold">{saved.route.duration_minutes} min</span>
                        <span>•</span>
                        <span>{saved.route.distance_km} km</span>
                        <span>•</span>
                        <span className="text-emerald-700 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{saved.route.is_step_free ? '100% Step-Free' : 'Accessible Path'}</span>
                        </span>
                        {saved.route.accessibility_breakdown?.ramps_count > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">{saved.route.accessibility_breakdown.ramps_count} Ramps</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectSavedRoute) onSelectSavedRoute(saved);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-3 py-2 rounded-xl transition shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5 transform rotate-45" />
                      <span>Start</span>
                    </button>
                    {onRemoveSavedRoute && (
                      <button
                        type="button"
                        onClick={() => onRemoveSavedRoute(saved.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Delete offline route"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                  <HardDriveDownload className="w-6 h-6" />
                </div>
                <p className="font-bold text-sm text-slate-800">
                  No Offline Routes Saved Yet
                </p>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  When you plan any accessible route, tap <strong>"Save Route Offline"</strong> to store full step-free turn-by-turn guidance and voice navigation on your device for areas with weak or no internet signal.
                </p>
              </div>
            )
          ) : (
            /* Saved Places / Recent Trips */
            (activeTab === 'saved' ? savedPlaces : recentTrips).length > 0 ? (
              (activeTab === 'saved' ? savedPlaces : recentTrips).map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/70 hover:border-blue-400 text-left flex items-center justify-between gap-3 transition group"
                >
                  <button
                    type="button"
                    onClick={() => { onSelectPlace(p); onClose(); }}
                    className="flex items-start gap-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 truncate">{p.name}</div>
                      <div className="text-xs text-slate-500 truncate">{p.address}</div>
                      {p.accessibility?.has_ramp && (
                        <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified ADA Ramp</span>
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => { onSelectPlace(p); onClose(); }}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl hover:bg-blue-600 hover:text-white transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Route</span>
                    </button>
                    {activeTab === 'saved' && onRemoveSavedPlace && (
                      <button
                        type="button"
                        onClick={() => onRemoveSavedPlace(p.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Remove saved place"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                  {activeTab === 'saved' ? <Bookmark className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </div>
                <p className="font-bold text-sm text-slate-800">
                  {activeTab === 'saved'
                    ? 'Your saved places will appear here.'
                    : 'Your recent trips will appear here after you navigate.'}
                </p>
                <p className="text-xs text-slate-500 max-w-xs">
                  {activeTab === 'saved'
                    ? 'Search for destinations and save frequently visited places for fast step-free route planning.'
                    : 'Routes you calculate and navigate will be saved here for easy one-tap access.'}
                </p>
              </div>
            )
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full h-11 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 mt-1"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
