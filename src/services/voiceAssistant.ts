// Voice-First Accessibility Assistant Service
import { MobilityProfileCode, Place, RouteResult, SearchResult } from '../types';

export type VoiceState = 'IDLE' | 'READY' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR' | 'UNSUPPORTED';

export type VoicePriority = 'emergency' | 'hazard' | 'navigation' | 'route' | 'general' | 'high' | 'normal';

export type VoiceIntent =
  | { type: 'CONFIRM_YES' }
  | { type: 'CONFIRM_NO' }
  | { type: 'SEARCH_DESTINATION'; query: string }
  | { type: 'CHANGE_PROFILE'; profile: MobilityProfileCode }
  | { type: 'PREFERENCE_AVOID_STAIRS' }
  | { type: 'PREFERENCE_AVOID_SLOPES' }
  | { type: 'PREFERENCE_PREFER_RAMPS' }
  | { type: 'START_NAVIGATION' }
  | { type: 'STOP_NAVIGATION' }
  | { type: 'REPEAT_INSTRUCTION' }
  | { type: 'CURRENT_LOCATION' }
  | { type: 'NEXT_INSTRUCTION' }
  | { type: 'REMAINING_TIME' }
  | { type: 'REMAINING_DISTANCE' }
  | { type: 'ANOTHER_ROUTE' }
  | { type: 'REPORT_HAZARD'; details?: string }
  | { type: 'OPEN_SAVED_PLACES' }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'EMERGENCY' }
  | { type: 'SPEAK_FASTER' }
  | { type: 'SPEAK_SLOWER' }
  | { type: 'UNKNOWN'; raw: string };

export class VoiceAssistantService {
  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  private isRecognitionSupported: boolean = false;
  private isListening: boolean = false;
  private speechRate: number = 0.95;
  private isMuted: boolean = false;
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;
  private preferredVoiceName: string = '';
  private onStateChangeCallback?: (state: VoiceState) => void;
  private onTranscriptCallback?: (transcript: string, isFinal: boolean) => void;
  private onIntentCallback?: (intent: VoiceIntent) => void;
  private reconnectTimer: any = null;
  private keepAliveTimer: any = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private isAudioUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedRate = localStorage.getItem('accessroute_speech_rate');
        if (savedRate) this.speechRate = parseFloat(savedRate) || 0.95;
        const savedMuted = localStorage.getItem('accessroute_speech_muted');
        if (savedMuted) this.isMuted = savedMuted === 'true';
        const savedVoice = localStorage.getItem('accessroute_preferred_voice');
        if (savedVoice) this.preferredVoiceName = savedVoice;
      } catch {}

      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => {
            this.loadVoices();
          };
        }
      }

      this.initRecognition();

      // Automatically unlock audio on first document interaction anywhere
      const unlockHandler = () => {
        this.unlockAudio();
      };
      window.addEventListener('click', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });
      window.addEventListener('touchstart', unlockHandler, { passive: true });
    }
  }

  private loadVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    try {
      return this.synth.getVoices();
    } catch {
      return [];
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.loadVoices();
  }

  public selectPreferredVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.loadVoices();
    if (voices.length === 0) return null;

    // 1. Check user explicitly saved preferred voice
    if (this.preferredVoiceName) {
      const saved = voices.find((v) => v.name === this.preferredVoiceName);
      if (saved) return saved;
    }

    // 2. Filter for English voices
    const enVoices = voices.filter((v) => v.lang.startsWith('en'));
    const candidateList = enVoices.length > 0 ? enVoices : voices;

    // 3. Prefer natural / professional female-presenting voice identifiers
    const femaleIndicators = [
      'female', 'samantha', 'victoria', 'karen', 'zira', 
      'jenny', 'aria', 'natural', 'google uk english female',
      'google us english', 'tessa', 'moira', 'serena'
    ];

    const femaleMatch = candidateList.find((v) =>
      femaleIndicators.some((indicator) => v.name.toLowerCase().includes(indicator))
    );
    if (femaleMatch) return femaleMatch;

    // 4. Default to first system English voice
    return candidateList[0] || voices[0] || null;
  }

  public setPreferredVoice(voiceName: string) {
    this.preferredVoiceName = voiceName;
    try {
      localStorage.setItem('accessroute_preferred_voice', voiceName);
    } catch {}
  }

  private initRecognition() {
    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;
        this.isRecognitionSupported = true;
        this.setupRecognitionListeners();
      }
    } catch (e) {
      console.debug('Speech recognition init error:', e);
      this.isRecognitionSupported = false;
    }
  }

  public setCallbacks(
    onStateChange?: (state: VoiceState) => void,
    onTranscript?: (transcript: string, isFinal: boolean) => void,
    onIntent?: (intent: VoiceIntent) => void
  ) {
    this.onStateChangeCallback = onStateChange;
    this.onTranscriptCallback = onTranscript;
    this.onIntentCallback = onIntent;
  }

  private setupRecognitionListeners() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStateChangeCallback?.('LISTENING');
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const activeText = finalTranscript || interimTranscript;
      if (activeText.trim()) {
        this.onTranscriptCallback?.(activeText.trim(), Boolean(finalTranscript));
      }

      if (finalTranscript.trim()) {
        const parsedIntent = this.parseIntent(finalTranscript.trim());
        this.onStateChangeCallback?.('THINKING');
        this.onIntentCallback?.(parsedIntent);
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.isListening = false;
        this.onStateChangeCallback?.('ERROR');
      } else if (event.error !== 'no-speech') {
        console.debug('Speech recognition event:', event.error);
      }
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          if (this.isListening && this.recognition) {
            try {
              this.recognition.start();
            } catch {
              setTimeout(() => {
                if (this.isListening && this.recognition) {
                  try { this.recognition.start(); } catch {}
                }
              }, 400);
            }
          }
        }, 200);
      } else {
        this.onStateChangeCallback?.('READY');
      }
    };
  }

  public unlockAudio() {
    if (this.isAudioUnlocked) return;
    this.isAudioUnlocked = true;
    if (!this.synth) return;
    try {
      this.synth.resume();
      const silentUtterance = new SpeechSynthesisUtterance(' ');
      silentUtterance.volume = 0.01;
      this.synth.speak(silentUtterance);
    } catch (e) {
      console.debug('Audio unlock error:', e);
    }
  }

  public speak(
    text: string, 
    options?: { onComplete?: () => void; priority?: VoicePriority }
  ) {
    if (this.isMuted || !this.synth) {
      options?.onComplete?.();
      return;
    }

    // Deduplication check: prevent identical rapid prompts
    const now = Date.now();
    if (this.lastSpokenText === text && now - this.lastSpokenTime < 1500 && options?.priority !== 'emergency') {
      options?.onComplete?.();
      return;
    }

    try {
      this.unlockAudio();
      this.synth.resume();

      // High-priority interruptions cancel stale speech
      const priority = options?.priority || 'general';
      if (['emergency', 'hazard', 'navigation', 'high'].includes(priority)) {
        this.synth.cancel();
      }

      if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);

      this.lastSpokenText = text;
      this.lastSpokenTime = now;
      this.onStateChangeCallback?.('SPEAKING');

      const utterance = new SpeechSynthesisUtterance(text);
      this.activeUtterance = utterance;
      utterance.rate = this.speechRate;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      const voice = this.selectPreferredVoice();
      if (voice) {
        utterance.voice = voice;
      }

      // Chrome speech keepalive
      this.keepAliveTimer = setInterval(() => {
        if (!this.synth || !this.synth.speaking) {
          clearInterval(this.keepAliveTimer);
        } else {
          this.synth.pause();
          this.synth.resume();
        }
      }, 5000);

      utterance.onend = () => {
        if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
        this.activeUtterance = null;
        this.onStateChangeCallback?.(this.isListening ? 'LISTENING' : 'READY');
        options?.onComplete?.();
      };

      utterance.onerror = (e) => {
        if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
        this.activeUtterance = null;
        console.debug('Speech utterance event:', e);
        this.onStateChangeCallback?.(this.isListening ? 'LISTENING' : 'READY');
        options?.onComplete?.();
      };

      this.synth.speak(utterance);
    } catch (err) {
      console.debug('Speech synthesis attempt failed:', err);
      options?.onComplete?.();
    }
  }

  public stopAll() {
    this.stopListening();
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
    this.onStateChangeCallback?.('READY');
  }

  public repeatLast() {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText, { priority: 'navigation' });
    } else {
      this.speak('I am ready. Where would you like to go?', { priority: 'general' });
    }
  }

  public startListening() {
    if (!this.recognition || !this.isRecognitionSupported) {
      this.initRecognition();
      if (!this.recognition) return;
    }
    try {
      this.unlockAudio();
      this.isListening = true;
      this.recognition.start();
    } catch {
      // Transitioning
    }
  }

  public stopListening() {
    this.isListening = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.onStateChangeCallback?.('READY');
  }

  public toggleListening(): boolean {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      this.startListening();
      return true;
    }
  }

  public setSpeechRate(rate: number) {
    this.speechRate = Math.max(0.7, Math.min(1.5, rate));
    try {
      localStorage.setItem('accessroute_speech_rate', String(this.speechRate));
    } catch {}
  }

  public getSpeechRate(): number {
    return this.speechRate;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('accessroute_speech_muted', String(this.isMuted));
    } catch {}
    if (this.isMuted && this.synth) {
      this.synth.cancel();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public isVoiceRecognitionSupported(): boolean {
    return this.isRecognitionSupported;
  }

  public parseIntent(rawText: string): VoiceIntent {
    const text = rawText.toLowerCase().trim();

    // 1. Yes / Confirmations
    if (/^(yes|yeah|yep|sure|correct|proceed|confirm|ok|okay|let's go|start|use this|first one|the nearby one)$/i.test(text)) {
      return { type: 'CONFIRM_YES' };
    }

    // 2. No / Cancellations
    if (/^(no|nope|cancel|stop|nevermind|go back|don't|do not)$/i.test(text)) {
      return { type: 'CONFIRM_NO' };
    }

    // 3. Repeat
    if (/repeat|say that again|what did you say|say again|pardon|repeat that/i.test(text)) {
      return { type: 'REPEAT_INSTRUCTION' };
    }

    // 4. Rate adjustments
    if (/speak faster|faster/i.test(text)) {
      this.setSpeechRate(this.speechRate + 0.15);
      return { type: 'SPEAK_FASTER' };
    }
    if (/speak slower|slower/i.test(text)) {
      this.setSpeechRate(this.speechRate - 0.15);
      return { type: 'SPEAK_SLOWER' };
    }

    // 5. Navigation Control
    if (/start navigation|start navigating|begin navigation|navigate now|let's go/i.test(text)) {
      return { type: 'START_NAVIGATION' };
    }
    if (/stop navigation|end navigation|exit navigation|cancel navigation/i.test(text)) {
      return { type: 'STOP_NAVIGATION' };
    }

    // 6. Navigation Telemetry Queries
    if (/where am i|current location|my location|where are we|use my location|use current location/i.test(text)) {
      return { type: 'CURRENT_LOCATION' };
    }
    if (/next turn|what is the next turn|next instruction|what next/i.test(text)) {
      return { type: 'NEXT_INSTRUCTION' };
    }
    if (/how much longer|how long|eta|when will i arrive|time remaining/i.test(text)) {
      return { type: 'REMAINING_TIME' };
    }
    if (/how far|remaining distance|distance left|how far is left/i.test(text)) {
      return { type: 'REMAINING_DISTANCE' };
    }
    if (/another route|find another route|alternate route|different route/i.test(text)) {
      return { type: 'ANOTHER_ROUTE' };
    }

    // 7. Profile Switching
    if (/wheelchair/i.test(text)) {
      return { type: 'CHANGE_PROFILE', profile: 'wheelchair' };
    }
    if (/visual assist|blind|vision|low vision/i.test(text)) {
      return { type: 'CHANGE_PROFILE', profile: 'vision' };
    }
    if (/pram|stroller|elder|walker/i.test(text)) {
      return { type: 'CHANGE_PROFILE', profile: 'pram_elderly' };
    }
    if (/car|drive|driving|automobile|vehicle/i.test(text)) {
      return { type: 'CHANGE_PROFILE', profile: 'car' };
    }
    if (/scooter/i.test(text)) {
      return { type: 'CHANGE_PROFILE', profile: 'scooter' };
    }
    if (/walking|pedestrian/i.test(text)) {
      return { type: 'CHANGE_PROFILE', profile: 'walking' };
    }

    // 8. Routing Accessibility Preferences
    if (/avoid stairs|no stairs|step free|step-free/i.test(text)) {
      return { type: 'PREFERENCE_AVOID_STAIRS' };
    }
    if (/avoid steep|gentle slope|low slope|no slopes/i.test(text)) {
      return { type: 'PREFERENCE_AVOID_SLOPES' };
    }
    if (/prefer ramps|use ramps|ramps/i.test(text)) {
      return { type: 'PREFERENCE_PREFER_RAMPS' };
    }

    // 9. Hazard Reporting
    if (/report|blocked sidewalk|broken ramp|broken elevator|hazard here|barrier ahead|blocked footpath/i.test(text)) {
      return { type: 'REPORT_HAZARD', details: rawText };
    }

    // 10. Emergency
    if (/emergency|help me|call for help|safe zone/i.test(text)) {
      return { type: 'EMERGENCY' };
    }

    // 11. Saved Places / Settings
    if (/saved places|favorites|my places/i.test(text)) {
      return { type: 'OPEN_SAVED_PLACES' };
    }
    if (/settings|preferences/i.test(text)) {
      return { type: 'OPEN_SETTINGS' };
    }

    // 12. Search / Destination
    const destinationPrefixMatch = text.match(
      /(?:take me to|navigate to|go to|find|search for|directions to|route to)\s+(.+)/i
    );
    if (destinationPrefixMatch && destinationPrefixMatch[1]) {
      return { type: 'SEARCH_DESTINATION', query: destinationPrefixMatch[1].trim() };
    }

    if (text.length >= 3 && !/^(hello|hi|hey|ok|okay|test)$/i.test(text)) {
      return { type: 'SEARCH_DESTINATION', query: rawText };
    }

    return { type: 'UNKNOWN', raw: rawText };
  }
}

export const voiceAssistant = new VoiceAssistantService();
