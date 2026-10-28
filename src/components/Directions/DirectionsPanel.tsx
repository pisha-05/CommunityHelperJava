import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Navigation, ArrowUpDown, X, Footprints, Accessibility, 
  Eye, Car, Bike, Baby, SlidersHorizontal, Check,
  MapPin, LocateFixed, Loader2, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { Place, MobilityProfileCode, SearchResult } from '../../types';
import { searchLocationsApi } from '../../services/api';

export interface RouteOptionsConfig {
  avoidStairs: boolean;
  maxSlope: number;
  preferRamps: boolean;
  requireTactile: boolean;
  avoidHazards: boolean;
}

interface DirectionsPanelProps {
  originName: string;
  originCoords?: [number, number] | null;
  destination: Place | SearchResult | null;
  selectedProfile: MobilityProfileCode | null;
  onSelectProfile: (profile: MobilityProfileCode) => void;
  onCalculateRoutes: (
    originName: string, 
    originCoords: [number, number], 
    destName: string, 
    destCoords: [number, number], 
    profile: MobilityProfileCode, 
    options: RouteOptionsConfig
  ) => void;
  onClose?: () => void;
  isCalculating: boolean;
  highContrast: boolean;
  userLocation: [number, number] | null;
  errorMessage?: string | null;
  onRetry?: () => void;
}

const PROFILE_OPTIONS: { code: MobilityProfileCode; label: string; desc: string; icon: React.ReactNode }[] = [
  { code: 'wheelchair', label: 'Wheelchair', desc: 'Step-free & ramps', icon: <Accessibility className="w-4 h-4 text-emerald-600" /> },
  { code: 'vision', label: 'Visual Assist', desc: 'Tactile paving', icon: <Eye className="w-4 h-4 text-purple-600" /> },
  { code: 'pram_elderly', label: 'Pram / Elder', desc: 'Low slopes, no steps', icon: <Baby className="w-4 h-4 text-indigo-600" /> },
  { code: 'walking', label: 'Walking', desc: 'Standard sidewalks', icon: <Footprints className="w-4 h-4 text-blue-600" /> },
  { code: 'car', label: 'Vehicle', desc: 'Accessible parking', icon: <Car className="w-4 h-4 text-sky-600" /> },
  { code: 'scooter', label: 'Scooter / Bike', desc: 'Paved cycle paths', icon: <Bike className="w-4 h-4 text-amber-600" /> },
];

export const DirectionsPanel: React.FC<DirectionsPanelProps> = ({
  originName: initialOriginName,
  originCoords: initialOriginCoords,
  destination: initialDestination,
  selectedProfile,
  onSelectProfile,
  onCalculateRoutes,
  onClose,
  isCalculating,
  highContrast,
  userLocation,
  errorMessage,
  onRetry,
}) => {
  // Origin State
  const [originText, setOriginText] = useState(initialOriginName || 'Your Location');
  const [originPoint, setOriginPoint] = useState<[number, number] | null>(
    initialOriginCoords || userLocation || null
  );
  const [originSuggestions, setOriginSuggestions] = useState<SearchResult[]>([]);
  const [isOriginLoading, setIsOriginLoading] = useState(false);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);

  // Destination State
  const [destText, setDestText] = useState(initialDestination?.name || '');
  const [destPoint, setDestPoint] = useState<[number, number] | null>(
    initialDestination ? [initialDestination.latitude, initialDestination.longitude] : null
  );
  const [destSuggestions, setDestSuggestions] = useState<SearchResult[]>([]);
  const [isDestLoading, setIsDestLoading] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  // Accessibility Preferences Accordion State
  const [showPreferences, setShowPreferences] = useState(false);
  const [options, setOptions] = useState<RouteOptionsConfig>({
    avoidStairs: true,
    maxSlope: 5.0,
    preferRamps: true,
    requireTactile: selectedProfile === 'vision',
    avoidHazards: true,
  });

  const originContainerRef = useRef<HTMLDivElement>(null);
  const destContainerRef = useRef<HTMLDivElement>(null);
  const originDebounceRef = useRef<any>(null);
  const destDebounceRef = useRef<any>(null);

  // Sync external destination updates
  useEffect(() => {
    if (initialDestination) {
      setDestText(initialDestination.name);
      setDestPoint([initialDestination.latitude, initialDestination.longitude]);
    }
  }, [initialDestination]);

  // Sync external origin updates
  useEffect(() => {
    if (initialOriginCoords) {
      setOriginPoint(initialOriginCoords);
      if (initialOriginName) setOriginText(initialOriginName);
    } else if (userLocation && (!originPoint || originText === 'Your Location')) {
      setOriginPoint(userLocation);
      setOriginText(initialOriginName || 'Your Location');
    }
  }, [initialOriginCoords, userLocation, initialOriginName]);

  // Dismiss autocomplete dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (originContainerRef.current && !originContainerRef.current.contains(e.target as Node)) {
        setShowOriginSuggestions(false);
      }
      if (destContainerRef.current && !destContainerRef.current.contains(e.target as Node)) {
        setShowDestSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch Origin Autocomplete Suggestions
  const searchOrigin = useCallback(async (query: string) => {
    const clean = query.trim();
    if (clean.length < 2) {
      setOriginSuggestions([]);
      setIsOriginLoading(false);
      return;
    }
    setIsOriginLoading(true);
    try {
      const results = await searchLocationsApi(clean, userLocation?.[0], userLocation?.[1], 6);
      setOriginSuggestions(results);
    } catch {
      setOriginSuggestions([]);
    } finally {
      setIsOriginLoading(false);
    }
  }, [userLocation]);

  // Fetch Destination Autocomplete Suggestions
  const searchDest = useCallback(async (query: string) => {
    const clean = query.trim();
    if (clean.length < 2) {
      setDestSuggestions([]);
      setIsDestLoading(false);
      return;
    }
    setIsDestLoading(true);
    try {
      const results = await searchLocationsApi(clean, userLocation?.[0], userLocation?.[1], 6);
      setDestSuggestions(results);
    } catch {
      setDestSuggestions([]);
    } finally {
      setIsDestLoading(false);
    }
  }, [userLocation]);

  const handleOriginChange = (val: string) => {
    setOriginText(val);
    setShowOriginSuggestions(true);
    if (originDebounceRef.current) clearTimeout(originDebounceRef.current);
    originDebounceRef.current = setTimeout(() => searchOrigin(val), 280);
  };

  const handleDestChange = (val: string) => {
    setDestText(val);
    setShowDestSuggestions(true);
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    destDebounceRef.current = setTimeout(() => searchDest(val), 280);
  };

  // Swap Origin and Destination
  const handleSwap = () => {
    const tempText = originText;
    const tempPoint = originPoint;

    setOriginText(destText);
    setOriginPoint(destPoint);

    setDestText(tempText);
    setDestPoint(tempPoint);
  };

  // Use Current GPS Location as Origin
  const handleUseCurrentLocation = () => {
    if (userLocation) {
      setOriginText('Your Location');
      setOriginPoint(userLocation);
      setShowOriginSuggestions(false);
    }
  };

  const effectiveProfile = selectedProfile || 'wheelchair';

  const handleCalculate = () => {
    if (originPoint && destPoint) {
      onCalculateRoutes(
        originText || 'Starting Point',
        originPoint,
        destText || 'Destination',
        destPoint,
        effectiveProfile,
        options
      );
    }
  };

  const isFormReady = Boolean(originPoint && destPoint && destText.trim().length > 0);

  return (
    <div
      className={`w-full flex flex-col p-5 sm:p-6 transition-colors duration-200 ${
        highContrast ? 'text-yellow-300' : 'text-slate-900'
      }`}
      role="region"
      aria-label="Accessible Journey Planner"
    >
      {/* 1. Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
            Where would you like to go?
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Step-free accessible routes with verified ramps and obstacle avoidance.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close route planner"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Route Inputs (Starting Point & Destination) with Swap */}
      <div className="flex flex-col gap-2 mb-5 relative">
        {/* Starting Point Input */}
        <div ref={originContainerRef} className="relative flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>Starting Point</span>
          </label>
          <div className="h-11 flex items-center bg-slate-50 hover:bg-slate-100/80 focus-within:bg-white rounded-xl px-3.5 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition">
            <input
              type="text"
              value={originText}
              onChange={(e) => handleOriginChange(e.target.value)}
              onFocus={() => setShowOriginSuggestions(true)}
              placeholder="Search start point or use GPS..."
              className="w-full bg-transparent text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none"
              aria-label="Starting point location"
            />
            {isOriginLoading && <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0 ml-1.5" />}
            {originText && (
              <button
                type="button"
                onClick={() => { setOriginText(''); setOriginPoint(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                aria-label="Clear starting point"
                title="Clear starting point"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            {userLocation && (
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition cursor-pointer ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title="Use current GPS location"
                aria-label="Use current GPS location"
              >
                <LocateFixed className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Origin Autocomplete Suggestions */}
          {showOriginSuggestions && originSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden max-h-56 overflow-y-auto">
              {originSuggestions.map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => {
                    setOriginText(res.name);
                    setOriginPoint([res.latitude, res.longitude]);
                    setShowOriginSuggestions(false);
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs hover:bg-blue-50 flex items-start gap-2.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition focus-visible:outline-none focus-visible:bg-blue-50"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{res.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{res.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Small Accessible Swap Button */}
        <div className="flex items-center justify-center my-0.5 z-10">
          <button
            type="button"
            onClick={handleSwap}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 border border-slate-200 shadow-2xs transition active:scale-95 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            title="Swap starting point and destination"
            aria-label="Swap starting point and destination"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Destination Input */}
        <div ref={destContainerRef} className="relative flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-red-500 transform rotate-45" />
            <span>Destination</span>
          </label>
          <div className="h-11 flex items-center bg-slate-50 hover:bg-slate-100/80 focus-within:bg-white rounded-xl px-3.5 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition">
            <input
              type="text"
              value={destText}
              onChange={(e) => handleDestChange(e.target.value)}
              onFocus={() => setShowDestSuggestions(true)}
              placeholder="Search destination, station, venue..."
              className="w-full bg-transparent text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none"
              aria-label="Destination location"
            />
            {isDestLoading && <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0 ml-1.5" />}
            {destText && (
              <button
                type="button"
                onClick={() => { setDestText(''); setDestPoint(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                aria-label="Clear destination"
                title="Clear destination"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Destination Autocomplete Suggestions */}
          {showDestSuggestions && destSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden max-h-56 overflow-y-auto">
              {destSuggestions.map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => {
                    setDestText(res.name);
                    setDestPoint([res.latitude, res.longitude]);
                    setShowDestSuggestions(false);
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs hover:bg-blue-50 flex items-start gap-2.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition focus-visible:outline-none focus-visible:bg-blue-50"
                >
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{res.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{res.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Your Accessibility Needs — 2-Column Responsive Profile Selector */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Your accessibility needs
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Mobility Profile">
          {PROFILE_OPTIONS.map((item) => {
            const isSelected = effectiveProfile === item.code;
            return (
              <button
                key={item.code}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelectProfile(item.code)}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  isSelected
                    ? highContrast
                      ? 'bg-yellow-400 text-black border-yellow-400 font-bold'
                      : 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 font-bold'
                    : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  {item.icon}
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight text-slate-900">{item.label}</div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Collapsible "More Preferences" Section */}
      <div className="mb-5 bg-slate-50/70 border border-slate-200/90 rounded-xl p-3.5 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowPreferences(!showPreferences)}
          className="flex items-center justify-between w-full text-xs font-bold text-slate-800 hover:text-blue-600 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          aria-expanded={showPreferences}
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            <span>More preferences</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold">
            <span>{showPreferences ? 'Hide' : 'Customize'}</span>
            {showPreferences ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {/* Collapsed Active Summary Line */}
        <div className="text-[11px] text-slate-500 font-medium">
          {options.avoidStairs ? 'Step-free (0 stairs)' : 'Stairs allowed'} · Max {options.maxSlope}% slope {options.preferRamps ? '· Verified ramps' : ''}
        </div>

        {/* Expanded Preferences Options */}
        {showPreferences && (
          <div className="pt-2.5 border-t border-slate-200/80 flex flex-col gap-2.5 text-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 font-medium">Strict Step-Free (Avoid stairs)</span>
              <input
                type="checkbox"
                checked={options.avoidStairs}
                onChange={(e) => setOptions((prev) => ({ ...prev, avoidStairs: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 font-medium">Prefer Verified Ramps & Elevators</span>
              <input
                type="checkbox"
                checked={options.preferRamps}
                onChange={(e) => setOptions((prev) => ({ ...prev, preferRamps: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">Max Gradient:</span>
                <span className="font-bold text-blue-600">{options.maxSlope}% slope</span>
              </div>
              <input
                type="range"
                min="3.0"
                max="12.0"
                step="0.5"
                value={options.maxSlope}
                onChange={(e) => setOptions((prev) => ({ ...prev, maxSlope: parseFloat(e.target.value) }))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>3% (Gentle)</span>
                <span>5% (ADA Standard)</span>
                <span>12% (Steep)</span>
              </div>
            </div>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 font-medium">Avoid Reported Barriers & Hazards</span>
              <input
                type="checkbox"
                checked={options.avoidHazards}
                onChange={(e) => setOptions((prev) => ({ ...prev, avoidHazards: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>
        )}
      </div>

      {/* Error & Retry Notice */}
      {errorMessage && (
        <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">{errorMessage}</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="block mt-1 font-bold text-red-700 underline hover:text-red-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Retry route calculation
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Prominent Primary Button: Find Accessible Routes */}
      <button
        type="button"
        onClick={handleCalculate}
        disabled={!isFormReady || isCalculating}
        className={`w-full h-11 px-4 rounded-xl font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition active:scale-98 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          !isFormReady || isCalculating
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-600/20'
        }`}
        aria-label="Find accessible routes"
      >
        {isCalculating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Finding Accessible Routes...</span>
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4 transform rotate-45" />
            <span>Find Accessible Routes</span>
          </>
        )}
      </button>
    </div>
  );
};
