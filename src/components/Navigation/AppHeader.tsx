import React from 'react';
import { 
  Menu, Settings, MapPin, Navigation, Search, LocateFixed,
  Accessibility, Eye, Baby, Footprints, Car, Bike, Sun, Moon
} from 'lucide-react';
import { MobilityProfileCode } from '../../types';

interface AppHeaderProps {
  onToggleMenu: () => void;
  locationLabel?: string;
  isLocating?: boolean;
  locationStatus?: 'IDLE' | 'REQUESTING' | 'GRANTED' | 'DENIED' | 'UNAVAILABLE' | 'ERROR';
  onRecenterLocation?: () => void;
  activeProfile: MobilityProfileCode | null;
  onOpenProfileSelector: () => void;
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
  highContrast: boolean;
  onToggleHighContrast?: () => void;
  fontScale: number;
  onIncreaseFontSize: () => void;
  onDecreaseFontSize: () => void;
  isNavigating: boolean;
  onOpenPlanRoute?: () => void;
}

const PROFILE_CONFIG: Record<MobilityProfileCode, { label: string; icon: React.ReactNode }> = {
  wheelchair: { label: 'Wheelchair', icon: <Accessibility className="w-4 h-4 text-emerald-600 shrink-0" /> },
  vision: { label: 'Visual Assist', icon: <Eye className="w-4 h-4 text-purple-600 shrink-0" /> },
  pram_elderly: { label: 'Pram / Elder', icon: <Baby className="w-4 h-4 text-indigo-600 shrink-0" /> },
  walking: { label: 'Walking', icon: <Footprints className="w-4 h-4 text-blue-600 shrink-0" /> },
  car: { label: 'Vehicle', icon: <Car className="w-4 h-4 text-sky-600 shrink-0" /> },
  scooter: { label: 'Scooter / Bike', icon: <Bike className="w-4 h-4 text-amber-600 shrink-0" /> },
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  onToggleMenu,
  locationLabel,
  isLocating,
  locationStatus = 'IDLE',
  onRecenterLocation,
  activeProfile,
  onOpenProfileSelector,
  onOpenSettings,
  onOpenCommandPalette,
  highContrast,
  onToggleHighContrast,
  fontScale,
  onIncreaseFontSize,
  onDecreaseFontSize,
  isNavigating,
  onOpenPlanRoute,
}) => {
  if (isNavigating) return null;

  const currentProfileInfo = activeProfile && PROFILE_CONFIG[activeProfile]
    ? PROFILE_CONFIG[activeProfile]
    : { label: 'Wheelchair', icon: <Accessibility className="w-4 h-4 text-emerald-600 shrink-0" /> };

  let displayLocation = 'Enable GPS';
  if (isLocating || locationStatus === 'REQUESTING') {
    displayLocation = 'Locating GPS...';
  } else if (locationStatus === 'GRANTED' && locationLabel) {
    displayLocation = locationLabel;
  } else if (locationStatus === 'DENIED') {
    displayLocation = 'Location disabled';
  } else if (locationStatus === 'UNAVAILABLE' || locationStatus === 'ERROR') {
    displayLocation = 'Location unavailable';
  }

  const isGpsActive = locationStatus === 'GRANTED';

  return (
    <header
      className={`w-full h-[74px] shrink-0 z-40 px-4 sm:px-5 lg:px-6 transition-colors duration-200 flex items-center ${
        highContrast
          ? 'bg-black text-yellow-300 border-b-2 border-yellow-400 shadow-2xl'
          : 'bg-white text-slate-900 border-b border-slate-200/90 card-shadow-sm'
      }`}
      role="banner"
    >
      <div className="w-full h-full flex items-center justify-between gap-3">
        {/* Left: Menu Trigger & Brand Name */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Menu Button */}
          <button
            type="button"
            onClick={onToggleMenu}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 border ${
              highContrast
                ? 'bg-black border-yellow-400 text-yellow-300 hover:bg-yellow-950/40'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Open navigation menu"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4 shrink-0" />
          </button>

          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-xs shrink-0">
              <Navigation className="w-4 h-4 text-white transform rotate-45 shrink-0" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <h1 className="font-black text-sm sm:text-base tracking-tight text-slate-900 leading-none whitespace-nowrap">
                AccessRoute
              </h1>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 shrink-0">
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search / Plan Route Quick Action */}
        <div className="hidden md:flex items-center flex-1 max-w-md min-w-[200px] mx-2 lg:mx-6">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className={`w-full h-10 flex items-center justify-between px-3.5 rounded-xl border text-xs transition cursor-pointer ${
              highContrast
                ? 'bg-black text-yellow-300 border-yellow-400'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500'
            }`}
            title="Search places & commands (⌘K)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">Search places, addresses, ramps...</span>
            </div>
            <kbd className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs shrink-0 ml-2">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Actions: GPS, Profile, Accessibility, Settings */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* GPS Location Indicator */}
          <button
            type="button"
            onClick={onRecenterLocation}
            className={`h-10 flex items-center gap-2 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer max-w-[130px] sm:max-w-[170px] shrink-0 ${
              highContrast
                ? 'bg-black text-yellow-300 border-yellow-400 hover:bg-yellow-950/40'
                : isGpsActive
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
            title={isGpsActive ? 'Centered on GPS location' : 'Enable browser location'}
            aria-label={`Location status: ${displayLocation}`}
          >
            <LocateFixed
              className={`w-4 h-4 shrink-0 ${
                isLocating ? 'text-amber-500 animate-pulse' : isGpsActive ? 'text-emerald-600' : 'text-amber-600'
              }`}
              aria-hidden="true"
            />
            <span className="truncate text-[11px]">{displayLocation}</span>
          </button>

          {/* Profile Selector Chip */}
          <button
            type="button"
            onClick={onOpenProfileSelector}
            className={`h-10 flex items-center gap-2 px-3 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer shrink-0 ${
              highContrast
                ? 'bg-black text-yellow-300 border-yellow-400 hover:bg-yellow-950/40'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
            }`}
            title="Change mobility profile"
            aria-label={`Current profile: ${currentProfileInfo.label}. Tap to choose profile.`}
          >
            {currentProfileInfo.icon}
            <span className="hidden xl:inline truncate text-[11px]">{currentProfileInfo.label}</span>
          </button>

          {/* Font Size Scaling Controls [ A− ] [ A+ ] */}
          <div 
            className={`hidden sm:flex items-center h-10 p-0.5 rounded-xl border shrink-0 ${
              highContrast 
                ? 'bg-black border-yellow-400' 
                : 'bg-slate-50 border-slate-200'
            }`}
            role="group"
            aria-label="Text size controls"
          >
            <button
              type="button"
              onClick={onDecreaseFontSize}
              className={`h-8 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                highContrast
                  ? 'text-yellow-300 hover:bg-yellow-950/60'
                  : 'text-slate-700 hover:bg-white hover:shadow-2xs'
              }`}
              title="Decrease text size (A−)"
              aria-label="Decrease text size"
            >
              <span className="font-mono text-[11px] leading-none">A−</span>
            </button>
            <button
              type="button"
              onClick={onIncreaseFontSize}
              className={`h-8 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                highContrast
                  ? 'text-yellow-300 hover:bg-yellow-950/60'
                  : 'text-slate-700 hover:bg-white hover:shadow-2xs'
              }`}
              title="Increase text size (A+)"
              aria-label="Increase text size"
            >
              <span className="font-mono text-[11px] leading-none">A+</span>
            </button>
          </div>

          {/* High Contrast Toggle */}
          {onToggleHighContrast && (
            <button
              type="button"
              onClick={onToggleHighContrast}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition active:scale-95 cursor-pointer shrink-0 ${
                highContrast
                  ? 'bg-yellow-400 border-yellow-400 text-black'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title={highContrast ? 'Switch to Standard Theme' : 'Enable High Contrast Mode'}
              aria-label="Toggle High Contrast"
            >
              {highContrast ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            </button>
          )}

          {/* Settings Trigger */}
          <button
            type="button"
            onClick={onOpenSettings}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition active:scale-95 cursor-pointer shrink-0 ${
              highContrast
                ? 'bg-black border-yellow-400 text-yellow-300 hover:bg-yellow-950/40'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Open Accessibility Settings"
            aria-label="Open Accessibility Settings"
          >
            <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};
