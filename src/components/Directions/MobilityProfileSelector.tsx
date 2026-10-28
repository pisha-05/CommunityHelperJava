import React from 'react';
import { 
  Check, X, Accessibility, Eye, Baby, Footprints, Car, Bike
} from 'lucide-react';
import { MobilityProfileCode } from '../../types';
import { saveProfileToStorage } from '../../utils/storage';

interface MobilityProfileSelectorProps {
  selectedProfile: MobilityProfileCode | null;
  onSelectProfile: (profile: MobilityProfileCode) => void;
  onClose?: () => void;
  highContrast?: boolean;
}

interface ProfileDefinition {
  code: MobilityProfileCode;
  title: string;
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
  description: string;
  keyFeatures: string[];
}

export const PROFILES: ProfileDefinition[] = [
  {
    code: 'wheelchair',
    title: 'Wheelchair / Mobility Aid',
    icon: <Accessibility className="w-5 h-5 text-emerald-600" />,
    badge: '100% Step-Free',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    description: 'Finds routes with zero stairs, verified ADA ramps, operational station elevators, and inclines strictly under 5%.',
    keyFeatures: ['Avoids stairs & escalators', 'Certified ramps & lifts', 'Gentle slope (<5%)'],
  },
  {
    code: 'vision',
    title: 'Visual Assistance',
    icon: <Eye className="w-5 h-5 text-purple-600" />,
    badge: 'Spoken + Tactile',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
    description: 'Prioritizes continuous tactile guiding paving, detailed spoken street names, audio chime landmarks, and barrier alerts.',
    keyFeatures: ['Continuous tactile paving', 'Detailed voice cues', 'Hazard alerts'],
  },
  {
    code: 'pram_elderly',
    title: 'Pram / Stroller / Elder-Friendly',
    icon: <Baby className="w-5 h-5 text-indigo-600" />,
    badge: 'Smooth Low-Gradient',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    description: 'Curates smooth walking corridors with gentle inclines, step-free curb cuts, safe pedestrian crossings, and no cracked footpaths.',
    keyFeatures: ['No stairs / step-free', 'Gentle gradients', 'Safer road crossings'],
  },
  {
    code: 'walking',
    title: 'Walking Pedestrian',
    icon: <Footprints className="w-5 h-5 text-blue-600" />,
    badge: 'Pedestrian Sidewalks',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    description: 'Standard pedestrian paths through municipal sidewalks, public walkways, parks, and designated pedestrian crossings.',
    keyFeatures: ['Sidewalks & walkways', 'Direct crossings', 'Pedestrian plazas'],
  },
  {
    code: 'car',
    title: 'Vehicle / Driving',
    icon: <Car className="w-5 h-5 text-sky-600" />,
    badge: 'Live Traffic & Roads',
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
    description: 'Calculates real vehicle routes using legal road networks, vehicle restrictions, live traffic conditions, turn-by-turn maneuvers, and avoids road closures.',
    keyFeatures: ['Vehicle road network', 'Live traffic integration', 'Real driving maneuvers'],
  },
  {
    code: 'scooter',
    title: 'Two-Wheeler / Scooter / Bike',
    icon: <Bike className="w-5 h-5 text-amber-600" />,
    badge: 'Smooth Paved Street',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'Fast transit corridors prioritizing smooth paved surfaces, avoiding pedestrian-only zones and impassable barricades.',
    keyFeatures: ['Paved street paths', 'Avoids stairs', 'Fastest travel time'],
  },
];

export const MobilityProfileSelector: React.FC<MobilityProfileSelectorProps> = ({
  selectedProfile,
  onSelectProfile,
  onClose,
  highContrast,
}) => {
  const handleSelect = (code: MobilityProfileCode) => {
    saveProfileToStorage(code);
    onSelectProfile(code);
    if (onClose) onClose();
  };

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 border flex flex-col gap-4 card-shadow-floating transition-all ${
        highContrast
          ? 'bg-black text-yellow-300 border-yellow-400'
          : 'bg-white text-slate-900 border-slate-200/90'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Accessibility Profile Selector"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-2">
            <span>How will you be travelling?</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Choose your mobility profile to personalize accessible routing and step-free guidance
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95 touch-target-48 cursor-pointer"
            aria-label="Close profile selector"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[62vh] overflow-y-auto pr-1">
        {PROFILES.map((p) => {
          const isSelected = selectedProfile === p.code;

          return (
            <button
              key={p.code}
              type="button"
              onClick={() => handleSelect(p.code)}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all duration-150 cursor-pointer active:scale-98 relative group ${
                isSelected
                  ? 'bg-blue-50/90 border-blue-600 text-blue-950 ring-2 ring-blue-500/30 shadow-sm'
                  : 'bg-slate-50/60 hover:bg-white border-slate-200 hover:border-slate-300 text-slate-800'
              }`}
              aria-pressed={isSelected}
              aria-label={`${p.title} profile. ${p.description}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isSelected ? 'bg-white border-blue-200 shadow-xs' : 'bg-white border-slate-200'
                  }`}>
                    {p.icon}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                      {p.title}
                    </h4>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border mt-1 ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-300 text-transparent group-hover:border-slate-400'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                {p.description}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/80">
                {p.keyFeatures.map((feat, i) => (
                  <span
                    key={i}
                    className="text-[10px] text-slate-600 font-semibold bg-white px-2 py-0.5 rounded-md border border-slate-200"
                  >
                    ✓ {feat}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
