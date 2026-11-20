import React, { useState, useEffect } from 'react';
import {
  Flashlight,
  Wifi,
  Bluetooth,
  Sliders,
  Sun,
  Volume2,
  Battery,
  ShieldAlert,
  Vibrate,
  Smartphone,
  ExternalLink,
  Eye,
  Info,
  Lock,
  Unlock,
  Bell,
  KeyRound,
  Play,
  RotateCcw,
  CheckCircle,
  Mic,
  Activity,
  Sparkles,
  Download,
  BookOpen,
  Heart,
  Camera,
  Phone,
} from 'lucide-react';
import { toggleFlashlight } from '../services/torchService';
import { TouchSecuritySettings, FemaleVoiceOption, CompanionPersonalityMode } from '../types';
import {
  GANESH_WARNING_PHRASE,
  playGaneshWarningSpoken,
} from '../services/securityService';
import {
  VoiceSettings,
  loadVoiceSettings,
  saveVoiceSettings,
  getAvailableFemaleVoices,
  speakWithFemaleVoice,
  speakResponse,
  setGlobalVoiceSource,
} from '../services/speechService';
import {
  loadCompanionMode,
  saveCompanionMode,
} from '../services/visionCompanionService';

interface SettingsControllerProps {
  onSpeakStatus?: (msg: string) => void;
  securitySettings: TouchSecuritySettings;
  onUpdateSecuritySettings: (settings: TouchSecuritySettings) => void;
  onTriggerTestAlert: () => void;
  onOpenVoiceProfile?: () => void;
  onOpenFaceProfile?: () => void;
  onOpenVoiceSelector?: () => void;
  onOpenCamera?: () => void;
  onOpenCallAssistant?: () => void;
  onOpenApkGuide?: () => void;
  onOpenAlarms?: () => void;
  onOpenProjectMemory?: () => void;
  screenBrightness?: number;
  onBrightnessChange?: (val: number) => void;
  isBackgroundListening?: boolean;
  onToggleBackgroundListening?: () => void;
  backgroundAudioVolume?: number;
  backgroundDominantHz?: number;
}

export const SettingsController: React.FC<SettingsControllerProps> = ({
  onSpeakStatus,
  securitySettings,
  onUpdateSecuritySettings,
  onTriggerTestAlert,
  onOpenVoiceProfile,
  onOpenFaceProfile,
  onOpenVoiceSelector,
  onOpenCamera,
  onOpenCallAssistant,
  onOpenApkGuide,
  onOpenAlarms,
  onOpenProjectMemory,
  screenBrightness = 100,
  onBrightnessChange,
  isBackgroundListening = false,
  onToggleBackgroundListening,
  backgroundAudioVolume = 0,
  backgroundDominantHz = 0,
}) => {
  const [torchOn, setTorchOn] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSentinel, setWakeLockSentinel] = useState<any>(null);
  const [screenFlash, setScreenFlash] = useState(false);
  const [torchMsg, setTorchMsg] = useState('');

  // AI Girlfriend Companion Personality state
  const [companionMode, setCompanionMode] = useState<CompanionPersonalityMode>(loadCompanionMode);

  // Security PIN editing state
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [newPin, setNewPin] = useState(securitySettings.ownerPin);
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');

  // Female Voice settings
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(loadVoiceSettings);
  const [availableVoices, setAvailableVoices] = useState<FemaleVoiceOption[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  useEffect(() => {
    const voices = getAvailableFemaleVoices();
    setAvailableVoices(voices);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        setAvailableVoices(getAvailableFemaleVoices());
      };
    }
  }, []);

  const handleToggleTorch = async () => {
    const res = await toggleFlashlight();
    setTorchOn(res.state);
    setTorchMsg(res.message);
    if (onSpeakStatus) onSpeakStatus(res.message);

    if (!res.success) {
      setScreenFlash(!screenFlash);
    }
  };

  const handleToggleWakeLock = async () => {
    if ('wakeLock' in navigator) {
      if (!wakeLockActive) {
        try {
          const sentinel = await (navigator as any).wakeLock.request('screen');
          setWakeLockSentinel(sentinel);
          setWakeLockActive(true);
          if (onSpeakStatus) onSpeakStatus('Screen wake lock mode active hai.');
        } catch (e) {
          console.warn('Wake lock error:', e);
        }
      } else {
        if (wakeLockSentinel) {
          wakeLockSentinel.release();
          setWakeLockSentinel(null);
        }
        setWakeLockActive(false);
        if (onSpeakStatus) onSpeakStatus('Screen wake lock off kar diya gaya hai.');
      }
    } else {
      setTorchMsg('Screen wake-lock is browser me supported nahi hai.');
    }
  };

  const handleVibrate = () => {
    if (navigator.vibrate) {
      navigator.vibrate([150, 50, 150]);
      setTorchMsg('Vibration test safal raha.');
    } else {
      setTorchMsg('Vibration hardware access browser me block hai.');
    }
  };

  const handlePlayWarningAudio = async () => {
    setTorchMsg(`Playing warning: "${GANESH_WARNING_PHRASE}"`);
    await playGaneshWarningSpoken();
  };

  const handleSavePin = () => {
    if (newPin.trim().length >= 4) {
      onUpdateSecuritySettings({
        ...securitySettings,
        ownerPin: newPin.trim(),
      });
      setIsEditingPin(false);
      setPinSuccessMsg('Ganesh ji ka naya owner PIN save ho gaya!');
      setTimeout(() => setPinSuccessMsg(''), 3000);
    }
  };

  const handleVoiceSettingChange = (updates: Partial<VoiceSettings>) => {
    const updated = { ...voiceSettings, ...updates };
    setVoiceSettings(updated);
    saveVoiceSettings(updated);
  };

  const handleTestVoiceSpeech = async () => {
    setIsTestingVoice(true);
    const activeLabel = voiceSettings.sourceType === 'custom_recorded'
      ? 'custom recorded voice'
      : voiceSettings.voiceName || 'active AI voice';
    await speakResponse(
      `Namaste Ganesh sir! Main J. A. R. V. I. S. hoon. Aapki selected ${activeLabel} bilkul ready hai.`,
      false,
      'warm'
    );
    setIsTestingVoice(false);
  };

  return (
    <div className="space-y-4">
      {/* Flashlight screen simulator banner if hardware torch unavailable */}
      {screenFlash && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-4">
          <p className="text-slate-900 font-bold text-sm mb-4">
            Screen Flashlight (Safed Roshni)
          </p>
          <button
            onClick={() => setScreenFlash(false)}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            Roshni Band Karein
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            J. A. R. V. I. S. Settings & Security Guard
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Vivo Y20G phone controls, Female Voice, Biometrics & Anti-Theft Guard
          </p>
        </div>
        {onOpenProjectMemory && (
          <button
            onClick={onOpenProjectMemory}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            title="Open Project Instructions, Architecture & Changelog"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Project Memory</span>
          </button>
        )}
      </div>

      {torchMsg && (
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-cyan-300">
          {torchMsg}
        </div>
      )}

      {/* SECTION 0: BACKGROUND VOICE WAKE & ANDROID SERVICE ("Hey J. A. R. V. I. S.") */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-3.5 shadow-lg shadow-cyan-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                Background Voice Wake & Service
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  "Hey J. A. R. V. I. S."
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Bina app khole background me aawaz se activate karein
              </p>
            </div>
          </div>
          {onToggleBackgroundListening && (
            <button
              onClick={onToggleBackgroundListening}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                isBackgroundListening
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {isBackgroundListening ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>Active</span>
                </>
              ) : (
                <>
                  <span>Turn ON</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Live Audio / Frequency Monitor if active */}
        {isBackgroundListening && (
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-emerald-300">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                Listening for "Hey J. A. R. V. I. S." (Local On-Device)
              </span>
              {backgroundDominantHz > 0 && (
                <span className="font-mono text-cyan-300">{backgroundDominantHz} Hz</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              J. A. R. V. I. S. screen par ya background me ready hai. Wake phrase bolte hi assistant prompt karegi aur command sunegi.
            </p>
          </div>
        )}

        {/* Android Foreground Service & Battery Optimization Controls */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-cyan-300 flex items-center gap-1">
              <Battery className="w-3.5 h-3.5 text-amber-400" />
              Android Battery & Foreground Service Guide:
            </span>
            <span className="text-[10px] text-slate-400">Vivo Y20G / Android 11+</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Android OS background apps ko battery bachane ke liye sleep me daal deta hai. True continuous background listening ke liye Battery Optimization disable karein.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                if (onSpeakStatus) onSpeakStatus('Battery optimization settings kholi ja rahi hain.');
                window.location.href = 'intent:#Intent;action=android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS;end';
              }}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left transition flex items-center justify-between text-xs text-amber-300"
            >
              <span>Ignore Battery Saver</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={() => {
                if (onSpeakStatus) onSpeakStatus('Notification settings kholi ja rahi hain.');
                window.location.href = 'intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;end';
              }}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left transition flex items-center justify-between text-xs text-cyan-300"
            >
              <span>Foreground Alerts</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>
            100% Local Processing: Wake word aur frequency biometrics kisi server par transmit nahi hote. Aap ise kabhi bhi band kar sakte hain.
          </span>
        </div>
      </div>

      {/* SECTION 1: PROFESSIONAL HINDI & ENGLISH VOICE STUDIO */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Professional Voice &amp; Speech Engine
              </h3>
              <p className="text-[11px] text-slate-400">
                Sirf Hindi aur English professional voices (No chipmunk/squeaky pitch)
              </p>
            </div>
          </div>
          <button
            onClick={handleTestVoiceSpeech}
            disabled={isTestingVoice}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Play className={`w-3 h-3 ${isTestingVoice ? 'animate-spin' : ''}`} />
            <span>Test Voice</span>
          </button>
        </div>

        {/* Active Voice Mode Badge & Fast Switch */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Current Assistant Voice Mode:</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
              voiceSettings.sourceType === 'custom_recorded'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${voiceSettings.sourceType === 'custom_recorded' ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`} />
              {voiceSettings.sourceType === 'custom_recorded' ? '🎙️ My Recorded Voice' : '🤖 Ready-Made AI Voice'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const updated = setGlobalVoiceSource('builtin', voiceSettings.archetypeId || 'natural_female');
                setVoiceSettings(updated);
                if (onSpeakStatus) onSpeakStatus('Ready-made AI voice activated for J. A. R. V. I. S.');
              }}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
                voiceSettings.sourceType === 'builtin'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Built-in AI (9 Voices)</span>
            </button>

            <button
              onClick={() => {
                const updated = setGlobalVoiceSource('custom_recorded');
                setVoiceSettings(updated);
                if (onSpeakStatus) onSpeakStatus('Custom recorded voice activated for J. A. R. V. I. S.');
              }}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
                voiceSettings.sourceType === 'custom_recorded'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Mic className="w-3 h-3" />
              <span>My Recorded Voice</span>
            </button>
          </div>
        </div>

        {/* Dedicated Voice Studio Button */}
        {onOpenVoiceSelector && (
          <button
            onClick={onOpenVoiceSelector}
            className="w-full p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-cyan-950/80 border border-indigo-500/40 hover:border-cyan-400 text-left transition flex items-center justify-between group shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center group-hover:scale-105 transition">
                <Sparkles className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Open Complete Voice Studio</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Previews &amp; Recording
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  Active: <span className="text-cyan-300 font-bold">{voiceSettings.sourceType === 'custom_recorded' ? 'My Recorded Voice' : (voiceSettings.voiceName || 'Natural Female')}</span> • {voiceSettings.engineMode === 'gemini_tts' ? 'Studio Cloud TTS' : voiceSettings.engineMode === 'local_device' ? 'Instant Local' : 'Smart Hybrid'}
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-cyan-300 transition shrink-0" />
          </button>
        )}

        {/* Quick Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-medium block">
            Quick Voice Selection:
          </label>
          <select
            value={voiceSettings.voiceURI}
            onChange={(e) => {
              const target = availableVoices.find((v) => v.voiceURI === e.target.value);
              handleVoiceSettingChange({
                voiceURI: e.target.value,
                voiceName: target?.name,
              });
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="">Default High-Quality Voice (Auto-Detect)</option>
            {availableVoices.map((v, idx) => (
              <option key={`${v.voiceURI || v.name}-${v.lang}-${idx}`} value={v.voiceURI}>
                {v.isFemale ? '✨ ' : ''}{v.name} ({v.lang}) - {v.provider}
              </option>
            ))}
          </select>
        </div>

        {/* Pitch Slider (0.85 to 1.15, default 1.0) */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Voice Pitch (Standard Human Baseline: 1.00x):</span>
            <span className="font-mono text-cyan-300">{voiceSettings.pitch.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.85"
            max="1.15"
            step="0.05"
            value={voiceSettings.pitch}
            onChange={(e) => handleVoiceSettingChange({ pitch: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[9px] text-slate-500">
            <span>0.85x (Bass)</span>
            <span className="text-cyan-400">1.00x (Natural Baseline)</span>
            <span>1.15x (Crisp)</span>
          </div>
        </div>

        {/* Speed Slider (0.85 to 1.15, default 1.0) */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Speech Speed (Bolne Ki Gati: 1.00x):</span>
            <span className="font-mono text-cyan-300">{voiceSettings.rate.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.85"
            max="1.15"
            step="0.05"
            value={voiceSettings.rate}
            onChange={(e) => handleVoiceSettingChange({ rate: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[9px] text-slate-500">
            <span>0.85x (Deliberate)</span>
            <span className="text-cyan-400">1.00x (Natural Cadence)</span>
            <span>1.15x (Fast)</span>
          </div>
        </div>

        {/* Quick Reset to 1.00x */}
        <button
          onClick={() => {
            handleVoiceSettingChange({ pitch: 1.0, rate: 1.0 });
          }}
          className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 pt-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Pitch &amp; Speed to 1.00x Natural Human Standard</span>
        </button>
      </div>

      {/* SECTION 1.5: REALISTIC AI GIRLFRIEND COMPANION & SMART CAMERA VISION */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-950/30 via-slate-900 to-slate-950 border border-pink-500/30 space-y-3.5 shadow-lg shadow-pink-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-pink-500/15 text-pink-400 border border-pink-500/30">
              <Heart className="w-4 h-4 fill-pink-500 text-pink-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                AI Girlfriend Companion &amp; Vision Mode
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-500/40">
                  Affectionate
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Loving, caring companion who looks through the camera and talks affectionately
              </p>
            </div>
          </div>

          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
            {companionMode === 'girlfriend' ? '💖 Active' : 'Stark Active'}
          </span>
        </div>

        {/* Personality Selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setCompanionMode('girlfriend');
              saveCompanionMode('girlfriend');
              if (onSpeakStatus) onSpeakStatus('AI Girlfriend companion mode activate ho gaya hai meri jaan!');
            }}
            className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
              companionMode === 'girlfriend'
                ? 'bg-gradient-to-r from-pink-950/80 to-slate-900 border-pink-400 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div>
              <div className="font-bold text-xs text-pink-300 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-400" />
                <span>AI Girlfriend Mode</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Loving, sweet, emotional care &amp; compliments
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              setCompanionMode('stark');
              saveCompanionMode('stark');
              if (onSpeakStatus) onSpeakStatus('Executive Stark JARVIS mode activate ho gaya hai sir.');
            }}
            className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
              companionMode === 'stark'
                ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border-cyan-400 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div>
              <div className="font-bold text-xs text-cyan-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Executive Stark</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Crisp, tactical, formal assistant
              </p>
            </div>
          </button>
        </div>

        {/* Camera Launch Button */}
        {onOpenCamera && (
          <button
            onClick={onOpenCamera}
            className="w-full p-3 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-between transition shadow-md shadow-pink-600/20 active:scale-95"
          >
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-pink-200" />
              <span>Open Smart Camera Companion (Live Look &amp; Talk)</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-pink-200" />
          </button>
        )}

        {/* Privacy Note */}
        <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          🔒 <strong>Privacy Guarantee:</strong> Camera access is never activated secretly or in the background. It turns on strictly when you open the camera window and closes immediately upon exit.
        </div>
      </div>

      {/* SECTION 2: BIOMETRIC RECOGNITION (VOICE & FACE) */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Owner Biometrics (Voice & Face ID)
            </h3>
            <p className="text-[11px] text-slate-400">
              Ganesh ji ki aawaz aur chehra pehchan kar phone lock aur sensitive commands secure karein
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {onOpenVoiceProfile && (
            <button
              onClick={onOpenVoiceProfile}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 text-left transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Mic className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Owner Voice Profile</div>
                  <div className="text-[10px] text-slate-400">Acoustic frequency enrollment</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}

          {onOpenFaceProfile && (
            <button
              onClick={onOpenFaceProfile}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 text-left transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Face Recognition</div>
                  <div className="text-[10px] text-slate-400">Camera biometric verify</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
        </div>
      </div>

      {/* SECTION 3: AUTOMATIC PHONE LOCK & TOUCH SECURITY */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Touch Alert & Anti-Theft Guard
              </h3>
              <p className="text-[11px] text-slate-400">
                Phone uthane ya chhoone par automatic in-app lock aur spoken warning
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              onUpdateSecuritySettings({
                ...securitySettings,
                isArmed: !securitySettings.isArmed,
              })
            }
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 border ${
              securitySettings.isArmed
                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {securitySettings.isArmed ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-200" />
                <span>Armed (Active)</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 text-slate-400" />
                <span>Arm Guard</span>
              </>
            )}
          </button>
        </div>

        {/* Anti-Theft Security & Biometric Toggles */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80 text-xs">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-semibold text-slate-200">Anti-Theft Security Mode</span>
              <p className="text-[11px] text-slate-400">Suspicious phone access aur unauthorized pickup detect karein</p>
            </div>
            <input
              type="checkbox"
              checked={securitySettings.antiTheftSecurityEnabled}
              onChange={(e) =>
                onUpdateSecuritySettings({
                  ...securitySettings,
                  antiTheftSecurityEnabled: e.target.checked,
                })
              }
              className="rounded accent-amber-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-semibold text-slate-200">Motion Detection Security Mode</span>
              <p className="text-[11px] text-slate-400">Android accelerometer se phone pickup ya hilna detect karke shield lock karein</p>
            </div>
            <input
              type="checkbox"
              checked={securitySettings.autoLockOnMotion}
              onChange={(e) =>
                onUpdateSecuritySettings({
                  ...securitySettings,
                  autoLockOnMotion: e.target.checked,
                })
              }
              className="rounded accent-amber-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-semibold text-slate-200">Touch Alert Security</span>
              <p className="text-[11px] text-slate-400">Unauthorized screen touch detect hone par instant security trigger</p>
            </div>
            <input
              type="checkbox"
              checked={securitySettings.autoLockOnTouch}
              onChange={(e) =>
                onUpdateSecuritySettings({
                  ...securitySettings,
                  autoLockOnTouch: e.target.checked,
                })
              }
              className="rounded accent-amber-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-semibold text-slate-200">Face Verification on Access</span>
              <p className="text-[11px] text-slate-400">Front camera se owner face verify karein (Inconclusive result par PIN fallback)</p>
            </div>
            <input
              type="checkbox"
              checked={securitySettings.faceVerificationEnabled}
              onChange={(e) =>
                onUpdateSecuritySettings({
                  ...securitySettings,
                  faceVerificationEnabled: e.target.checked,
                })
              }
              className="rounded accent-indigo-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-semibold text-slate-200">Eye-Blink Liveness Anti-Spoof</span>
              <p className="text-[11px] text-slate-400">Photo spoofing rokne ke liye natural eye blink detect karein</p>
            </div>
            <input
              type="checkbox"
              checked={securitySettings.eyeBlinkDetectionEnabled}
              onChange={(e) =>
                onUpdateSecuritySettings({
                  ...securitySettings,
                  eyeBlinkDetectionEnabled: e.target.checked,
                })
              }
              className="rounded accent-cyan-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-semibold text-slate-200">Spoken Warning Audio</span>
              <p className="text-[11px] text-slate-400">
                Bolkar sunaayein: "{GANESH_WARNING_PHRASE}"
              </p>
            </div>
            <input
              type="checkbox"
              checked={securitySettings.spokenWarningEnabled}
              onChange={(e) =>
                onUpdateSecuritySettings({
                  ...securitySettings,
                  spokenWarningEnabled: e.target.checked,
                })
              }
              className="rounded accent-amber-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-semibold text-slate-200">Audio Siren Alarm</span>
              <p className="text-[11px] text-slate-400">Tez emergency warning siren tone bajayein</p>
            </div>
            <input
              type="checkbox"
              checked={securitySettings.sirenAlarmEnabled}
              onChange={(e) =>
                onUpdateSecuritySettings({
                  ...securitySettings,
                  sirenAlarmEnabled: e.target.checked,
                })
              }
              className="rounded accent-amber-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-semibold text-slate-200">Owner Voice Authentication</span>
              <p className="text-[11px] text-slate-400">Privileged actions (WhatsApp, private data, PIN) ke liye Ganesh ji ki verified voice ya PIN zaroori karein</p>
            </div>
            <input
              type="checkbox"
              checked={securitySettings.requireOwnerAuthForProtectedCommands}
              onChange={(e) =>
                onUpdateSecuritySettings({
                  ...securitySettings,
                  requireOwnerAuthForProtectedCommands: e.target.checked,
                })
              }
              className="rounded accent-emerald-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-semibold text-slate-200">Auto-Lock on Repeated Unauthorized Access</span>
              <p className="text-[11px] text-slate-400">Warning ke baad unauthorized koshish continue karne par 3s grace countdown ke sath phone-lock activate karein</p>
            </div>
            <input
              type="checkbox"
              checked={!securitySettings.unauthorizedAttemptsWarningOnly}
              onChange={(e) =>
                onUpdateSecuritySettings({
                  ...securitySettings,
                  unauthorizedAttemptsWarningOnly: !e.target.checked,
                })
              }
              className="rounded accent-rose-500 w-4 h-4"
            />
          </label>
        </div>

        {/* Truthful Sensor & Detection Reliability Disclaimer (Requirement 1 & 6) */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hardware &amp; Detection Boundaries (Truthfulness):</span>
          </div>
          <p className="leading-relaxed">
            Har ek phone pickup ya touch browser sandbox me 100% guarantee ke saath detect nahi ho sakta (jab screen puri tarah off ho ya browser sleep me ho to Android sensors throttle ho jate hain). Native Android APK me background foreground service se reliable pickup monitoring milti hai. Face ya blink fail hone par ye automatically theft assume nahi karta, balki inconclusive maan kar Master PIN fallback deta hai.
          </p>
        </div>

        {/* Test Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={handlePlayWarningAudio}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Warning Voice</span>
          </button>
          <button
            onClick={onTriggerTestAlert}
            className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-300 rounded-lg text-xs font-semibold border border-red-500/40 flex items-center gap-1.5 transition"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>Simulate Alarm & Shield</span>
          </button>
        </div>

        {/* Owner PIN Management */}
        <div className="pt-3 border-t border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              Owner Master PIN: <span className="font-mono text-cyan-300">{securitySettings.ownerPin}</span>
            </span>
            <button
              onClick={() => setIsEditingPin(!isEditingPin)}
              className="text-xs text-cyan-400 hover:underline"
            >
              {isEditingPin ? 'Cancel' : 'Change PIN'}
            </button>
          </div>

          {isEditingPin && (
            <div className="flex gap-2 pt-1 animate-in fade-in">
              <input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Naya 4-Digit PIN..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white text-center tracking-widest focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleSavePin}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition"
              >
                Save
              </button>
            </div>
          )}

          {pinSuccessMsg && (
            <div className="text-[11px] text-emerald-400">{pinSuccessMsg}</div>
          )}
        </div>
      </div>

      {/* SECTION 4: SYSTEM HARDWARE SHORTCUTS */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-cyan-400" />
          Hardware & Quick Tools
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={handleToggleTorch}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
              torchOn
                ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <Flashlight className="w-5 h-5 text-amber-400" />
            <span className="font-semibold">{torchOn ? 'Torch ON' : 'Toggle Torch'}</span>
          </button>

          <button
            onClick={handleToggleWakeLock}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
              wakeLockActive
                ? 'bg-blue-500/20 text-blue-300 border-blue-400 shadow-md shadow-blue-500/20'
                : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <Sun className="w-5 h-5 text-yellow-400" />
            <span className="font-semibold">{wakeLockActive ? 'Wake Lock ON' : 'Screen Awake'}</span>
          </button>

          <button
            onClick={handleVibrate}
            className="p-3 rounded-xl bg-slate-950/60 text-slate-300 border border-slate-800 hover:bg-slate-900 flex flex-col items-center gap-1.5 transition"
          >
            <Vibrate className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold">Vibration Test</span>
          </button>

          {onOpenAlarms && (
            <button
              onClick={onOpenAlarms}
              className="p-3 rounded-xl bg-slate-950/60 text-slate-300 border border-slate-800 hover:border-amber-500/40 flex flex-col items-center gap-1.5 transition"
            >
              <Bell className="w-5 h-5 text-amber-400" />
              <span className="font-semibold">Alarms &amp; Night</span>
            </button>
          )}

          {onOpenCallAssistant && (
            <button
              onClick={onOpenCallAssistant}
              className="p-3 rounded-xl bg-slate-950/60 text-cyan-300 border border-cyan-500/35 hover:bg-cyan-950/50 flex flex-col items-center gap-1.5 transition"
            >
              <Phone className="w-5 h-5 text-cyan-400" />
              <span className="font-semibold">AI Call Assistant</span>
            </button>
          )}

          {onOpenApkGuide && (
            <button
              onClick={onOpenApkGuide}
              className="p-3 rounded-xl bg-slate-950/60 text-slate-300 border border-slate-800 hover:border-cyan-500/40 flex flex-col items-center gap-1.5 transition"
            >
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold">APK, GitHub &amp; ChatGPT</span>
            </button>
          )}

          <a
            href="/api/export-project"
            download="j-a-r-v-i-s-assistant-project.zip"
            className="p-3 rounded-xl bg-slate-950/60 text-slate-300 border border-slate-800 hover:border-blue-500/40 flex flex-col items-center gap-1.5 transition text-center"
          >
            <Download className="w-5 h-5 text-blue-400" />
            <span className="font-semibold">Export ZIP Code</span>
          </a>
        </div>

        {/* Screen Brightness & Eye Protection Dimmer */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-white">Screen Brightness & Eye Dimmer</span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-300">{screenBrightness}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">Dim</span>
            <input
              type="range"
              min={25}
              max={100}
              step={5}
              value={screenBrightness}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (onBrightnessChange) onBrightnessChange(val);
              }}
              className="flex-1 accent-amber-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
            />
            <span className="text-[10px] text-amber-300">100%</span>
          </div>
          <div className="flex items-center justify-between gap-1 pt-1">
            {[25, 50, 75, 100].map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  if (onBrightnessChange) onBrightnessChange(lvl);
                  if (onSpeakStatus) onSpeakStatus(`Brightness ${lvl}% set ho gayi.`);
                }}
                className={`flex-1 py-1 rounded-lg text-[10px] font-semibold border transition ${
                  screenBrightness === lvl
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {lvl}%
              </button>
            ))}
            <button
              onClick={() => {
                if (onSpeakStatus) onSpeakStatus('Android display settings kholi ja rahi hain.');
                window.location.href = 'intent:#Intent;action=android.settings.DISPLAY_SETTINGS;end';
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition shrink-0"
              title="Open native Android Display & Brightness settings"
            >
              OS Display
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 5: ANDROID SETTINGS SHORTCUTS */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Android System Settings Shortcuts
              </h3>
              <p className="text-[11px] text-slate-400">
                Vivo Y20G phone settings pages 1-tap me kholiye
              </p>
            </div>
          </div>
        </div>

        {/* Truthful Android Security Notice */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-1">
          <span className="font-bold text-cyan-300 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            Android Security & Privacy Policy:
          </span>
          <p className="text-slate-400 leading-relaxed">
            Android 10+ me privacy ke tehat web browsers aur third-party apps silently Wi-Fi ya Bluetooth on/off nahi kar sakte. Isliye J. A. R. V. I. S. aapke kehne par seedhe exact Android settings page kholti hai jahan aap 1 tap me toggle kar sakte hain.
          </p>
        </div>

        {/* Shortcuts Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            {
              label: 'Wi-Fi Settings',
              intent: 'WIFI_SETTINGS',
              icon: Wifi,
              color: 'text-blue-400',
              desc: 'Wi-Fi networks & connections',
            },
            {
              label: 'Bluetooth Settings',
              intent: 'BLUETOOTH_SETTINGS',
              icon: Bluetooth,
              color: 'text-indigo-400',
              desc: 'Pair devices & audio',
            },
            {
              label: 'Display & Brightness',
              intent: 'DISPLAY_SETTINGS',
              icon: Sun,
              color: 'text-amber-400',
              desc: 'Brightness, dark mode & font',
            },
            {
              label: 'Sound & Volume',
              intent: 'SOUND_SETTINGS',
              icon: Volume2,
              color: 'text-cyan-400',
              desc: 'Ringtone, media & alerts',
            },
            {
              label: 'Apps Management',
              intent: 'APPLICATION_SETTINGS',
              icon: Smartphone,
              color: 'text-emerald-400',
              desc: 'App permissions & storage',
            },
            {
              label: 'Battery & Power',
              intent: 'BATTERY_SAVER_SETTINGS',
              icon: Battery,
              color: 'text-green-400',
              desc: 'Battery saver & usage',
            },
            {
              label: 'Main Settings',
              intent: 'SETTINGS',
              icon: Sliders,
              color: 'text-purple-400',
              desc: 'Vivo Y20G system root settings',
            },
            {
              label: 'Security & Lock',
              intent: 'SECURITY_SETTINGS',
              icon: Lock,
              color: 'text-rose-400',
              desc: 'Screen lock, biometrics & PIN',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={`${item.intent}-${idx}`}
                onClick={() => {
                  if (onSpeakStatus) onSpeakStatus(`${item.label} kholi ja rahi hain.`);
                  window.location.href = `intent:#Intent;action=android.settings.${item.intent};end`;
                }}
                className="p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-left transition flex flex-col justify-between group active:scale-95"
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className={`w-4 h-4 ${item.color} group-hover:scale-110 transition`} />
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
                </div>
                <div className="mt-2">
                  <div className="font-semibold text-white group-hover:text-purple-300 transition text-[11px]">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
