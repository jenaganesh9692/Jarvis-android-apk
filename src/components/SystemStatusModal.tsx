import React, { useEffect, useState } from 'react';
import {
  X,
  Activity,
  Battery,
  BatteryCharging,
  Wifi,
  WifiOff,
  Mic,
  Shield,
  Headphones,
  Cpu,
  Heart,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { loadPermissions } from '../services/permissionService';
import { loadVoiceSettings, VOICE_ARCHETYPES } from '../services/speechService';
import { loadVoiceProfile } from '../services/voiceBiometricsService';
import { loadSecuritySettings } from '../services/securityService';
import { loadCompanionMode } from '../services/visionCompanionService';

interface SystemStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  isBackgroundListening: boolean;
  dominantPitchHz: number;
  onOpenPermissions: () => void;
  onOpenVoiceStudio: () => void;
  onOpenDevices: () => void;
  onOpenSettings: () => void;
}

export const SystemStatusModal: React.FC<SystemStatusModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  isBackgroundListening,
  dominantPitchHz,
  onOpenPermissions,
  onOpenVoiceStudio,
  onOpenDevices,
  onOpenSettings,
}) => {
  const [batteryLevel, setBatteryLevel] = useState<number>(85);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(Boolean(battery.charging));
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const permissions = loadPermissions();
  const micAllowed = permissions.find((p) => p.id === 'microphone')?.userAllowed ?? false;
  const camAllowed = permissions.find((p) => p.id === 'camera')?.userAllowed ?? false;
  const locAllowed = permissions.find((p) => p.id === 'location')?.userAllowed ?? false;

  const voiceSettings = loadVoiceSettings();
  const activeArchetype = VOICE_ARCHETYPES.find((a) => a.id === voiceSettings.archetypeId);
  const voiceProfile = loadVoiceProfile();
  const securitySettings = loadSecuritySettings();
  const companionMode = loadCompanionMode();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="System Status Diagnostics"
    >
      <div className="w-full max-w-md bg-[#040a16] border border-cyan-500/35 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,212,255,0.2)] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-cyan-500/20 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-hud text-xs font-bold tracking-wider text-cyan-200">
                SYSTEM STATUS
              </h3>
              <p className="text-[11px] text-slate-400">
                Live J. A. R. V. I. S. Diagnostics (Vivo Y20G)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close System Status"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Telemetry Cards */}
        <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar text-xs">
          {/* Power & Network Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-cyan-500/25">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px]">Battery Power</span>
                {isCharging ? (
                  <BatteryCharging className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Battery className="w-4 h-4 text-cyan-300" />
                )}
              </div>
              <div className="font-mono-hud text-base font-bold text-white">
                {batteryLevel}%
              </div>
              <div className="text-[10px] text-slate-400">
                {isCharging ? 'Charging Active' : 'Battery Power'}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-cyan-500/25">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px]">AI Engine</span>
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-emerald-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="font-mono-hud text-sm font-bold text-white">
                {isOnline ? 'ONLINE AI' : 'OFFLINE'}
              </div>
              <div className="text-[10px] text-slate-400">
                {isOnline ? 'Gemini 3.8 + Local' : 'Local Fast-Path'}
              </div>
            </div>
          </div>

          {/* Voice & Wake Status */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-cyan-200">
                <Headphones className="w-4 h-4 text-cyan-400" />
                Active Voice Output
              </span>
              <span className="text-[10px] font-mono-hud px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                {voiceSettings.sourceType === 'custom_recorded' ? 'Custom Voice' : 'Built-In AI'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Profile:{' '}
              <strong className="text-white">
                {voiceSettings.sourceType === 'custom_recorded'
                  ? 'My Recorded Voice'
                  : activeArchetype?.title || voiceSettings.voiceName || 'Natural Female'}
              </strong>{' '}
              ({voiceSettings.rate.toFixed(2)}x speed, {voiceSettings.pitch.toFixed(2)}x pitch)
            </p>
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                Wake Listener ("Hey J. A. R. V. I. S.")
              </span>
              <span className={isBackgroundListening ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {isBackgroundListening
                  ? `ACTIVE${dominantPitchHz > 0 ? ` (${dominantPitchHz}Hz)` : ''}`
                  : 'Standby'}
              </span>
            </div>
          </div>

          {/* Permissions & Security */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-cyan-200">
                <Shield className="w-4 h-4 text-cyan-400" />
                Permissions &amp; Security
              </span>
              <span
                className={`text-[10px] font-mono-hud px-2 py-0.5 rounded border ${
                  securitySettings.isArmed
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                {securitySettings.isArmed ? 'ANTI-THEFT ARMED' : 'Guard Standby'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <div className="px-2 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-1">
                {micAllowed ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="truncate">Mic</span>
              </div>
              <div className="px-2 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-1">
                {camAllowed ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="truncate">Camera</span>
              </div>
              <div className="px-2 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-1">
                {locAllowed ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="truncate">GPS</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 text-slate-300">
              <span>Owner Voice Biometrics:</span>
              <span className={voiceProfile.enrolled ? 'text-emerald-400 font-semibold' : 'text-amber-300'}>
                {voiceProfile.enrolled ? `Enrolled (${voiceProfile.ownerName})` : 'Not Enrolled'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-pink-400" />
                Companion Personality:
              </span>
              <span className="text-pink-300 font-semibold">
                {companionMode === 'girlfriend' ? 'AI Girlfriend Mode' : 'Executive Stark'}
              </span>
            </div>
          </div>

          {/* Direct Action Shortcuts */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPermissions();
              }}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-cyan-950/70 border border-cyan-500/35 text-cyan-200 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Permissions</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenVoiceStudio();
              }}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-cyan-950/70 border border-cyan-500/35 text-cyan-200 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Headphones className="w-4 h-4 text-cyan-400" />
              <span>Voice Studio</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDevices();
              }}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-cyan-950/70 border border-cyan-500/35 text-cyan-200 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Smart Devices</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-cyan-950/70 border border-cyan-500/35 text-cyan-200 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Touch Guard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
