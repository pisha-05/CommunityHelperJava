import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, MapPin, X, 
  Mic, MicOff, Loader2, Sparkles, Compass, CheckCircle2, 
  Accessibility, Eye, Footprints, Baby, Car, Bike
} from 'lucide-react';
import { Place, SearchResult, MobilityProfileCode } from '../../types';
import { searchLocationsApi } from '../../services/api';
import { calculateDistanceKm, formatDistance } from '../../utils/geo';

interface FloatingSearchBarProps {
  places: Place[];
  onSelectPlace: (place: Place) => void;
  onSelectSearchResult: (result: SearchResult) => void;
  onOpenReportModal: () => void;
  onOpenDirections: () => void;
  activeProfile: MobilityProfileCode | null;
  onSelectProfile: (profile: MobilityProfileCode) => void;
  highContrast: boolean;
  onToggleHighContrast?: () => void;
  userLocation: [number, number] | null;
  locationStatus?: 'IDLE' | 'REQUESTING' | 'GRANTED' | 'DENIED' | 'UNAVAILABLE' | 'ERROR';
  searchBias?: [number, number];
  showSearchThisArea?: boolean;
  onSearchThisArea?: () => void;
}

const PROFILE_PILLS: Array<{
  id: MobilityProfileCode;
  label: string;
  icon: React.ReactNode;
  badge: string;
}> = [
  { id: 'wheelchair', label: 'Wheelchair', icon: <Accessibility className="w-3.5 h-3.5" />, badge: 'Step-free & ramps' },
  { id: 'vision', label: 'Visual Assist', icon: <Eye className="w-3.5 h-3.5" />, badge: 'Tactile & voice cues' },
  { id: 'walking', label: 'Walking', icon: <Footprints className="w-3.5 h-3.5" />, badge: 'Standard paths' },
  { id: 'pram_elderly', label: 'Pram / Elder', icon: <Baby className="w-3.5 h-3.5" />, badge: 'Gentle incline' },
  { id: 'car', label: 'Vehicle', icon: <Car className="w-3.5 h-3.5" />, badge: 'Live traffic & roads' },
  { id: 'scooter', label: 'Scooter / Bike', icon: <Bike className="w-3.5 h-3.5" />, badge: 'Smooth paved' },
];

export const FloatingSearchBar: React.FC<FloatingSearchBarProps> = ({
  places,
  onSelectPlace,
  onSelectSearchResult,
  onOpenReportModal,
  onOpenDirections,
  activeProfile,
  onSelectProfile,
  highContrast,
  onToggleHighContrast,
  userLocation,
  locationStatus = 'IDLE',
  searchBias,
  showSearchThisArea,
  onSearchThisArea,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isListening, setIsListening] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<any>(null);
  const lastRequestIdRef = useRef<number>(0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(
    async (searchTerm: string) => {
      const cleanTerm = searchTerm.trim();

      if (cleanTerm.length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        setErrorMessage(null);
        setActiveIndex(-1);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentReqId = ++lastRequestIdRef.current;

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const biasLat = searchBias ? searchBias[0] : userLocation ? userLocation[0] : undefined;
        const biasLon = searchBias ? searchBias[1] : userLocation ? userLocation[1] : undefined;

        const results = await searchLocationsApi(
          cleanTerm,
          biasLat,
          biasLon,
          8,
          controller.signal
        );

        if (currentReqId === lastRequestIdRef.current) {
          setSuggestions(results);
          setIsLoading(false);
          setActiveIndex(-1);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (currentReqId === lastRequestIdRef.current) {
          setIsLoading(false);
          setErrorMessage('Unable to load autocomplete suggestions.');
        }
      }
    },
    [searchBias, userLocation]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 280);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsLoading(false);
    setErrorMessage(null);
    setActiveIndex(-1);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isFocused && e.key === 'ArrowDown') {
      setIsFocused(true);
      return;
    }

    if (suggestions.length === 0 && places.length === 0) return;
    const totalItems = query.trim().length >= 2 ? suggestions.length : places.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) {
        if (query.trim().length >= 2 && suggestions[activeIndex]) {
          handleSelectSearchResult(suggestions[activeIndex]);
        } else if (places[activeIndex]) {
          handleSelectPlace(places[activeIndex]);
        }
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    setQuery(result.name);
    setIsFocused(false);
    setSuggestions([]);
    setActiveIndex(-1);
    onSelectSearchResult(result);
  };

  const handleSelectPlace = (place: Place) => {
    setQuery(place.name);
    setIsFocused(false);
    setSuggestions([]);
    setActiveIndex(-1);
    onSelectPlace(place);
  };

  const toggleVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    if (!isListening) {
      setIsListening(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        fetchSuggestions(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      setIsListening(false);
    }
  };

  const isGpsActive = locationStatus === 'GRANTED' && !!userLocation;

  return (
    <div
      ref={containerRef}
      className="absolute top-14 sm:top-16 left-0 right-0 z-30 pointer-events-none px-3 sm:px-4"
    >
      <div className="max-w-xl mx-auto flex flex-col gap-2">
        {/* Compact Floating Search Input Bar */}
        <div
          className={`pointer-events-auto rounded-2xl border transition-all duration-200 card-shadow-md ${
            highContrast
              ? 'bg-black text-yellow-300 border-yellow-400'
              : 'bg-white/98 backdrop-blur-md text-slate-900 border-slate-200 shadow-md'
          } ${isFocused ? 'p-3 sm:p-4' : 'p-2 sm:p-2.5'}`}
        >
          {/* Desktop Only Header Title */}
          <div className="hidden lg:flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Where do you want to go?</span>
            </h2>
            {isGpsActive ? (
              <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                <span>GPS Active</span>
              </div>
            ) : (
              <div className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                <span>Location not enabled</span>
              </div>
            )}
          </div>

          {/* Search Input Bar */}
          <div
            className={`relative flex items-center gap-2 px-3 h-11 rounded-xl border transition-all ${
              isFocused
                ? 'bg-white border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isFocused}
              aria-controls="search-suggestions-list"
              aria-label="Search destination, address or landmark"
              placeholder="Where do you want to go?"
              value={query}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
            />

            {isLoading && (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" aria-label="Loading suggestions" />
            )}

            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title="Clear search input"
                aria-label="Clear search input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Mic Button on Search */}
            <button
              type="button"
              onClick={toggleVoiceRecognition}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                isListening
                  ? 'bg-purple-600 text-white animate-pulse shadow-md shadow-purple-600/30'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
              }`}
              title="Voice search destination"
              aria-label="Voice search destination"
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Desktop-Only Profile Pills Row */}
          <div className="hidden lg:block pt-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Accessibility className="w-3 h-3 text-emerald-600" />
                <span>Profile:</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700">
                {activeProfile ? PROFILE_PILLS.find((p) => p.id === activeProfile)?.badge : 'Select profile'}
              </span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
              {PROFILE_PILLS.map((p) => {
                const isSelected = activeProfile === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectProfile(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 whitespace-nowrap border transition-all active:scale-95 cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Autocomplete / Suggested Dropdown */}
        {isFocused && (
          <div
            id="search-suggestions-list"
            role="listbox"
            className={`pointer-events-auto rounded-2xl p-2 border card-shadow-lg max-h-[55vh] overflow-y-auto animate-fade-in ${
              highContrast
                ? 'bg-black text-yellow-300 border-yellow-400'
                : 'bg-white text-slate-900 border-slate-200 shadow-xl'
            }`}
          >
            {/* Geoapify Live Address Suggestions */}
            {query.trim().length >= 2 && suggestions.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Address & POI Suggestions ({suggestions.length})
                </div>
                {suggestions.map((item, idx) => {
                  const isHighlighted = idx === activeIndex;
                  const dist =
                    userLocation && item.latitude && item.longitude
                      ? calculateDistanceKm(userLocation[0], userLocation[1], item.latitude, item.longitude)
                      : null;

                  return (
                    <div
                      key={item.id || idx}
                      role="option"
                      aria-selected={isHighlighted}
                      onClick={() => handleSelectSearchResult(item)}
                      className={`p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition active:scale-98 ${
                        isHighlighted
                          ? 'bg-blue-50 text-blue-950 font-bold'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{item.name}</div>
                          <div className="text-xs text-slate-500 truncate">{item.address}</div>
                        </div>
                      </div>
                      {dist !== null && (
                        <span className="text-xs font-bold text-slate-400 font-mono-nums shrink-0">
                          {formatDistance(dist)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Verified Accessibility POIs when query is short and real verified places exist */}
            {query.trim().length < 2 && places.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Verified Accessible Places</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Municipal Audit
                  </span>
                </div>
                {places.map((place, idx) => {
                  const isHighlighted = idx === activeIndex;
                  return (
                    <div
                      key={place.id}
                      role="option"
                      aria-selected={isHighlighted}
                      onClick={() => handleSelectPlace(place)}
                      className={`p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition active:scale-98 ${
                        isHighlighted
                          ? 'bg-blue-50 text-blue-950 font-bold'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{place.name}</div>
                          <div className="text-xs text-emerald-700 font-medium truncate">
                            {place.accessibility?.has_ramp ? '✓ ADA Ramp' : ''} {place.accessibility?.has_elevator ? '• ✓ Elevator' : ''} {place.accessibility?.has_tactile_paving ? '• ✓ Tactile' : ''}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                        Verified
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State when search has no results */}
            {query.trim().length >= 2 && suggestions.length === 0 && !isLoading && (
              <div className="p-6 text-center text-slate-500 text-xs">
                <p className="font-bold text-sm text-slate-700">No destinations found for "{query}"</p>
                <p className="mt-1">Try searching for a street, landmark, metro station, or hospital.</p>
              </div>
            )}
          </div>
        )}

        {/* Search This Area Button Trigger */}
        {showSearchThisArea && onSearchThisArea && (
          <div className="pointer-events-auto flex justify-center mt-1 animate-bounce">
            <button
              type="button"
              onClick={onSearchThisArea}
              className="bg-white hover:bg-slate-50 text-blue-600 font-bold text-xs px-4 py-2 rounded-full card-shadow-md border border-blue-200 flex items-center gap-1.5 transition active:scale-95 touch-target-48 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Search this area</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
