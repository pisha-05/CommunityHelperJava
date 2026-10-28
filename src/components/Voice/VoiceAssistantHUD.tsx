import React from 'react';
import { 
  Volume2, VolumeX, RotateCcw, Keyboard, 
  X, Radio, Sparkles, AlertCircle, Play 
} from 'lucide-react';
import { VoiceState } from '../../services/voiceAssistant';
import { VoiceOrb } from './VoiceOrb';

interface VoiceAssistantHUDProps {
  voiceState: VoiceState;
  currentMessage: string;
  transcript: string;
  isListening: boolean;
  isMuted: boolean;
  onToggleListening: () => void;
  onToggleMute: () => void;
  onRepeat: () => void;
  onTypeInstead: () => void;
  onExitVoiceMode: () => void;
  onTestVoice?: () => void;
  highContrast: boolean;
}

export const VoiceAssistantHUD: React.FC<VoiceAssistantHUDProps> = ({
  voiceState,
  currentMessage,
  transcript,
  isListening,
  isMuted,
  onToggleListening,
  onToggleMute,
  onRepeat,
  onTypeInstead,
  onExitVoiceMode,
  onTestVoice,
  highContrast,
}) => {
  const getStatusLabel = () => {
    switch (voiceState) {
      case 'LISTENING':
        return 'Listening… Speak naturally';
      case 'THINKING':
        return 'Thinking… Processing route';
      case 'SPEAKING':
        return 'Speaking…';
      case 'ERROR':
        return 'I couldn’t hear you • Tap to retry';
      case 'UNSUPPORTED':
        return 'Voice recognition unavailable in this browser';
      case 'IDLE':
      default:
        return 'Ready • Tap Mic to Talk';
    }
  };

  return (
    <div
      className={`fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[420px] z-40 rounded-3xl p-4 sm:p-5 border transition-all duration-300 card-shadow-floating ${
        highContrast
          ? 'bg-black text-yellow-300 border-yellow-400'
          : 'bg-slate-900/95 backdrop-blur-xl text-white border-purple-500/40 shadow-2xl shadow-purple-950/40'
      }`}
      role="region"
      aria-label="Voice Navigation Assistant"
      aria-live="polite"
    >
      {/* Top Header with Purple Semantic Voice Accent */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center shadow-md shadow-purple-600/40">
            <Radio className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="font-extrabold text-xs tracking-tight text-white flex items-center gap-1.5">
              <span>AccessRoute Voice Assistant</span>
              <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.2 rounded-md">
                Live
              </span>
            </div>
            <div className="text-[11px] text-purple-300 font-semibold flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${voiceState === 'LISTENING' ? 'bg-purple-400 animate-ping' : voiceState === 'SPEAKING' ? 'bg-fuchsia-400 animate-pulse' : 'bg-purple-400'}`} />
              <span>{getStatusLabel()}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onExitVoiceMode}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95 touch-target-48 cursor-pointer"
          title="Exit Voice Mode"
          aria-label="Exit Voice-First Mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Assistant Avatar Orb & Spoken Message */}
      <div className="flex items-center gap-4 py-4">
        <div className="shrink-0">
          <VoiceOrb
            state={voiceState}
            onClick={onToggleListening}
            size="md"
            isMuted={isMuted}
            highContrast={highContrast}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-extrabold text-purple-300 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Assistant Guidance</span>
          </div>
          <div className="text-sm font-semibold text-slate-100 leading-snug break-words">
            “{currentMessage || 'Ready. Ask for a destination, profile, or route directions.'}”
          </div>

          {transcript && (
            <div className="mt-2 text-xs text-purple-200 font-medium bg-purple-950/80 border border-purple-800/80 px-3 py-1.5 rounded-xl animate-fade-in flex items-center gap-1.5">
              <span className="font-bold text-purple-400">Heard:</span>
              <span className="truncate">{transcript}</span>
            </div>
          )}
        </div>
      </div>

      {/* Large Quick Action Controls */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
        <button
          onClick={onRepeat}
          className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 touch-target-48 cursor-pointer"
          title="Repeat spoken instruction"
          aria-label="Repeat last spoken instruction"
        >
          <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
          <span>Repeat</span>
        </button>

        <button
          onClick={onToggleMute}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 touch-target-48 cursor-pointer ${
            isMuted
              ? 'bg-red-950 text-red-300 border border-red-800'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
          }`}
          title={isMuted ? 'Unmute voice' : 'Mute voice'}
          aria-label={isMuted ? 'Unmute voice guidance' : 'Mute voice guidance'}
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
          )}
          <span>{isMuted ? 'Muted' : 'Mute'}</span>
        </button>

        <button
          onClick={onTypeInstead}
          className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 touch-target-48 cursor-pointer"
          title="Type destination instead"
          aria-label="Type destination instead of voice"
        >
          <Keyboard className="w-3.5 h-3.5 text-blue-400" />
          <span>Type</span>
        </button>
      </div>
    </div>
  );
};
