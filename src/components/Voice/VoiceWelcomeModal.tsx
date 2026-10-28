import React, { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Radio } from 'lucide-react';
import { VoiceOrb } from './VoiceOrb';
import { voiceAssistant } from '../../services/voiceAssistant';

interface VoiceWelcomeModalProps {
  onAcceptVoice: () => void;
  onDeclineVoice: () => void;
  highContrast: boolean;
}

export const VoiceWelcomeModal: React.FC<VoiceWelcomeModalProps> = ({
  onAcceptVoice,
  onDeclineVoice,
  highContrast,
}) => {
  const hasSpokenGreetingRef = useRef(false);

  // Spoken greeting prompt on first presentation
  useEffect(() => {
    if (!hasSpokenGreetingRef.current) {
      hasSpokenGreetingRef.current = true;
      const greetingPrompt =
        'Welcome to AccessRoute Live. Would you like to continue with voice-assisted navigation? If yes, simply tap anywhere on the screen. If no, select the button below to continue without voice assistance.';
      
      voiceAssistant.speak(greetingPrompt, {
        priority: 'high',
      });
    }
  }, []);

  const handleTapAnywhere = () => {
    voiceAssistant.unlockAudio();
    onAcceptVoice();
  };

  const handleDecline = (e: React.MouseEvent) => {
    e.stopPropagation();
    voiceAssistant.stopAll();
    onDeclineVoice();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between select-none safe-top safe-bottom animate-fade-in ${
        highContrast ? 'bg-black text-yellow-300' : 'bg-slate-950 text-white'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to AccessRoute Live Voice Navigation. Tap anywhere on the screen to continue with voice assistance, or select no below."
    >
      {/* 
        PRIMARY TAP-ANYWHERE INTERACTION AREA (YES = TAP ANYWHERE)
        The entire area above the "NO" button is a giant touch/click target for visually impaired / blind users.
      */}
      <div
        onClick={handleTapAnywhere}
        role="button"
        tabIndex={0}
        aria-label="Tap anywhere to begin voice-assisted navigation"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTapAnywhere();
          }
        }}
        className="flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-6 sm:p-10 text-center cursor-pointer transition active:scale-[0.99] focus:outline-hidden group"
      >
        {/* Voice Feature Pill */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-700/80 text-purple-300 text-xs font-black uppercase tracking-wider mb-6 shadow-lg shadow-purple-950/50">
          <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>Voice-First Navigation</span>
        </div>

        {/* Product Title */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3">
          Welcome to AccessRoute Live
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-md font-medium mb-6 leading-relaxed">
          Would you like to continue with voice-assisted navigation?
        </p>

        {/* Large Hero Voice Assistant Orb */}
        <div className="my-3 relative flex flex-col items-center">
          <div className="absolute -inset-8 rounded-full bg-purple-600/20 blur-2xl animate-pulse pointer-events-none" />
          <VoiceOrb
            state="SPEAKING"
            onClick={handleTapAnywhere}
            size="hero"
            highContrast={highContrast}
          />
          <div className="mt-4 text-xs font-black uppercase tracking-widest text-purple-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Voice Guidance Ready</span>
          </div>
        </div>

        {/* Instructions banner */}
        <div className="w-full max-w-lg mt-4 p-3.5 sm:p-4 rounded-2xl bg-purple-950/50 border border-purple-800/80 text-xs sm:text-sm font-medium text-purple-200">
          If yes, simply tap anywhere on the screen. If no, select the button below to continue without voice assistance.
        </div>

        {/* TAP ANYWHERE TO BEGIN CTA */}
        <div className="mt-6 flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-purple-600 group-hover:bg-purple-500 text-white font-black text-sm sm:text-base shadow-xl shadow-purple-600/40 transition">
          <span>TAP ANYWHERE TO BEGIN</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* 
        SECONDARY SEPARATE "NO" BUTTON
        Clearly segregated at the bottom with event propagation stopped.
      */}
      <div className="w-full max-w-md mx-auto p-4 sm:pb-6 z-20">
        <button
          type="button"
          onClick={handleDecline}
          className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-bold text-xs sm:text-sm tracking-wide transition active:scale-98 touch-target-48 cursor-pointer shadow-lg flex items-center justify-center gap-2"
          aria-label="No, continue without voice assistance"
        >
          <span>NO, CONTINUE WITHOUT VOICE</span>
        </button>
      </div>
    </div>
  );
};
