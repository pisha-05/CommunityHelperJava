import React, { useEffect } from 'react';
import { 
  Navigation, Compass, Accessibility, Bookmark, History, 
  ShieldAlert, AlertTriangle, Layers, Volume2, Settings, 
  HelpCircle, AlertOctagon, Plus, ChevronLeft, ChevronRight, 
  X, Check, Sparkles, MapPin, Eye, Radio, Search, Mic, 
  Bell, FileText, Activity, Calendar
} from 'lucide-react';
import { MobilityProfileCode, CommunityReport, EventZone } from '../../types';

export type SidebarSection = 
  | 'explore'
  | 'navigation'
  | 'accessible-routes'
  | 'profile'
  | 'saved-places'
  | 'recent-trips'
  | 'hazards'
  | 'events'
  | 'reports'
  | 'report-issue'
  | 'map-layers'
  | 'route-details'
  | 'voice'
  | 'diagnostics'
  | 'settings'
  | 'notifications'
  | 'help'
  | 'emergency';

interface GlobalSidebarProps {
  activeSection: SidebarSection;
  onNavigate: (section: SidebarSection) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedDesktop: boolean;
  onToggleCollapseDesktop: () => void;
  activeProfile: MobilityProfileCode | null;
  onOpenProfileSelector: () => void;
  onOpenReportModal: () => void;
  onOpenPlanRoute: () => void;
  onOpenSettings: () => void;
  onOpenSavedPlaces: () => void;
  onOpenCommandPalette: () => void;
  onToggleDiagnostics?: () => void;
  reports: CommunityReport[];
  events: EventZone[];
  highContrast: boolean;
  isNavigating: boolean;
}

const PROFILE_LABELS: Record<MobilityProfileCode, { name: string; badge: string }> = {
  wheelchair: { name: 'Wheelchair Mode', badge: 'Step-Free' },
  vision: { name: 'Visual Navigation', badge: 'Tactile' },
  pram_elderly: { name: 'Pram / Walker', badge: 'Low-Slope' },
  walking: { name: 'Walking', badge: 'Sidewalks' },
  car: { name: 'Vehicle', badge: 'Traffic' },
  scooter: { name: 'Scooter / Bike', badge: 'Paved' },
};

export const GlobalSidebar: React.FC<GlobalSidebarProps> = ({
  activeSection,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  isCollapsedDesktop,
  onToggleCollapseDesktop,
  activeProfile,
  onOpenProfileSelector,
  onOpenReportModal,
  onOpenPlanRoute,
  onOpenSettings,
  onOpenSavedPlaces,
  onOpenCommandPalette,
  onToggleDiagnostics,
  reports,
  events,
  highContrast,
  isNavigating,
}) => {
  const activeHazardsCount = reports.filter((r) => r.status !== 'RESOLVED' && r.status !== 'EXPIRED').length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenMobile, onCloseMobile]);

  const handleItemClick = (section: SidebarSection) => {
    onNavigate(section);
    onCloseMobile();
  };

  const NavButton = ({
    section,
    icon: Icon,
    iconColor,
    label,
    badge,
    badgeColor,
    onClick,
  }: {
    section: SidebarSection;
    icon: any;
    iconColor?: string;
    label: string;
    badge?: string | number;
    badgeColor?: string;
    onClick?: () => void;
  }) => {
    const isActive = activeSection === section;

    return (
      <button
        type="button"
        onClick={onClick || (() => handleItemClick(section))}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer active:scale-98 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          isActive
            ? highContrast
              ? 'bg-yellow-400 text-black shadow-md'
              : 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
            : highContrast
            ? 'text-yellow-200 hover:bg-slate-900 hover:text-yellow-400'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
        } ${isCollapsedDesktop ? 'lg:justify-center lg:px-2' : ''}`}
        title={label}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon
          className={`w-4 h-4 shrink-0 ${
            isActive
              ? highContrast
                ? 'text-black'
                : 'text-white'
              : iconColor || 'text-slate-500'
          }`}
        />

        {!isCollapsedDesktop && (
          <div className="flex-1 flex items-center justify-between min-w-0 text-left">
            <span className="truncate">{label}</span>
            {badge !== undefined && (
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  badgeColor || 'bg-slate-100 text-slate-700'
                }`}
              >
                {badge}
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  const SectionHeading = ({ title }: { title: string }) => {
    if (isCollapsedDesktop) return null;
    return (
      <div className="px-3 pt-3 pb-1 text-[10px] font-black tracking-wider uppercase text-slate-400">
        {title}
      </div>
    );
  };

  const currentProfileName = activeProfile && PROFILE_LABELS[activeProfile]
    ? PROFILE_LABELS[activeProfile].name
    : 'How will you travel?';

  const currentProfileBadge = activeProfile && PROFILE_LABELS[activeProfile]
    ? PROFILE_LABELS[activeProfile].badge
    : undefined;

  const sidebarBody = (
    <div
      className={`h-full flex flex-col justify-between overflow-y-auto no-scrollbar p-3.5 transition-all duration-200 ${
        highContrast
          ? 'bg-black text-yellow-300 border-r border-yellow-400'
          : 'bg-white text-slate-900 border-r border-slate-200/90 shadow-sm'
      }`}
    >
      {/* 1. Header & Logo */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/25 font-bold text-sm">
              <Accessibility className="w-5 h-5 text-white" />
            </div>
            {!isCollapsedDesktop && (
              <div>
                <div className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-1">
                  <span>AccessRoute</span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded-md font-extrabold border border-blue-200">
                    LIVE
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold">
                  Accessible Navigation System
                </div>
              </div>
            )}
          </div>

          {/* Close Drawer Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 touch-target-48 cursor-pointer"
            aria-label="Close navigation menu"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Primary "+ Plan a route" Action Button */}
        <div className="py-3">
          <button
            type="button"
            onClick={onOpenPlanRoute}
            className={`w-full py-3 px-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs tracking-wide flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 transition active:scale-98 touch-target-48 cursor-pointer ${
              isCollapsedDesktop ? 'lg:px-2' : ''
            }`}
            title="Plan accessible route"
          >
            <Plus className="w-4 h-4" />
            {!isCollapsedDesktop && <span>+ Plan a route</span>}
          </button>
        </div>

        {/* 3. Navigation Sections */}
        <div className="flex flex-col gap-0.5">
          {/* SECTION: EXPLORE */}
          <SectionHeading title="EXPLORE" />
          <NavButton section="explore" icon={Compass} iconColor="text-blue-600" label="Explore Map" />
          <NavButton section="navigation" icon={Navigation} iconColor="text-blue-600" label="Live Navigation" />
          <NavButton section="accessible-routes" icon={Accessibility} iconColor="text-emerald-600" label="Accessible Routes" />

          {/* SECTION: MY ACCESS */}
          <SectionHeading title="MY ACCESS" />
          <NavButton
            section="profile"
            icon={Accessibility}
            iconColor="text-emerald-600"
            label={currentProfileName}
            badge={currentProfileBadge}
            onClick={onOpenProfileSelector}
          />
          <NavButton section="saved-places" icon={Bookmark} iconColor="text-indigo-600" label="Saved Places" onClick={onOpenSavedPlaces} />
          <NavButton section="recent-trips" icon={History} iconColor="text-slate-600" label="Recent Trips" onClick={onOpenSavedPlaces} />

          {/* SECTION: LIVE INFORMATION */}
          <SectionHeading title="LIVE INFORMATION" />
          <NavButton
            section="hazards"
            icon={ShieldAlert}
            iconColor="text-red-600"
            label="Live Hazards"
            badge={activeHazardsCount > 0 ? `${activeHazardsCount} Active` : undefined}
            badgeColor="bg-red-50 text-red-700 border border-red-200"
          />
          <NavButton
            section="events"
            icon={Calendar}
            iconColor="text-purple-600"
            label="Events on Route"
            badge={events.length > 0 ? `${events.length} Active` : undefined}
            badgeColor="bg-purple-50 text-purple-700 border border-purple-200"
          />
          <NavButton section="reports" icon={AlertTriangle} iconColor="text-amber-600" label="Community Reports" />
          <NavButton section="report-issue" icon={Plus} iconColor="text-amber-600" label="Report an Issue" onClick={onOpenReportModal} />

          {/* SECTION: TOOLS */}
          <SectionHeading title="TOOLS" />
          <NavButton section="map-layers" icon={Layers} iconColor="text-teal-600" label="Map Layers" />
          <NavButton section="route-details" icon={FileText} iconColor="text-blue-600" label="Route Details" />
          <NavButton section="voice" icon={Radio} iconColor="text-purple-600" label="Voice Assistant" />
          {onToggleDiagnostics && (
            <NavButton section="diagnostics" icon={Activity} iconColor="text-slate-600" label="Developer Diagnostics" onClick={onToggleDiagnostics} />
          )}

          {/* SECTION: ACCOUNT */}
          <SectionHeading title="ACCOUNT" />
          <NavButton section="settings" icon={Settings} iconColor="text-slate-600" label="Settings & Voice" onClick={onOpenSettings} />
          <NavButton section="help" icon={HelpCircle} iconColor="text-slate-600" label="Help & Accessibility" onClick={onOpenSettings} />
        </div>
      </div>

      {/* 4. Bottom Emergency Trigger */}
      <div className="pt-3 border-t border-slate-100 mt-3">
        <button
          type="button"
          onClick={() => handleItemClick('emergency')}
          className={`w-full py-2.5 px-3 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-extrabold text-xs flex items-center justify-center gap-2 transition active:scale-98 touch-target-48 cursor-pointer ${
            isCollapsedDesktop ? 'lg:px-2' : ''
          }`}
          title="Emergency Assistance"
        >
          <AlertOctagon className="w-4 h-4 text-red-600" />
          {!isCollapsedDesktop && <span>Emergency Assistance</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* On-Demand Off-Canvas Drawer (Desktop & Mobile) */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
        >
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity cursor-pointer"
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <div className="relative w-80 max-w-[85vw] h-full z-10 animate-slide-right bg-white shadow-2xl">
            {sidebarBody}
          </div>
        </div>
      )}
    </>
  );
};
