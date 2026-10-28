import React from 'react';
import { Mic, MicOff, AlertCircle, Volume2, Sparkles, RefreshCw } from 'lucide-react';
import { VoiceState } from '../../services/voiceAssistant';

interface VoiceOrbProps {
  state: VoiceState;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  isMuted?: boolean;
  highContrast?: boolean;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  onClick,
  size = 'md',
  isMuted = false,
  highContrast = false,
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    hero: 'w-28 h-28 sm:w-32 sm:h-32',
  }[size];

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
    hero: 'w-14 h-14',
  }[size];

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Outer pulsating wave rings for LISTENING / SPEAKING states */}
      {state === 'LISTENING' && (
        <>
          <div className="absolute -inset-4 sm:-inset-6 rounded-full bg-purple-500/20 animate-ping pointer-events-none" />
          <div className="absolute -inset-2.5 sm:-inset-3.5 rounded-full bg-purple-500/30 animate-pulse pointer-events-none" />
        </>
      )}

      {state === 'THINKING' && (
        <div className="absolute -inset-2 rounded-full border-2 border-purple-400 border-t-transparent animate-spin pointer-events-none" />
      )}

      {state === 'SPEAKING' && (
        <div className="absolute -inset-3 rounded-full bg-purple-600/25 animate-pulse pointer-events-none" />
      )}

      {/* Main Interactive Orb Button */}
      <button
        type="button"
        onClick={onClick}
        className={`relative ${sizeClasses} rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer touch-target-48 shadow-xl ${
          highContrast
            ? 'bg-black text-yellow-300 border-2 border-yellow-400'
            : state === 'LISTENING'
            ? 'bg-linear-to-tr from-purple-700 via-purple-600 to-indigo-500 text-white ring-4 ring-purple-400/50 shadow-purple-600/50 scale-105'
            : state === 'THINKING'
            ? 'bg-linear-to-tr from-indigo-700 via-purple-700 to-purple-600 text-white ring-2 ring-indigo-400'
            : state === 'SPEAKING'
            ? 'bg-linear-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 text-white ring-4 ring-fuchsia-400/40 shadow-purple-600/40'
            : state === 'ERROR'
            ? 'bg-amber-600 text-white ring-2 ring-amber-400'
            : state === 'UNSUPPORTED'
            ? 'bg-slate-700 text-slate-400 border border-slate-600'
            : 'bg-linear-to-tr from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white ring-2 ring-purple-500/40 shadow-purple-900/40 hover:scale-105'
        }`}
        aria-label={`Voice Assistant Status: ${state}. Tap to toggle voice commands.`}
      >
        {state === 'LISTENING' ? (
          <div className="flex items-center justify-center">
            <Mic className={`${iconSizes} animate-bounce text-white`} />
          </div>
        ) : state === 'THINKING' ? (
          <RefreshCw className={`${iconSizes} animate-spin text-purple-200`} />
        ) : state === 'SPEAKING' ? (
          <div className="flex items-center gap-0.5 sm:gap-1">
            <span className="w-1 h-3 sm:h-4 bg-white rounded-full animate-soundwave-1" />
            <span className="w-1 h-5 sm:h-7 bg-white rounded-full animate-soundwave-2" />
            <span className="w-1 h-3 sm:h-5 bg-white rounded-full animate-soundwave-3" />
            <span className="w-1 h-6 sm:h-8 bg-white rounded-full animate-soundwave-4" />
            <span className="w-1 h-2 sm:h-3 bg-white rounded-full animate-soundwave-2" />
          </div>
        ) : state === 'ERROR' ? (
          <AlertCircle className={`${iconSizes} text-amber-200`} />
        ) : isMuted ? (
          <MicOff className={`${iconSizes} text-slate-300`} />
        ) : (
          <Sparkles className={`${iconSizes} text-purple-200 group-hover:rotate-12 transition-transform`} />
        )}
      </button>
    </div>
  );
};
