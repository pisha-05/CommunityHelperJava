import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Navigation, Accessibility, Bookmark, ShieldAlert, 
  Settings, Volume2, Eye, MapPin, X, ArrowRight, Sparkles 
} from 'lucide-react';
import { MobilityProfileCode, Place } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProfile: (profile: MobilityProfileCode) => void;
  onSelectPlace: (place: Place) => void;
  onOpenReportModal: () => void;
  onOpenSettings: () => void;
  onOpenScreenReaderTable: () => void;
  places: Place[];
  highContrast: boolean;
}

interface CommandItem {
  id: string;
  category: 'Actions' | 'Profiles' | 'Saved & Verified Places' | 'Tools';
  title: string;
  subtitle: string;
  icon: any;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectProfile,
  onSelectPlace,
  onOpenReportModal,
  onOpenSettings,
  onOpenScreenReaderTable,
  places,
  highContrast,
}) => {
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build command list
  const commands: CommandItem[] = [
    {
      id: 'prof-wheelchair',
      category: 'Profiles',
      title: 'Switch to Wheelchair Mode',
      subtitle: 'Zero stairs, slope <5%, verified ADA ramps and lifts',
      icon: Accessibility,
      action: () => { onSelectProfile('wheelchair'); onClose(); }
    },
    {
      id: 'prof-vision',
      category: 'Profiles',
      title: 'Switch to Visual Assistance Mode',
      subtitle: 'Tactile paving guidance, chime cues, spoken landmarks',
      icon: Eye,
      action: () => { onSelectProfile('vision'); onClose(); }
    },
    {
      id: 'prof-pram',
      category: 'Profiles',
      title: 'Switch to Pram & Stroller / Elder Mode',
      subtitle: 'Smooth low-gradient paths, avoids broken curbs',
      icon: Accessibility,
      action: () => { onSelectProfile('pram_elderly'); onClose(); }
    },
    {
      id: 'action-report',
      category: 'Actions',
      title: 'Report Road Hazard / Barrier',
      subtitle: 'Submit a broken ramp, elevator issue, or obstruction',
      icon: ShieldAlert,
      action: () => { onOpenReportModal(); onClose(); }
    },
    {
      id: 'action-settings',
      category: 'Tools',
      title: 'Open Settings & Preferences',
      subtitle: 'Configure speech verbosity, units, contrast mode',
      icon: Settings,
      action: () => { onOpenSettings(); onClose(); }
    },
    {
      id: 'action-table',
      category: 'Tools',
      title: 'Open Accessible Screen Reader Table',
      subtitle: 'Accessible tabular directions view for NVDA/JAWS/TalkBack',
      icon: Eye,
      action: () => { onOpenScreenReaderTable(); onClose(); }
    },
    ...places.map((p) => ({
      id: `place-${p.id}`,
      category: 'Saved & Verified Places' as const,
      title: p.name,
      subtitle: `${p.address} • Verified accessible`,
      icon: MapPin,
      action: () => { onSelectPlace(p); onClose(); }
    }))
  ];

  const filteredCommands = commands.filter((c) => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.subtitle.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter' && filteredCommands[activeIndex]) {
      e.preventDefault();
      filteredCommands[activeIndex].action();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className={`w-full max-w-xl rounded-2xl border overflow-hidden flex flex-col ${
          highContrast
            ? 'bg-black text-yellow-300 border-yellow-400'
            : 'bg-white text-slate-900 border-slate-200 shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, destination, or feature..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
          />
          <kbd className="hidden sm:inline px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-mono text-xs border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[50vh] overflow-y-auto p-2 flex flex-col gap-1">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === activeIndex;

              return (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition cursor-pointer active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSelected
                      ? 'bg-blue-50/90 border border-blue-400 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                        {cmd.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {cmd.subtitle}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                    {cmd.category}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-semibold">
              No matching commands or places found for "{search}"
            </div>
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium px-4">
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>AccessRoute Live Quick Palette</span>
        </div>
      </div>
    </div>
  );
};
