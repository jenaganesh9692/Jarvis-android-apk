import React, { useState, useEffect } from 'react';
import {
  BatteryCharging,
  Battery,
  Wifi,
  WifiOff,
  Signal,
  Volume2,
  VolumeX,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  Lock,
  Unlock,
  Bell,
  BookOpen,
  Headphones,
  Maximize2,
} from 'lucide-react';

interface VivoHeaderProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenGuide: () => void;
  onOpenPermissions: () => void;
  onOpenEmergency: () => void;
  isOnline: boolean;
  onToggleOnlineMode?: () => void;
  isSecurityArmed?: boolean;
  onToggleSecurityArm?: () => void;
  onOpenAlarms?: () => void;
  onOpenProjectMemory?: () => void;
  onOpenVoiceStudio?: () => void;
  onOpenFullScreenHud?: () => void;
}

export const VivoHeader: React.FC<VivoHeaderProps> = ({
  isMuted,
  onToggleMute,
  onOpenGuide,
  onOpenPermissions,
  onOpenEmergency,
  isOnline,
  onToggleOnlineMode,
  isSecurityArmed = false,
  onToggleSecurityArm,
  onOpenAlarms,
  onOpenProjectMemory,
  onOpenVoiceStudio,
  onOpenFullScreenHud,
}) => {
  const [time, setTime] = useState<string>('');
  const [batteryLevel, setBatteryLevel] = useState<number>(85);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);

    if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);

          battery.addEventListener('levelchange', () => {
            setBatteryLevel(Math.round(battery.level * 100));
          });
          battery.addEventListener('chargingchange', () => {
            setIsCharging(battery.charging);
          });
        })
        .catch(() => {});
    }

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#02050b]/95 backdrop-blur-md border-b border-cyan-500/25 px-3 py-2">
      {/* Compact Holographic Status Strip */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono-hud tracking-tight pb-1.5 border-b border-slate-800/70">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <span>{time || '09:20 AM'}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono-hud">
            STARK HUD
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleOnlineMode}
            title="Toggle Network Mode (Online / Offline)"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold transition-all border ${
              isOnline
                ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/35'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            {isOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-2.5 h-2.5 text-amber-400" />
                <span>Offline</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1">
            <Signal className="w-3.5 h-3.5 text-slate-300" />
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-cyan-300" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px]">{batteryLevel}%</span>
            {isCharging ? (
              <BatteryCharging className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <Battery className="w-4 h-4 text-slate-200" />
            )}
          </div>
        </div>
      </div>

      {/* Main Stark Brand & Action Row */}
      <div className="flex items-center justify-between pt-1.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#041022] border border-cyan-400/60 shadow-[0_0_15px_rgba(0,212,255,0.35)] shrink-0">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span
              className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#02050b] ${
                isOnline ? 'bg-cyan-400' : 'bg-amber-400'
              }`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-hud font-bold text-xs sm:text-sm text-white tracking-[0.14em] truncate">
                J. A. R. V. I. S.
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              Ganesh Ji • <span className="text-cyan-300">Stark Interface</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onOpenFullScreenHud && (
            <button
              type="button"
              onClick={onOpenFullScreenHud}
              className="p-1.5 rounded-lg bg-cyan-950/70 text-cyan-300 hover:text-white border border-cyan-500/40 transition"
              title="Open Full-Screen Circular HUD"
              aria-label="Full-Screen HUD"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          {onToggleSecurityArm && (
            <button
              type="button"
              onClick={onToggleSecurityArm}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-[10px] transition active:scale-95 border whitespace-nowrap ${
                isSecurityArmed
                  ? 'bg-amber-600/90 hover:bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-600/30 animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title={isSecurityArmed ? 'Anti-Theft Guard Active' : 'Arm Anti-Theft Guard'}
            >
              {isSecurityArmed ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-100" />
                  <span className="hidden sm:inline">Guard ON</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Guard</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenEmergency}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] shadow-md shadow-red-600/30 transition active:scale-95"
            title="Emergency SOS"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-white" />
            <span>SOS</span>
          </button>

          <button
            type="button"
            onClick={onOpenPermissions}
            className="p-1.5 rounded-lg bg-slate-900 text-cyan-300 hover:text-white border border-slate-700/80 transition"
            title="Permissions & Privacy"
            aria-label="Permissions"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className={`p-1.5 rounded-lg transition ${
              isMuted
                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-700/80'
            }`}
            title={isMuted ? 'Unmute voice' : 'Mute voice'}
            aria-label="Toggle voice output"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {onOpenVoiceStudio && (
            <button
              type="button"
              onClick={onOpenVoiceStudio}
              className="p-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 hover:text-white border border-cyan-500/40 transition"
              title="Voice Studio"
              aria-label="Voice Studio"
            >
              <Headphones className="w-4 h-4" />
            </button>
          )}

          {onOpenAlarms && (
            <button
              type="button"
              onClick={onOpenAlarms}
              className="hidden sm:inline-flex p-1.5 rounded-lg bg-slate-900 text-amber-400 hover:text-white border border-slate-700/80 transition"
              title="Alarms & Night Schedule"
              aria-label="Alarms"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}

          {onOpenProjectMemory && (
            <button
              type="button"
              onClick={onOpenProjectMemory}
              className="hidden sm:inline-flex p-1.5 rounded-lg bg-slate-900 text-cyan-300 hover:text-white border border-slate-700/80 transition"
              title="Project Memory & Architecture"
              aria-label="Project Memory"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenGuide}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white border border-slate-700/80 transition"
            title="Setup Guide"
            aria-label="Setup Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
