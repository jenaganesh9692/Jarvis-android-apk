import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Mic,
  Bot,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Volume2,
  Send,
  Smartphone,
  CheckCircle,
  Lock,
} from 'lucide-react';
import {
  ActiveCallInfo,
  CallAssistantSettings,
  CallControlMode,
  CallTranscriptTurn,
} from '../types';
import {
  loadCallSettings,
  saveCallSettings,
  isNativeAndroidTelephonySupported,
  requestAndroidTelephonyRoles,
  getNativeCallSnapshot,
  executeNativeAnswer,
  executeSwitchToHumanMode,
  executeSwitchToAiMode,
  executeEndCall,
  generateAndSpeakCallReply,
  isTakeOverHumanPhrase,
  isDelegateAiPhrase,
} from '../services/callAssistantService';
import { speakResponse, stopSpeaking } from '../services/speechService';

interface CallAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  externalCommand?: 'switch_human' | 'switch_ai' | 'open_call_assistant' | null;
  onClearExternalCommand?: () => void;
}

export const CallAssistantModal: React.FC<CallAssistantModalProps> = ({
  isOpen,
  onClose,
  externalCommand,
  onClearExternalCommand,
}) => {
  const [settings, setSettings] = useState<CallAssistantSettings>(loadCallSettings);
  const [isNativeTelephony, setIsNativeTelephony] = useState<boolean>(false);
  const [activeCall, setActiveCall] = useState<ActiveCallInfo>({
    status: 'idle',
    mode: 'human',
    callerName: '',
    callerNumber: '',
    isNativeBridge: false,
  });
  const [transcript, setTranscript] = useState<CallTranscriptTurn[]>([]);
  const [callerInput, setCallerInput] = useState('');
  const [voiceCommandInput, setVoiceCommandInput] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);

  const appendTurn = (speaker: CallTranscriptTurn['speaker'], text: string) => {
    setTranscript((prev) => [
      ...prev,
      {
        id: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        speaker,
        text,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  useEffect(() => {
    const native = isNativeAndroidTelephonySupported();
    setIsNativeTelephony(native);

    if (native) {
      const snap = getNativeCallSnapshot();
      if (snap) {
        setActiveCall(snap);
      }
    }

    const handleNativeCallEvent = (e: any) => {
      if (e?.detail) {
        setActiveCall((prev) => ({
          ...prev,
          status: e.detail.status || prev.status,
          mode: e.detail.mode === 'ai' ? 'ai' : 'human',
          callerName: e.detail.callerName || prev.callerName || 'Unknown Caller',
          callerNumber: e.detail.callerNumber || prev.callerNumber || '',
          isNativeBridge: true,
          osAudioNote: e.detail.osAudioNote,
        }));
      }
    };

    window.addEventListener('jarvis-native-call', handleNativeCallEvent);
    return () => {
      window.removeEventListener('jarvis-native-call', handleNativeCallEvent);
    };
  }, []);

  // Sync stored settings & native snapshot whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setSettings(loadCallSettings());
    if (isNativeAndroidTelephonySupported()) {
      const snap = getNativeCallSnapshot();
      if (snap) {
        setActiveCall(snap);
      }
    }
  }, [isOpen]);

  // Handle voice commands triggered externally ("JARVIS, mujhe baat karni hai" / "JARVIS, tum baat karo")
  useEffect(() => {
    if (!isOpen || !externalCommand) return;
    if (externalCommand === 'switch_human') {
      handleSwitchToHuman();
    } else if (externalCommand === 'switch_ai') {
      handleSwitchToAi();
    }
    onClearExternalCommand?.();
  }, [isOpen, externalCommand]);

  const updateSettings = (updates: Partial<CallAssistantSettings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    saveCallSettings(next);
  };

  const handleSimulateIncomingCall = () => {
    setTranscript([]);
    setStatusNotice(null);
    setActiveCall({
      status: 'ringing',
      mode: 'human',
      callerName: 'Rohan Sharma',
      callerNumber: '+91 98765 43210',
      callerRelation: 'Saved Contact',
      startedAt: Date.now(),
      isNativeBridge: isNativeTelephony,
    });
    appendTurn('system', 'Incoming call detected: Rohan Sharma (+91 98765 43210). Waiting for your authorization to answer.');
  };

  const handleAnswerCall = async (useAiMode: boolean) => {
    if (useAiMode && (!settings.answerAuthorized || !settings.aiVoiceAuthorized)) {
      setStatusNotice(
        'Pehle dono authorizations ON karein: "Allow JARVIS to Answer Calls" aur "Allow JARVIS to Speak to Caller".'
      );
      return;
    }

    const res = executeNativeAnswer(useAiMode);
    if (!res.ok) {
      setStatusNotice(res.reason || 'Call answer failed.');
      return;
    }

    const targetMode: CallControlMode = useAiMode ? 'ai' : 'human';
    setActiveCall((prev) => ({
      ...prev,
      status: 'active',
      mode: targetMode,
      startedAt: Date.now(),
    }));
    setStatusNotice(null);

    if (targetMode === 'ai') {
      appendTurn('system', 'AI ANNOUNCEMENT: JARVIS is speaking to the caller on your behalf.');
      setIsGeneratingReply(true);
      try {
        const greeting = await generateAndSpeakCallReply(
          { ...activeCall, status: 'active', mode: 'ai' },
          '',
          transcript,
          true
        );
        appendTurn('ai', greeting);
      } catch (err: any) {
        setStatusNotice(err.message);
      } finally {
        setIsGeneratingReply(false);
      }
    } else {
      appendTurn('system', 'Direct Human Conversation active: Your phone microphone has full manual control.');
    }
  };

  const handleSwitchToHuman = () => {
    executeSwitchToHumanMode();
    setActiveCall((prev) => ({ ...prev, mode: 'human' }));
    setStatusNotice('Human Control Active: Call audio turant aapko de diya gaya hai.');
    appendTurn('system', 'Command: "JARVIS, mujhe baat karni hai" — Manual human call control restored immediately.');
  };

  const handleSwitchToAi = async () => {
    if (!settings.aiVoiceAuthorized) {
      setStatusNotice('Authorization Denied: "Allow JARVIS to Speak to Caller" OFF hai. Bina aapki anumati AI caller se baat nahi karegi.');
      await speakResponse('Sir, AI call voice abhi authorized nahi hai. Pehle permission on karein.', false, 'serious');
      return;
    }

    const res = executeSwitchToAiMode();
    if (!res.ok) {
      setStatusNotice(res.reason || 'AI mode switch failed.');
      return;
    }

    setActiveCall((prev) => ({ ...prev, mode: 'ai' }));
    setStatusNotice('AI SPEAKING MODE: J. A. R. V. I. S. ab caller ko AI voice ke roop me jawab de rahi hai.');
    appendTurn('system', 'Command: "JARVIS, tum baat karo" — Clear announcement: AI is now speaking instead of user.');

    setIsGeneratingReply(true);
    try {
      const reply = await generateAndSpeakCallReply(
        { ...activeCall, mode: 'ai' },
        '',
        transcript,
        true
      );
      appendTurn('ai', reply);
    } catch (err: any) {
      setStatusNotice(err.message);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleEndCall = () => {
    executeEndCall();
    setActiveCall((prev) => ({ ...prev, status: 'ended', mode: 'human' }));
    appendTurn('system', 'Call ended manually. Audio returned to normal standby.');
    setTimeout(() => {
      setActiveCall({
        status: 'idle',
        mode: 'human',
        callerName: '',
        callerNumber: '',
        isNativeBridge: isNativeTelephony,
      });
    }, 1500);
  };

  const handleCallerUtteranceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callerInput.trim()) return;
    const text = callerInput.trim();
    setCallerInput('');
    appendTurn('caller', text);

    if (activeCall.mode !== 'ai') {
      appendTurn('system', 'Human mode active — JARVIS stayed silent so you can speak directly.');
      return;
    }

    if (!settings.aiVoiceAuthorized) {
      setStatusNotice('AI voice authorization OFF hai.');
      return;
    }

    setIsGeneratingReply(true);
    try {
      const reply = await generateAndSpeakCallReply(activeCall, text, transcript, true);
      appendTurn('ai', reply);
    } catch (err: any) {
      setStatusNotice(err.message);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleVoicePhraseTest = async (phrase: string) => {
    if (isTakeOverHumanPhrase(phrase)) {
      handleSwitchToHuman();
      return;
    }
    if (isDelegateAiPhrase(phrase)) {
      await handleSwitchToAi();
      return;
    }
    setStatusNotice(`Unrecognized call phrase: "${phrase}". Try "JARVIS, mujhe baat karni hai" or "JARVIS, tum baat karo".`);
  };

  if (!isOpen) return null;

  const isCallOngoing = activeCall.status === 'ringing' || activeCall.status === 'active';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="J. A. R. V. I. S. AI Call Assistant"
    >
      <div className="w-full max-w-lg bg-[#030814] border border-cyan-500/35 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[94vh] overflow-hidden shadow-[0_0_50px_rgba(0,212,255,0.2)]">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-cyan-500/20 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-hud text-xs sm:text-sm font-bold tracking-wider text-cyan-200 truncate">
                AI CALL ASSISTANT
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Authorized Call Answering • Instant Human Control
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close Call Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3.5 overflow-y-auto custom-scrollbar text-xs">
          {/* Truthful Runtime Banner (Native Android Telephony vs Web Browser) */}
          <div
            className={`p-3 rounded-2xl border space-y-1.5 ${
              isNativeTelephony
                ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/30 border-amber-500/35 text-amber-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>
                  {isNativeTelephony
                    ? 'Native Android InCallService Connected'
                    : 'Web Browser Preview Mode (Telephony Limitation)'}
                </span>
              </span>
              {isNativeTelephony && (
                <button
                  type="button"
                  onClick={() => requestAndroidTelephonyRoles()}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shrink-0"
                >
                  Set Default Dialer Role
                </button>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              {isNativeTelephony
                ? 'Native Android InCallService & CallScreeningService active hain. Note: Unrooted Android OS cellular uplink TX injection block karta hai, isliye AI speech speaker/telecom audio route se chalti hai aur aap 1-tap me direct human mic par aa sakte hain.'
                : 'Browser security ki wajah se Chrome/WebView seedha cellular phone call audio intercept nahi kar sakta. Real incoming calls ke liye Android APK (JarvisInCallService + CallScreeningService + JarvisCallBridge) use karein. Yahan aap authorizations, caller simulation aur voice handoff test kar sakte hain.'}
            </p>
          </div>

          {/* Explicit Status Notice */}
          {statusNotice && (
            <div className="p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-400/40 text-cyan-100 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
              <span>{statusNotice}</span>
            </div>
          )}

          {/* Active Call Card & WHO IS SPEAKING Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PhoneIncoming
                  className={`w-4 h-4 ${
                    isCallOngoing ? 'text-cyan-300 animate-pulse' : 'text-slate-500'
                  }`}
                />
                <span className="font-hud text-[11px] tracking-wider text-slate-200">
                  {activeCall.status === 'ringing'
                    ? 'INCOMING CALL RINGING'
                    : activeCall.status === 'active'
                    ? 'CALL CONNECTED'
                    : activeCall.status === 'ended'
                    ? 'CALL ENDED'
                    : 'NO ACTIVE CALL'}
                </span>
              </div>

              {activeCall.status === 'idle' && (
                <button
                  type="button"
                  onClick={handleSimulateIncomingCall}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 text-white text-[11px] font-bold transition active:scale-95"
                >
                  Test Incoming Call
                </button>
              )}
            </div>

            {isCallOngoing && (
              <>
                {/* Caller Information Card */}
                <div className="p-3 rounded-xl bg-[#040c1a] border border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {activeCall.callerName || 'Unknown Caller'}
                    </div>
                    <div className="font-mono-hud text-xs text-cyan-300">
                      {activeCall.callerNumber || 'Private / Hidden Number'}
                    </div>
                  </div>
                  {activeCall.callerRelation && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                      {activeCall.callerRelation}
                    </span>
                  )}
                </div>

                {/* Clear Announcement: AI Speaking vs Human Speaking */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    activeCall.mode === 'ai'
                      ? 'bg-cyan-950/70 border-cyan-400 text-cyan-100 shadow-[0_0_20px_rgba(0,212,255,0.25)]'
                      : 'bg-emerald-950/60 border-emerald-400/60 text-emerald-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {activeCall.mode === 'ai' ? (
                      <Bot className="w-5 h-5 text-cyan-300 animate-pulse shrink-0" />
                    ) : (
                      <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-hud text-[11px] font-bold tracking-wider">
                        {activeCall.mode === 'ai'
                          ? 'AI IS SPEAKING INSTEAD OF YOU'
                          : 'DIRECT HUMAN CONVERSATION ACTIVE'}
                      </div>
                      <div className="text-[10px] text-slate-300">
                        {activeCall.mode === 'ai'
                          ? 'Caller hears J. A. R. V. I. S. AI announcement & replies'
                          : 'Your hardware microphone is live — speak directly'}
                      </div>
                    </div>
                  </div>
                  {activeCall.mode === 'ai' && (
                    <Volume2 className="w-4 h-4 text-cyan-300 animate-bounce shrink-0" />
                  )}
                </div>

                {/* Primary Answer / Control Buttons */}
                {activeCall.status === 'ringing' ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAnswerCall(false)}
                      className="min-h-[44px] px-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Answer (You)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAnswerCall(true)}
                      className="min-h-[44px] px-2 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition disabled:opacity-40"
                      title="Requires Answer + AI Voice Authorization"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>AI Answer</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleEndCall}
                      className="min-h-[44px] px-2 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Instant Manual Human Override — ALWAYS enabled, never blocked */}
                    <button
                      type="button"
                      onClick={handleSwitchToHuman}
                      className="w-full min-h-[46px] px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>"JARVIS, mujhe baat karni hai" (Manual Human Takeover)</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleSwitchToAi}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
                      >
                        <Bot className="w-4 h-4 text-cyan-300" />
                        <span>"JARVIS, tum baat karo"</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleEndCall}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
                      >
                        <PhoneOff className="w-4 h-4 text-red-400" />
                        <span>End Call</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Caller Utterance Simulation / Live Call Log */}
                {activeCall.status === 'active' && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <form onSubmit={handleCallerUtteranceSubmit} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={callerInput}
                        onChange={(e) => setCallerInput(e.target.value)}
                        placeholder="Caller dialogue test (e.g. 'Ganesh ghar par hain?')"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="submit"
                        disabled={!callerInput.trim() || isGeneratingReply}
                        className="min-h-[38px] px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 flex items-center gap-1 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}

            {/* Live Transcript */}
            {transcript.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-black/50 border border-slate-800 custom-scrollbar">
                {transcript.map((turn) => (
                  <div key={turn.id} className="text-[11px] leading-relaxed">
                    <span
                      className={`font-bold mr-1.5 ${
                        turn.speaker === 'ai'
                          ? 'text-cyan-300'
                          : turn.speaker === 'caller'
                          ? 'text-amber-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {turn.speaker === 'ai'
                        ? 'J. A. R. V. I. S. (AI):'
                        : turn.speaker === 'caller'
                        ? 'Caller:'
                        : 'System:'}
                    </span>
                    <span className="text-slate-200">{turn.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Voice Phrase Switching Quick Test */}
          <div className="p-3 rounded-2xl bg-slate-950/75 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-200">
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              <span>Voice Command Switching Test</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={voiceCommandInput}
                onChange={(e) => setVoiceCommandInput(e.target.value)}
                placeholder='Type: "JARVIS, mujhe baat karni hai" or "JARVIS, tum baat karo"'
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => {
                  if (voiceCommandInput.trim()) {
                    handleVoicePhraseTest(voiceCommandInput.trim());
                    setVoiceCommandInput('');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-950 border border-cyan-500/40 text-cyan-200 font-semibold"
              >
                Run
              </button>
            </div>
          </div>

          {/* Explicit Authorization Controls */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-cyan-500/25 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-hud text-[11px] font-bold tracking-wider text-cyan-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                EXPLICIT USER AUTHORIZATIONS
              </span>
              <span className="text-[10px] text-slate-400">Default: OFF (Safe)</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer gap-3">
              <div>
                <div className="font-semibold text-slate-100">Allow JARVIS to Answer Incoming Calls</div>
                <div className="text-[10px] text-slate-400">
                  Off hone par JARVIS kabhi khud call pick nahi karegi
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.answerAuthorized}
                onChange={(e) => updateSettings({ answerAuthorized: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 shrink-0"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer gap-3">
              <div>
                <div className="font-semibold text-slate-100">Allow JARVIS to Speak to Caller (AI Voice)</div>
                <div className="text-[10px] text-slate-400">
                  Sirf aapki explicit permission par hi AI caller se baat karegi
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.aiVoiceAuthorized}
                onChange={(e) => updateSettings({ aiVoiceAuthorized: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 shrink-0"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer gap-3">
              <div>
                <div className="font-semibold text-slate-100 flex items-center gap-1">
                  <span>Announce AI Identity Clearly to Caller</span>
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="text-[10px] text-slate-400">
                  Caller ko hamesha bataya jayega ki J. A. R. V. I. S. AI bol rahi hai
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.announceAiIdentity}
                onChange={(e) => updateSettings({ announceAiIdentity: e.target.checked })}
                className="w-4 h-4 accent-emerald-400 shrink-0"
              />
            </label>

            {/* Privacy Guarantee: Never record/store without consent */}
            <div className="p-2.5 rounded-xl bg-black/60 border border-slate-800 space-y-1.5">
              <label className="flex items-center justify-between cursor-pointer gap-3">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Call Audio Recording Consent</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.recordingConsent}
                  onChange={(e) => updateSettings({ recordingConsent: e.target.checked })}
                  className="w-4 h-4 accent-amber-400 shrink-0"
                />
              </label>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Privacy Guarantee: Bina explicit consent ke call audio kabhi record, store ya share nahi hoti. Transcript keval current session me dikhta hai.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
