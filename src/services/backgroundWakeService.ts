/**
 * Background Wake Word & Continuous Listening Service for J. A. R. V. I. S.
 * 
 * Features:
 * 1. Background Voice Activation for wake phrase "Hey J. A. R. V. I. S."
 * 2. Continuous listening loop with automatic recovery
 * 3. 100% Local On-Device processing via Web Audio AnalyserNode (Zero Audio Uploads)
 * 4. Speaker Biometric Verification Gate before command execution
 * 5. Screen WakeLock management to keep service active
 * 6. Quick toggle to disable background mode instantly
 */

import { BackgroundServiceConfig } from '../types';
import {
  loadVoiceProfile,
  isOwnerAuthenticated,
  quickAcousticCheck,
  setOwnerAuthenticated,
} from './voiceBiometricsService';
import { playChime } from './speechService';

const BACKGROUND_CONFIG_KEY = 'jarvis_background_service_config';

export const DEFAULT_BACKGROUND_CONFIG: BackgroundServiceConfig = {
  enabled: false,
  wakePhrase: 'Hey J. A. R. V. I. S.',
  continuousListening: true,
  requireOwnerVerificationForCommands: true,
  localAcousticCheck: true,
  wakeLockRequested: true,
  persistentNotification: true,
  batteryOptimizationGuided: false,
};

export function loadBackgroundConfig(): BackgroundServiceConfig {
  if (typeof window === 'undefined') return DEFAULT_BACKGROUND_CONFIG;
  try {
    const raw = localStorage.getItem(BACKGROUND_CONFIG_KEY);
    if (!raw) return DEFAULT_BACKGROUND_CONFIG;
    return { ...DEFAULT_BACKGROUND_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BACKGROUND_CONFIG;
  }
}

export function saveBackgroundConfig(config: BackgroundServiceConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BACKGROUND_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save background config:', e);
  }
}

// Background Wake Service State Controller
class BackgroundWakeService {
  private isRunning: boolean = false;
  private speechRecognizer: any = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private wakeLockSentinel: any = null;
  private audioMonitorInterval: any = null;

  private onWakeWordDetectedCallback: ((isOwner: boolean, confidence: number, followUpCommand?: string) => void) | null = null;
  private onAudioVolumeCallback: ((volume: number, dominantHz: number, isListening: boolean) => void) | null = null;
  private onStatusChangeCallback: ((isRunning: boolean, message: string) => void) | null = null;

  private restartTimeout: any = null;
  private intentionalStop: boolean = false;
  private isPausedForCommand: boolean = false;
  private lastWakeTriggeredAt: number = 0;
  private lastDetectedPitch: number = 0;

  /**
   * Truthfully check whether this browser/device supports continuous wake-word mic listening
   */
  public getCapabilities(): {
    supported: boolean;
    hasSpeechRecognition: boolean;
    hasMediaDevices: boolean;
    isNativeAndroidBackground: boolean;
    limitationNote: string;
  } {
    if (typeof window === 'undefined') {
      return {
        supported: false,
        hasSpeechRecognition: false,
        hasMediaDevices: false,
        isNativeAndroidBackground: false,
        limitationNote: 'Browser environment available nahi hai.',
      };
    }
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const hasSpeechRecognition = Boolean(SpeechRecognitionClass);
    const hasMediaDevices = Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const isNativeAndroidBackground = Boolean(
      (window as any).JarvisAndroid || (window as any).JarvisAndroidCallBridge
    );

    if (!hasSpeechRecognition || !hasMediaDevices) {
      return {
        supported: false,
        hasSpeechRecognition,
        hasMediaDevices,
        isNativeAndroidBackground,
        limitationNote:
          'Is browser/device me continuous Web Speech wake-word detection supported nahi hai. Tap Mic ya Type Command use karein.',
      };
    }

    return {
      supported: true,
      hasSpeechRecognition,
      hasMediaDevices,
      isNativeAndroidBackground,
      limitationNote: isNativeAndroidBackground
        ? 'Native Android foreground service + WebView wake listener active hai.'
        : 'Browser tab khuli hone par "Hey JARVIS" sunega. Browser background/screen-off hone par OS mic band kar deta hai.',
    };
  }

  /**
   * Register Event Callbacks
   */
  public registerCallbacks(callbacks: {
    onWakeWordDetected: (isOwner: boolean, confidence: number, followUpCommand?: string) => void;
    onAudioVolume?: (volume: number, dominantHz: number, isListening: boolean) => void;
    onStatusChange?: (isRunning: boolean, message: string) => void;
  }) {
    this.onWakeWordDetectedCallback = callbacks.onWakeWordDetected;
    this.onAudioVolumeCallback = callbacks.onAudioVolume || null;
    this.onStatusChangeCallback = callbacks.onStatusChange || null;
  }

  /**
   * Check if service is currently running
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Start Background Wake-Word Listening
   */
  public async start(): Promise<{ success: boolean; message: string }> {
    const caps = this.getCapabilities();
    if (!caps.supported) {
      this.notifyStatus(false, caps.limitationNote);
      return { success: false, message: caps.limitationNote };
    }

    if (this.isRunning) {
      return { success: true, message: 'Wake listening pehle se active hai.' };
    }

    this.intentionalStop = false;
    this.isPausedForCommand = false;

    // 1. Request Microphone permission explicitly
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: any) {
      this.notifyStatus(false, 'Microphone permission blocked hai.');
      return { success: false, message: 'Microphone permission allow karein.' };
    }

    // 2. Setup Web Audio AnalyserNode for local frequency tracking (Zero data uploaded)
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtxClass();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      source.connect(this.analyser);

      this.startLocalAudioMonitor();
    } catch (e) {
      console.warn('AudioContext setup warning:', e);
    }

    // 3. Acquire Screen Wake Lock if supported
    await this.acquireWakeLock();

    // 4. Start Continuous Speech Recognizer
    const started = this.initSpeechRecognition();

    if (started) {
      this.isRunning = true;
      this.notifyStatus(true, 'J. A. R. V. I. S. background wake mode active hai. "Hey J. A. R. V. I. S." sun rahi hoon.');
      playChime('start');
      return {
        success: true,
        message: 'Background listening active! Ganesh ji, aap kisi bhi samay "Hey J. A. R. V. I. S." bol sakte hain.',
      };
    } else {
      this.stop();
      return {
        success: false,
        message: 'Is browser me continuous speech recognition support nahi hai.',
      };
    }
  }

  /**
   * Stop Background Listening instantly (Respects user privacy)
   */
  public stop(): void {
    this.intentionalStop = true;
    this.isPausedForCommand = false;
    this.isRunning = false;

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.audioMonitorInterval) {
      clearInterval(this.audioMonitorInterval);
      this.audioMonitorInterval = null;
    }

    if (this.speechRecognizer) {
      try {
        this.speechRecognizer.abort();
      } catch (e) {
        console.warn('Speech recognizer abort error:', e);
      }
      this.speechRecognizer = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }

    this.releaseWakeLock();

    if (this.onAudioVolumeCallback) {
      this.onAudioVolumeCallback(0, 0, false);
    }

    this.notifyStatus(false, 'Background voice activation off kar diya gaya hai.');
  }

  /**
   * Temporarily release SpeechRecognition while command recognizer captures user input
   * (Prevents Chrome/Android WebView from throwing InvalidStateError on concurrent recognition)
   */
  public pauseForCommand(): void {
    if (!this.isRunning || this.isPausedForCommand) return;
    this.isPausedForCommand = true;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.speechRecognizer) {
      try {
        this.speechRecognizer.abort();
      } catch {}
    }
  }

  /**
   * Resume continuous wake recognition after command interaction completes
   */
  public resumeAfterCommand(): void {
    if (!this.isRunning || this.intentionalStop || !this.isPausedForCommand) return;
    this.isPausedForCommand = false;
    this.scheduleRestart(450);
  }

  /**
   * Acquire WakeLock to prevent browser / screen sleep
   */
  private async acquireWakeLock(): Promise<void> {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
      } catch (e) {
        console.warn('Could not acquire wake lock:', e);
      }
    }
  }

  /**
   * Release WakeLock
   */
  private releaseWakeLock(): void {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch (e) {}
      this.wakeLockSentinel = null;
    }
  }

  /**
   * Local real-time Audio Monitor
   * Measures input volume and dominant frequency without uploading any audio.
   */
  private startLocalAudioMonitor(): void {
    if (!this.analyser || !this.audioContext) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const sampleRate = this.audioContext.sampleRate;

    this.audioMonitorInterval = setInterval(() => {
      if (!this.analyser || !this.isRunning) return;

      this.analyser.getByteFrequencyData(freqData);

      let sum = 0;
      let maxVal = -1;
      let maxIdx = -1;

      for (let i = 0; i < bufferLength; i++) {
        const val = freqData[i];
        sum += val;
        const freq = (i * sampleRate) / (this.analyser.fftSize || 1024);
        if (freq >= 85 && freq <= 360 && val > maxVal) {
          maxVal = val;
          maxIdx = i;
        }
      }

      const avgVolume = Math.round((sum / bufferLength) * 1.5);
      let dominantHz = 0;
      if (maxIdx !== -1 && maxVal > 40) {
        dominantHz = Math.round((maxIdx * sampleRate) / (this.analyser.fftSize || 1024));
        this.lastDetectedPitch = dominantHz;
      }

      if (this.onAudioVolumeCallback) {
        this.onAudioVolumeCallback(Math.min(100, avgVolume), dominantHz, true);
      }
    }, 120);
  }

  /**
   * Initialize continuous speech recognition for wake phrase
   */
  private initSpeechRecognition(): boolean {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      return false;
    }

    try {
      this.speechRecognizer = new SpeechRecognitionClass();
      this.speechRecognizer.continuous = true;
      this.speechRecognizer.interimResults = true;
      this.speechRecognizer.lang = 'hi-IN';
      this.speechRecognizer.maxAlternatives = 2;

      this.speechRecognizer.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcript = res[0]?.transcript?.trim() || '';
          const isFinal = res.isFinal;

          this.evaluateWakeWord(transcript, isFinal);
        }
      };

      this.speechRecognizer.onerror = (event: any) => {
        const error = event.error;
        console.warn('Background speech recognition error:', error);

        if (error === 'not-allowed') {
          this.stop();
          this.notifyStatus(false, 'Mic permission denied.');
          return;
        }

        // Automatic seamless recovery unless intentionally stopped or paused for command
        if (!this.intentionalStop && this.isRunning && !this.isPausedForCommand) {
          this.scheduleRestart(800);
        }
      };

      this.speechRecognizer.onend = () => {
        if (!this.intentionalStop && this.isRunning && !this.isPausedForCommand) {
          this.scheduleRestart(400);
        }
      };

      this.speechRecognizer.start();
      return true;
    } catch (e) {
      console.error('Speech recognition init error:', e);
      return false;
    }
  }

  /**
   * Schedule automatic restart if browser engine drops connection
   */
  private scheduleRestart(delayMs: number): void {
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    this.restartTimeout = setTimeout(() => {
      if (!this.intentionalStop && this.isRunning && !this.isPausedForCommand) {
        try {
          if (this.speechRecognizer) {
            this.speechRecognizer.start();
          }
        } catch (e) {
          // If start fails, re-init
          this.initSpeechRecognition();
        }
      }
    }, delayMs);
  }

  /**
   * Evaluate if audio text matches the exact wake phrase "Hey J. A. R. V. I. S."
   */
  private evaluateWakeWord(transcript: string, isFinal: boolean): void {
    if (!transcript || this.isPausedForCommand) return;

    const lower = transcript.toLowerCase().trim();

    // Match explicit wake phrases (avoid triggering on bare single word during interim results)
    const wakePatterns = [
      'hey jarvis',
      'hey j a r v i s',
      'hey j. a. r. v. i. s.',
      'ok jarvis',
      'a jarvis',
      'hai jarvis',
      'sun jarvis',
      'suno jarvis',
      'hello jarvis',
      'jarvis assistant',
    ];

    const matchedPattern =
      wakePatterns.find((pattern) => lower.includes(pattern)) ||
      (isFinal && lower === 'jarvis' ? 'jarvis' : undefined);

    if (matchedPattern) {
      // Prevent repeated triggers on interim speech updates or quick echoes
      const now = Date.now();
      if (now - this.lastWakeTriggeredAt < 2500) {
        return;
      }

      // If user said "Hey JARVIS" with extra words not finished yet, wait briefly for final OR trigger on explicit final/complete phrase
      const patternIdx = lower.indexOf(matchedPattern);
      const afterPhrase = transcript.slice(patternIdx + matchedPattern.length).trim();
      const followUpCommand = afterPhrase.replace(/^[,\.\?! -]+/, '').trim();

      if (!isFinal && followUpCommand.length > 0 && followUpCommand.length < 4) {
        return;
      }

      this.lastWakeTriggeredAt = now;

      // Perform acoustic verification against Ganesh's enrolled profile
      const profile = loadVoiceProfile();
      let isOwner = false;
      let confidence = 0;

      if (!profile.enrolled) {
        // If profile not yet enrolled, trust initial setup with moderate score
        isOwner = true;
        confidence = 75;
      } else if (isOwnerAuthenticated()) {
        // Active verified session
        isOwner = true;
        confidence = 90;
      } else {
        // Perform quick acoustic check using detected fundamental pitch
        const acoustic = quickAcousticCheck(this.lastDetectedPitch, profile);
        isOwner = acoustic.matchesOwner;
        confidence = acoustic.confidence;
      }

      if (this.onWakeWordDetectedCallback) {
        this.onWakeWordDetectedCallback(isOwner, confidence, followUpCommand || undefined);
      }
    }
  }

  private notifyStatus(isRunning: boolean, message: string): void {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(isRunning, message);
    }
  }
}

export const backgroundWakeService = new BackgroundWakeService();
