import {
  ActiveCallInfo,
  CallAssistantSettings,
  CallControlMode,
  CallTranscriptTurn,
} from '../types';
import { speakResponse, stopSpeaking } from './speechService';

const CALL_SETTINGS_KEY = 'jarvis_call_assistant_settings_v1';

export const DEFAULT_CALL_SETTINGS: CallAssistantSettings = {
  // Strictly false by default: JARVIS never answers or speaks without explicit user authorization
  answerAuthorized: false,
  aiVoiceAuthorized: false,
  announceAiIdentity: true,
  // Never record, store, or share call audio without explicit consent
  recordingConsent: false,
  busyMessage: 'Ganesh ji abhi thode busy hain. Main unki AI assistant J. A. R. V. I. S. aapka zaroori sandesh note kar rahi hoon.',
};

interface NativeCallBridgeInterface {
  isNativeAndroidTelephonySupported?: () => boolean;
  setAuthorizations?: (answerAuth: boolean, aiVoiceAuth: boolean, recordingConsent: boolean) => void;
  requestDialerAndScreeningRoles?: () => boolean;
  answerIncomingCall?: (useAiMode: boolean) => string;
  switchToHumanControl?: () => string;
  switchToAiControl?: () => string;
  speakAiReply?: (text: String) => boolean;
  endActiveCall?: () => boolean;
  getActiveCallSnapshotJson?: () => string;
}

function getNativeBridge(): NativeCallBridgeInterface | null {
  if (typeof window === 'undefined') return null;
  const bridge = (window as any).JarvisAndroidCallBridge as NativeCallBridgeInterface | undefined;
  return bridge || null;
}

export function isNativeAndroidTelephonySupported(): boolean {
  const bridge = getNativeBridge();
  return Boolean(bridge && bridge.isNativeAndroidTelephonySupported?.());
}

export function loadCallSettings(): CallAssistantSettings {
  if (typeof window === 'undefined') return DEFAULT_CALL_SETTINGS;
  try {
    const raw = localStorage.getItem(CALL_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_CALL_SETTINGS,
        ...parsed,
        // Recording remains opt-in
        recordingConsent: Boolean(parsed.recordingConsent),
      };
    }
  } catch (e) {
    console.warn('Error loading call assistant settings:', e);
  }
  return DEFAULT_CALL_SETTINGS;
}

export function saveCallSettings(settings: CallAssistantSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CALL_SETTINGS_KEY, JSON.stringify(settings));
    const bridge = getNativeBridge();
    bridge?.setAuthorizations?.(
      settings.answerAuthorized,
      settings.aiVoiceAuthorized,
      settings.recordingConsent
    );
  } catch (e) {
    console.warn('Error saving call assistant settings:', e);
  }
}

export function syncNativeCallAuthorizations(): void {
  const settings = loadCallSettings();
  const bridge = getNativeBridge();
  bridge?.setAuthorizations?.(
    settings.answerAuthorized,
    settings.aiVoiceAuthorized,
    settings.recordingConsent
  );
}

export function requestAndroidTelephonyRoles(): boolean {
  const bridge = getNativeBridge();
  if (bridge?.requestDialerAndScreeningRoles) {
    return bridge.requestDialerAndScreeningRoles();
  }
  return false;
}

export function getNativeCallSnapshot(): ActiveCallInfo | null {
  const bridge = getNativeBridge();
  if (!bridge?.getActiveCallSnapshotJson) return null;
  try {
    const raw = bridge.getActiveCallSnapshotJson();
    const parsed = JSON.parse(raw);
    return {
      status: parsed.status || 'idle',
      mode: parsed.mode === 'ai' ? 'ai' : 'human',
      callerName: parsed.callerName || 'Unknown Caller',
      callerNumber: parsed.callerNumber || '',
      isNativeBridge: Boolean(parsed.isNativeBridge),
      osAudioNote: parsed.osAudioNote,
    };
  } catch {
    return null;
  }
}

export function isTakeOverHumanPhrase(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    lower.includes('mujhe baat karni hai') ||
    lower.includes('mujhe baat karna hai') ||
    lower.includes('main baat karunga') ||
    lower.includes('main baat karungi') ||
    lower.includes('human mode') ||
    lower.includes('manual control') ||
    lower.includes('call mujhe do')
  );
}

export function isDelegateAiPhrase(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    lower.includes('tum baat karo') ||
    lower.includes('aap baat karo') ||
    lower.includes('ai baat kare') ||
    lower.includes('jarvis baat karo') ||
    lower.includes('ai call mode')
  );
}

export function executeNativeAnswer(useAiMode: boolean): { ok: boolean; mode: CallControlMode; reason?: string } {
  const settings = loadCallSettings();
  if (!settings.answerAuthorized) {
    return {
      ok: false,
      mode: 'human',
      reason: 'User authorization required: Allow JARVIS to answer incoming calls first.',
    };
  }
  if (useAiMode && !settings.aiVoiceAuthorized) {
    return {
      ok: false,
      mode: 'human',
      reason: 'AI voice authorization required: Allow JARVIS to speak to callers first.',
    };
  }

  const bridge = getNativeBridge();
  if (bridge?.answerIncomingCall) {
    try {
      const res = JSON.parse(bridge.answerIncomingCall(useAiMode));
      return {
        ok: Boolean(res.ok),
        mode: res.mode === 'ai' ? 'ai' : 'human',
        reason: res.reason,
      };
    } catch {
      return { ok: false, mode: 'human', reason: 'Native InCallService call error' };
    }
  }

  // Browser preview state fallback (truthfully marked as non-native preview)
  return { ok: true, mode: useAiMode ? 'ai' : 'human' };
}

export function executeSwitchToHumanMode(): { ok: boolean } {
  // Always succeed immediately — never block user manual control
  stopSpeaking();
  const bridge = getNativeBridge();
  if (bridge?.switchToHumanControl) {
    try {
      bridge.switchToHumanControl();
    } catch {}
  }
  return { ok: true };
}

export function executeSwitchToAiMode(): { ok: boolean; reason?: string } {
  const settings = loadCallSettings();
  if (!settings.aiVoiceAuthorized) {
    return {
      ok: false,
      reason: 'AI Voice Authorization OFF hai. Pehle user authorization ON karein.',
    };
  }

  const bridge = getNativeBridge();
  if (bridge?.switchToAiControl) {
    try {
      const res = JSON.parse(bridge.switchToAiControl());
      if (!res.ok) {
        return { ok: false, reason: res.reason || 'Native Android InCallService active nahi hai.' };
      }
    } catch {}
  }
  return { ok: true };
}

export function executeEndCall(): boolean {
  stopSpeaking();
  const bridge = getNativeBridge();
  if (bridge?.endActiveCall) {
    try {
      return bridge.endActiveCall();
    } catch {}
  }
  return true;
}

export async function generateAndSpeakCallReply(
  call: ActiveCallInfo,
  callerUtterance: string,
  history: CallTranscriptTurn[],
  shouldSpeak: boolean = true
): Promise<string> {
  const settings = loadCallSettings();
  if (!settings.aiVoiceAuthorized) {
    throw new Error('AI call voice authorization is disabled by user.');
  }

  const response = await fetch('/api/assistant/call-reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callerName: call.callerName || 'Caller',
      callerNumber: call.callerNumber || '',
      callerUtterance,
      conversationHistory: history.slice(-6).map((t) => ({ speaker: t.speaker, text: t.text })),
      isAiAuthorized: settings.aiVoiceAuthorized,
      announceAiIdentity: settings.announceAiIdentity,
      busyMessage: settings.busyMessage,
    }),
  });

  if (!response.ok) {
    throw new Error(`Call reply API returned ${response.status}`);
  }

  const data = await response.json();
  const replyText: string =
    data.textHindi ||
    'Namaste, main J. A. R. V. I. S. AI assistant bol rahi hoon Ganesh ji ki or se. Kripya apna sandesh batayein.';

  if (shouldSpeak) {
    const bridge = getNativeBridge();
    if (bridge?.speakAiReply && isNativeAndroidTelephonySupported()) {
      bridge.speakAiReply(replyText);
    } else {
      await speakResponse(replyText, false, 'warm');
    }
  }

  return replyText;
}
