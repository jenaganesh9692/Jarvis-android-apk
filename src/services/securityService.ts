/**
 * Security Service for J. A. R. V. I. S.
 * Handles Touch Alert, Motion / Pickup Detection, Spoken Warning, and In-App Secure Locking.
 */
import { TouchSecuritySettings, SecurityAlertEvent } from '../types';
import { speakWithFemaleVoice, stopSpeaking } from './speechService';

export const GANESH_WARNING_PHRASE =
  'Warning! Ye Ganesh ka mobile hai. Bina permission ise use ya check na karein. Kripya mobile ko chhod dein.';

const SETTINGS_STORAGE_KEY = 'jarvis_touch_security_settings';
const LOCK_STATE_STORAGE_KEY = 'jarvis_security_is_locked';
const ALERTS_LOG_STORAGE_KEY = 'jarvis_security_alerts_log';

export const DEFAULT_SECURITY_SETTINGS: TouchSecuritySettings = {
  enabled: true,
  isArmed: false,
  antiTheftSecurityEnabled: true,
  faceVerificationEnabled: true,
  eyeBlinkDetectionEnabled: true,
  sensitivity: 'medium',
  ownerPin: '1234',
  spokenWarningEnabled: true,
  sirenAlarmEnabled: true,
  autoLockOnTouch: true,
  autoLockOnMotion: true,
  delayBeforeArmingSeconds: 5,
  requireOwnerAuthForProtectedCommands: true,
  maxUnauthorizedAttemptsBeforeLock: 2,
  lockGracePeriodSeconds: 3,
  unauthorizedAttemptsWarningOnly: false,
};

export function loadSecuritySettings(): TouchSecuritySettings {
  if (typeof window === 'undefined') return DEFAULT_SECURITY_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SECURITY_SETTINGS;
    return { ...DEFAULT_SECURITY_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SECURITY_SETTINGS;
  }
}

export function saveSecuritySettings(settings: TouchSecuritySettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save security settings', e);
  }
}

export function getIsLocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(LOCK_STATE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setIsLocked(locked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(LOCK_STATE_STORAGE_KEY, locked ? 'true' : 'false');
  } catch {}
}

export function loadSecurityAlerts(): SecurityAlertEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ALERTS_LOG_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function logSecurityAlert(alert: Omit<SecurityAlertEvent, 'id' | 'timestamp'>): SecurityAlertEvent {
  const newEvent: SecurityAlertEvent = {
    id: `alert-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    ...alert,
  };
  try {
    const prev = loadSecurityAlerts();
    const updated = [newEvent, ...prev].slice(0, 20);
    localStorage.setItem(ALERTS_LOG_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return newEvent;
}

// Web Audio Siren System
let sirenOscillator: OscillatorNode | null = null;
let sirenLfo: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let sirenAudioCtx: AudioContext | null = null;

export function playSecuritySiren(durationSeconds: number = 8): void {
  try {
    stopSecuritySiren();
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;

    sirenAudioCtx = new AudioCtxClass();
    if (sirenAudioCtx.state === 'suspended') {
      sirenAudioCtx.resume();
    }

    const now = sirenAudioCtx.currentTime;

    // Siren tone oscillator
    sirenOscillator = sirenAudioCtx.createOscillator();
    sirenOscillator.type = 'sawtooth';
    sirenOscillator.frequency.setValueAtTime(800, now);

    // LFO to create emergency siren frequency modulation (wail)
    sirenLfo = sirenAudioCtx.createOscillator();
    sirenLfo.type = 'sine';
    sirenLfo.frequency.setValueAtTime(2.5, now); // 2.5 oscillations per sec

    const lfoGain = sirenAudioCtx.createGain();
    lfoGain.gain.setValueAtTime(350, now); // swing +/- 350Hz

    sirenLfo.connect(lfoGain);
    lfoGain.connect(sirenOscillator.frequency);

    // Master volume gain
    sirenGain = sirenAudioCtx.createGain();
    sirenGain.gain.setValueAtTime(0.22, now);
    sirenGain.gain.setValueAtTime(0.22, now + durationSeconds - 0.5);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);

    sirenOscillator.connect(sirenGain);
    sirenGain.connect(sirenAudioCtx.destination);

    sirenOscillator.start(now);
    sirenLfo.start(now);

    sirenOscillator.stop(now + durationSeconds);
    sirenLfo.stop(now + durationSeconds);

    sirenOscillator.onended = () => {
      stopSecuritySiren();
    };
  } catch (e) {
    console.warn('Siren audio error:', e);
  }
}

export function stopSecuritySiren(): void {
  try {
    if (sirenOscillator) {
      sirenOscillator.stop();
      sirenOscillator.disconnect();
      sirenOscillator = null;
    }
    if (sirenLfo) {
      sirenLfo.stop();
      sirenLfo.disconnect();
      sirenLfo = null;
    }
    if (sirenGain) {
      sirenGain.disconnect();
      sirenGain = null;
    }
    if (sirenAudioCtx && sirenAudioCtx.state !== 'closed') {
      sirenAudioCtx.close();
      sirenAudioCtx = null;
    }
  } catch (e) {}
}

/**
 * Plays the exact spoken warning specified by the user:
 * "Warning! Ye mobile Ganesh ka hai. Kripya bina permission ise use na karein."
 */
export async function playGaneshWarningSpoken(): Promise<void> {
  stopSpeaking();
  await speakWithFemaleVoice(GANESH_WARNING_PHRASE, 'serious');
}

/**
 * Attempts OS-level Android lock and truthfully evaluates success.
 */
export interface LockAttemptResult {
  inAppShieldLocked: boolean;
  nativeOsLockConfirmed: boolean;
  statusExplanationHindi: string;
  statusExplanationEnglish: string;
}

export function triggerSecurityLockAction(): LockAttemptResult {
  // Always lock the in-app shield immediately to safeguard private information
  setIsLocked(true);

  return {
    inAppShieldLocked: true,
    nativeOsLockConfirmed: false,
    statusExplanationHindi:
      'J. A. R. V. I. S. In-App Security Shield sakriya ho gaya hai (Ganesh ji ka personal data surakshit hai). Note: Android OS-level hardware screen lock ke liye native Device Administrator service zaroori hoti hai jo browser sandbox me nahi chalti.',
    statusExplanationEnglish:
      'In-App Secure Shield locked all personal data behind owner PIN. OS-level hardware lock requires native Android Device Admin service.',
  };
}

/**
 * Vibrate phone with warning pulse
 */
export function triggerHapticWarning(): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 400]);
  }
}
